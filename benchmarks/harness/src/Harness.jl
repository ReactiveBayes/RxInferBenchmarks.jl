"""
    Harness

Benchmark orchestrator for RxInferBenchmarks.jl. Knows nothing about RxInfer itself:
it loads the experiment matrix, spawns one fresh Julia subprocess per scenario run
(uniform `benchmark.jl` contract, see design/benchmarks.md), and assembles/merges
result documents keyed by environment fingerprint (see design/data.md).
"""
module Harness

using Dates
using JSON3
using SHA
using TOML
using YAML

export ConfigError, ValidationError, MergeError

const SCHEMA_VERSION = 2
const SMOKE_MAX_SIZE = 8
const SMOKE_MAX_ITERATIONS = 2
const FINGERPRINT_SHORT_LENGTH = 12

struct ConfigError <: Exception
    msg::String
end

struct ValidationError <: Exception
    msg::String
end

struct MergeError <: Exception
    msg::String
end

Base.showerror(io::IO, e::ConfigError) = print(io, "ConfigError: ", e.msg)
Base.showerror(io::IO, e::ValidationError) = print(io, "ValidationError: ", e.msg)
Base.showerror(io::IO, e::MergeError) = print(io, "MergeError: ", e.msg)

# ---------------------------------------------------------------------------
# Config loading
# ---------------------------------------------------------------------------

load_yaml(path::AbstractString) = YAML.load_file(path; dicttype = Dict{String,Any})

"""
    load_experiments(path; models_dir = nothing) -> Dict

Load and validate `data/experiments.yml`. When `models_dir` is given, every
experiment's `model` must have a matching project directory inside it.
"""
function load_experiments(path::AbstractString; models_dir::Union{Nothing,AbstractString} = nothing)
    cfg = load_yaml(path)
    haskey(cfg, "experiments") || throw(ConfigError("$(path): missing `experiments` list"))
    experiments = cfg["experiments"]
    experiments isa AbstractVector || throw(ConfigError("$(path): `experiments` must be a list"))

    ids = String[]
    for exp in experiments
        haskey(exp, "id") || throw(ConfigError("$(path): experiment without `id`"))
        id = exp["id"]
        haskey(exp, "model") || throw(ConfigError("$(path): experiment `$(id)` is missing `model`"))
        haskey(exp, "matrix") || haskey(exp, "scenarios") ||
            throw(ConfigError("$(path): experiment `$(id)` needs either `matrix` or `scenarios`"))
        push!(ids, id)
        if models_dir !== nothing
            model_dir = joinpath(models_dir, exp["model"])
            isdir(model_dir) ||
                throw(ConfigError("$(path): experiment `$(id)` references model `$(exp["model"])` but `$(model_dir)` does not exist"))
        end
    end
    allunique(ids) || throw(ConfigError("$(path): duplicate experiment ids: $(join(unique(filter(id -> count(==(id), ids) > 1, ids)), ", "))"))

    cfg["defaults"] = get(cfg, "defaults", Dict{String,Any}())
    return cfg
end

"""
    load_hardware(path) -> Dict{String,Dict}

Load `data/hardware.yml` into a registry keyed by hardware id.
"""
function load_hardware(path::AbstractString)
    cfg = load_yaml(path)
    haskey(cfg, "hardware") || throw(ConfigError("$(path): missing `hardware` list"))
    registry = Dict{String,Dict{String,Any}}()
    for hw in cfg["hardware"]
        haskey(hw, "id") || throw(ConfigError("$(path): hardware entry without `id`"))
        haskey(hw, "label") || throw(ConfigError("$(path): hardware `$(hw["id"])` is missing `label`"))
        haskey(registry, hw["id"]) && throw(ConfigError("$(path): duplicate hardware id `$(hw["id"])`"))
        registry[hw["id"]] = hw
    end
    return registry
end

"""
    load_metrics(path) -> Vector{Dict}

Load and validate `data/metrics.yml`.
"""
function load_metrics(path::AbstractString)
    cfg = load_yaml(path)
    haskey(cfg, "metrics") || throw(ConfigError("$(path): missing `metrics` list"))
    for m in cfg["metrics"]
        for key in ("id", "label", "unit", "lower_is_better")
            haskey(m, key) || throw(ConfigError("$(path): metric entry missing `$(key)`"))
        end
    end
    return cfg["metrics"]
end

# ---------------------------------------------------------------------------
# Scenario expansion
# ---------------------------------------------------------------------------

sanitize_id_component(x) = replace(string(x), r"[^A-Za-z0-9.\-]+" => "-")

"""
    scenario_id(params) -> String

Deterministic scenario identifier: sorted `key=value` pairs joined by `__`.
The stable join key for a scenario across time, hardware, and Julia versions.
"""
function scenario_id(params::AbstractDict)
    keys_sorted = sort(collect(keys(params)); by = string)
    return join(("$(k)=$(sanitize_id_component(params[k]))" for k in keys_sorted), "__")
end

function smoke_clamp_params!(params::Dict{String,Any})
    for (k, v) in params
        k == "seed" && continue
        if v isa Integer
            limit = k == "iterations" ? SMOKE_MAX_ITERATIONS : SMOKE_MAX_SIZE
            params[k] = min(v, limit)
        end
    end
    return params
end

"""
    expand_scenarios(experiment, defaults; smoke = false) -> Vector{Dict}

Expand an experiment into concrete scenario dicts (`experiment_id`, `model`,
`scenario_id`, `params`). A `matrix:` expands as a cartesian product; explicit
`scenarios:` pass through. The default `seed` is injected unless a scenario
overrides it. With `smoke = true`, the expansion shrinks to a single scenario
with tiny parameter values (used by tests and CI smoke runs).
"""
function expand_scenarios(experiment::AbstractDict, defaults::AbstractDict; smoke::Bool = false)
    id = experiment["id"]
    model = experiment["model"]
    seed = get(defaults, "seed", 42)

    param_sets = Vector{Dict{String,Any}}()
    if haskey(experiment, "matrix")
        matrix = experiment["matrix"]
        axes = sort(collect(keys(matrix)); by = string)
        values = [matrix[axis] isa AbstractVector ? matrix[axis] : [matrix[axis]] for axis in axes]
        if smoke
            values = [[first(v)] for v in values]
        end
        for combo in Iterators.product(values...)
            push!(param_sets, Dict{String,Any}(zip(axes, combo)))
        end
    else
        explicit = experiment["scenarios"]
        for s in (smoke ? explicit[1:1] : explicit)
            push!(param_sets, Dict{String,Any}(get(s, "params", Dict{String,Any}())))
        end
    end

    scenarios = Vector{Dict{String,Any}}()
    for params in param_sets
        haskey(params, "seed") || (params["seed"] = seed)
        smoke && smoke_clamp_params!(params)
        push!(scenarios, Dict{String,Any}(
            "experiment_id" => id,
            "model" => model,
            "scenario_id" => scenario_id(params),
            "params" => params,
        ))
    end
    return scenarios
end

# ---------------------------------------------------------------------------
# Environment & fingerprint
# ---------------------------------------------------------------------------

"""
    compute_fingerprint(julia_version, dependencies) -> String

SHA-256 (hex) over the Julia version and the sorted `name => version` dependency
list. The identity of a benchmark environment: same fingerprint ⇒ samples pool.
"""
function compute_fingerprint(julia_version::AbstractString, dependencies::AbstractDict)
    names_sorted = sort(collect(keys(dependencies)); by = string)
    payload = join(["julia=$(julia_version)"; ["$(n)=$(dependencies[n])" for n in names_sorted]], "\n")
    return bytes2hex(sha256(payload))
end

short_fingerprint(fp::AbstractString) = String(fp[1:FINGERPRINT_SHORT_LENGTH])

function julia_minor(version::AbstractString)
    v = VersionNumber(version)
    return "$(v.major).$(v.minor)"
end

"""
    collect_dependencies(project_dirs) -> Dict{String,String}

Parse the `Manifest.toml` of each project directory into a merged
`name => version` map (stdlibs without a version become `"stdlib"`).
Conflicting versions across projects are an error — all model projects must
resolve to the same dependency set for the fingerprint to be meaningful.
"""
function collect_dependencies(project_dirs::AbstractVector{<:AbstractString})
    deps = Dict{String,String}()
    for dir in project_dirs
        manifest_path = joinpath(dir, "Manifest.toml")
        isfile(manifest_path) || throw(ConfigError("no Manifest.toml in $(dir) — run Pkg.instantiate() first"))
        manifest = TOML.parsefile(manifest_path)
        entries = get(manifest, "deps", Dict{String,Any}())
        for (name, infos) in entries
            info = first(infos)
            version = get(info, "version", "stdlib")
            if haskey(deps, name) && deps[name] != version
                throw(ConfigError("dependency `$(name)` resolves to both $(deps[name]) and $(version) across model projects"))
            end
            deps[name] = version
        end
    end
    return deps
end

"""
    collect_environment(; hardware_id, julia_version, dependencies) -> Dict

Assemble the environment block of a result document: versions, full dependency
map, and live OS/CPU details.
"""
function collect_environment(;
    hardware_id::AbstractString,
    julia_version::AbstractString = string(VERSION),
    dependencies::AbstractDict,
)
    haskey(dependencies, "RxInfer") ||
        throw(ConfigError("dependencies do not include RxInfer — wrong project dirs?"))
    os = Sys.islinux() ? "linux" : Sys.isapple() ? "macos" : Sys.iswindows() ? "windows" : string(Sys.KERNEL)
    return Dict{String,Any}(
        "hardware_id" => hardware_id,
        "julia_version" => julia_version,
        "rxinfer_version" => dependencies["RxInfer"],
        "os" => os,
        "arch" => String(Sys.ARCH),
        "cpu_model" => Sys.cpu_info()[1].model,
        "cpu_threads" => Sys.CPU_THREADS,
        "total_memory_bytes" => Int(Sys.total_memory()),
        "dependencies" => Dict{String,Any}(dependencies),
    )
end

# ---------------------------------------------------------------------------
# Result documents
# ---------------------------------------------------------------------------

"""
    assemble_result(; environment, fingerprint, timestamp_utc, commit, processes,
                      scenarios_by_experiment) -> Dict

Build a fresh result document (one benchmark run on one hardware/Julia/fingerprint).
"""
function assemble_result(;
    environment::AbstractDict,
    fingerprint::AbstractString,
    timestamp_utc::AbstractString,
    commit::AbstractString,
    processes::Integer,
    scenarios_by_experiment::AbstractDict,
)
    experiments = [
        Dict{String,Any}("experiment_id" => exp_id, "scenarios" => scenarios)
        for (exp_id, scenarios) in sort(collect(scenarios_by_experiment); by = first)
    ]
    return Dict{String,Any}(
        "schema_version" => SCHEMA_VERSION,
        "fingerprint" => String(fingerprint),
        "hardware_id" => environment["hardware_id"],
        "environment" => environment,
        "runs" => [Dict{String,Any}(
            "timestamp_utc" => String(timestamp_utc),
            "commit" => String(commit),
            "processes" => Int(processes),
        )],
        "first_seen_utc" => String(timestamp_utc),
        "last_seen_utc" => String(timestamp_utc),
        "experiments" => experiments,
    )
end

"""
    validate_result(doc) -> true

Validate a result document against the schema in design/data.md.
Throws `ValidationError` on the first violation.
"""
function validate_result(doc::AbstractDict)
    for key in ("schema_version", "fingerprint", "hardware_id", "environment",
                "runs", "first_seen_utc", "last_seen_utc", "experiments")
        haskey(doc, key) || throw(ValidationError("missing top-level key `$(key)`"))
    end
    doc["schema_version"] == SCHEMA_VERSION ||
        throw(ValidationError("schema_version $(doc["schema_version"]) != $(SCHEMA_VERSION)"))
    for run in doc["runs"]
        for key in ("timestamp_utc", "commit", "processes")
            haskey(run, key) || throw(ValidationError("run entry missing `$(key)`"))
        end
    end
    for exp in doc["experiments"]
        haskey(exp, "experiment_id") || throw(ValidationError("experiment missing `experiment_id`"))
        haskey(exp, "scenarios") || throw(ValidationError("experiment `$(exp["experiment_id"])` missing `scenarios`"))
        for scenario in exp["scenarios"]
            for key in ("scenario_id", "params", "status")
                haskey(scenario, key) ||
                    throw(ValidationError("scenario in `$(exp["experiment_id"])` missing `$(key)`"))
            end
            samples = get(scenario, "samples", Dict{String,Any}())
            lengths = Int[]
            for (metric, values) in samples
                values isa AbstractVector ||
                    throw(ValidationError("samples `$(metric)` in `$(scenario["scenario_id"])` is not an array"))
                all(v -> v isa Real, values) ||
                    throw(ValidationError("samples `$(metric)` in `$(scenario["scenario_id"])` contains non-numeric values"))
                push!(lengths, length(values))
            end
            isempty(lengths) || allequal(lengths) ||
                throw(ValidationError("sample arrays in `$(scenario["scenario_id"])` have unequal lengths"))
        end
    end
    return true
end

"""
    result_relpath(hardware_id, julia_version, fingerprint) -> String

Relative path of a result file inside `data/results/`:
`<hardware-id>/<julia-minor>/<fingerprint12>.json`.
"""
function result_relpath(hardware_id::AbstractString, julia_version::AbstractString, fingerprint::AbstractString)
    return joinpath(hardware_id, julia_minor(julia_version), short_fingerprint(fingerprint) * ".json")
end

function write_json(path::AbstractString, doc)
    mkpath(dirname(path))
    open(path, "w") do io
        JSON3.pretty(io, doc)
        println(io)
    end
    return path
end

read_json(path::AbstractString) = JSON3.read(read(path, String), Dict{String,Any})

# ---------------------------------------------------------------------------
# Merging (sample pooling)
# ---------------------------------------------------------------------------

function merge_scenario!(existing::AbstractDict, incoming::AbstractDict)
    if get(incoming, "status", "ok") != "ok"
        # an errored incoming scenario contributes nothing; keep what we have
        return existing
    end
    if get(existing, "status", "ok") != "ok"
        # previous run errored, this one succeeded: start fresh from incoming
        empty!(existing)
        merge!(existing, deepcopy(incoming))
        return existing
    end
    existing_samples = existing["samples"]
    for (metric, values) in incoming["samples"]
        if haskey(existing_samples, metric)
            append!(existing_samples[metric], values)
        else
            existing_samples[metric] = deepcopy(values)
        end
    end
    return existing
end

"""
    merge_results(existing, incoming) -> Dict

Pool an incoming run into an existing result document with the **same
fingerprint**: sample arrays grow, the `runs` log gains an entry, and
`first_seen_utc`/`last_seen_utc` widen. Inputs are not mutated.
"""
function merge_results(existing::AbstractDict, incoming::AbstractDict)
    existing["fingerprint"] == incoming["fingerprint"] || throw(MergeError(
        "cannot merge: fingerprints differ ($(existing["fingerprint"]) vs $(incoming["fingerprint"]))"))

    merged = deepcopy(existing)
    append!(merged["runs"], deepcopy(incoming["runs"]))
    merged["first_seen_utc"] = min(merged["first_seen_utc"], incoming["first_seen_utc"])
    merged["last_seen_utc"] = max(merged["last_seen_utc"], incoming["last_seen_utc"])

    experiments_by_id = Dict(e["experiment_id"] => e for e in merged["experiments"])
    for incoming_exp in incoming["experiments"]
        exp_id = incoming_exp["experiment_id"]
        if !haskey(experiments_by_id, exp_id)
            push!(merged["experiments"], deepcopy(incoming_exp))
            continue
        end
        existing_exp = experiments_by_id[exp_id]
        scenarios_by_id = Dict(s["scenario_id"] => s for s in existing_exp["scenarios"])
        for incoming_scenario in incoming_exp["scenarios"]
            sid = incoming_scenario["scenario_id"]
            if haskey(scenarios_by_id, sid)
                merge_scenario!(scenarios_by_id[sid], incoming_scenario)
            else
                push!(existing_exp["scenarios"], deepcopy(incoming_scenario))
            end
        end
    end
    return merged
end

# ---------------------------------------------------------------------------
# Index
# ---------------------------------------------------------------------------

"""
    build_index(results_dir; hardware_registry) -> Dict

Walk `data/results/` and regenerate the manifest wholesale (deterministic,
sorted, idempotent). Every hardware folder must exist in the registry.
"""
function build_index(results_dir::AbstractString; hardware_registry::AbstractDict)
    hardware_entries = Vector{Dict{String,Any}}()
    isdir(results_dir) || return Dict{String,Any}("schema_version" => SCHEMA_VERSION, "hardware" => hardware_entries)

    for hw_id in sort(filter(name -> isdir(joinpath(results_dir, name)), readdir(results_dir)))
        haskey(hardware_registry, hw_id) ||
            throw(ConfigError("results folder `$(hw_id)` is not registered in hardware.yml"))
        hw_dir = joinpath(results_dir, hw_id)
        entries = Vector{Dict{String,Any}}()
        julia_versions = Set{String}()
        for minor in sort(filter(name -> isdir(joinpath(hw_dir, name)), readdir(hw_dir)))
            for file in sort(filter(endswith(".json"), readdir(joinpath(hw_dir, minor))))
                doc = read_json(joinpath(hw_dir, minor, file))
                validate_result(doc)
                push!(julia_versions, minor)
                push!(entries, Dict{String,Any}(
                    "file" => join([hw_id, minor, file], "/"),
                    "fingerprint" => doc["fingerprint"],
                    "julia_version" => doc["environment"]["julia_version"],
                    "rxinfer_version" => doc["environment"]["rxinfer_version"],
                    "first_seen_utc" => doc["first_seen_utc"],
                    "last_seen_utc" => doc["last_seen_utc"],
                    "run_count" => length(doc["runs"]),
                    "sample_count" => sum(r["processes"] for r in doc["runs"]),
                ))
            end
        end
        sort!(entries; by = e -> (e["first_seen_utc"], e["fingerprint"]))
        push!(hardware_entries, Dict{String,Any}(
            "id" => hw_id,
            "label" => hardware_registry[hw_id]["label"],
            "julia_versions" => sort(collect(julia_versions)),
            "entries" => entries,
        ))
    end
    return Dict{String,Any}("schema_version" => SCHEMA_VERSION, "hardware" => hardware_entries)
end

"""
    yaml_to_json(yml_path, json_path)

Mirror a human-edited YAML source into the JSON the frontend consumes.
"""
yaml_to_json(yml_path::AbstractString, json_path::AbstractString) =
    write_json(json_path, load_yaml(yml_path))

# ---------------------------------------------------------------------------
# Subprocess orchestration
# ---------------------------------------------------------------------------

"""
    run_scenario(model_dir, scenario; julia = Base.julia_cmd()) -> Dict

Spawn one fresh Julia process for `scenario` against the model project in
`model_dir` (uniform `benchmark.jl` contract) and return its parsed JSON
payload, augmented with `subprocess_wall_ms`. Never throws on subprocess
failure — returns a payload with `status = "error"` instead.
"""
function run_scenario(model_dir::AbstractString, scenario::AbstractDict; julia::Cmd = Base.julia_cmd())
    benchmark_script = joinpath(model_dir, "benchmark.jl")
    isfile(benchmark_script) || throw(ConfigError("no benchmark.jl in $(model_dir)"))

    payload = mktempdir() do tmp
        scenario_file = joinpath(tmp, "scenario.json")
        write_json(scenario_file, scenario)
        cmd = `$(julia) --startup-file=no --project=$(model_dir) $(benchmark_script) $(scenario_file)`
        out = IOBuffer()
        err = IOBuffer()
        wall = @elapsed proc = run(pipeline(ignorestatus(cmd); stdout = out, stderr = err))
        stdout_str = String(take!(out))
        stderr_str = String(take!(err))
        parsed = try
            JSON3.read(stdout_str, Dict{String,Any})
        catch
            Dict{String,Any}(
                "status" => "error",
                "error" => "benchmark.jl did not print valid JSON to stdout.\nstdout: $(first(stdout_str, 2000))\nstderr: $(first(stderr_str, 2000))",
            )
        end
        if success(proc)
            get!(parsed, "status", "ok")
        elseif get(parsed, "status", "") != "error"
            parsed["status"] = "error"
            parsed["error"] = "exit code $(proc.exitcode).\nstderr: $(first(stderr_str, 2000))"
        end
        parsed["subprocess_wall_ms"] = wall * 1e3
        parsed
    end
    return payload
end

end # module
