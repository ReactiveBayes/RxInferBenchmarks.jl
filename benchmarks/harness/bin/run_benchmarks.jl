# Run the benchmark suite: one fresh Julia subprocess per (scenario, process).
#
# Usage:
#   julia --project=benchmarks/harness benchmarks/harness/bin/run_benchmarks.jl [--model <name>] [--output <dir>]
#
# Environment:
#   RXBENCH_HARDWARE_ID  hardware id (must exist in data/hardware.yml); default: local-dev
#   RXBENCH_SMOKE=1      tiny scenarios, 1 process, results to a temp dir — validates the pipeline
#   RXBENCH_QUICK=1      REAL scenarios with 1 process + minimal warm sampling — fast UI seed data
#
# Output (design/data.md): by DEFAULT results are merged into the FAKE seed tree
#   data/seed/results/<hardware>/<julia-minor>/<fingerprint12>.json
# so a local run can never pollute the public CI dataset. The public REAL dataset
# (data/results/) is written ONLY when CI passes `--output data/results` explicitly.
# (Sample pooling when the environment fingerprint is unchanged.)

using Harness
using Dates

const REPO_ROOT = normpath(joinpath(@__DIR__, "..", "..", ".."))
const MODELS_DIR = joinpath(REPO_ROOT, "models")
const DATA_DIR = joinpath(REPO_ROOT, "data")

function parse_args(args)
    model_filter = nothing
    output = nothing
    i = 1
    while i <= length(args)
        if args[i] == "--model" && i < length(args)
            model_filter = args[i + 1]; i += 2
        elseif args[i] == "--output" && i < length(args)
            output = args[i + 1]; i += 2
        else
            error("unknown argument: $(args[i])")
        end
    end
    return (; model_filter, output)
end

function git_info(repo_root)
    commit = try
        readchomp(setenv(`git rev-parse --short HEAD`; dir = repo_root))
    catch
        "unknown"
    end
    return commit
end

function main()
    (; model_filter, output) = parse_args(ARGS)
    smoke = get(ENV, "RXBENCH_SMOKE", "0") == "1"
    quick = get(ENV, "RXBENCH_QUICK", "0") == "1"
    hardware_id = get(ENV, "RXBENCH_HARDWARE_ID", "local-dev")

    hardware = Harness.load_hardware(joinpath(DATA_DIR, "hardware.yml"))
    haskey(hardware, hardware_id) ||
        throw(Harness.ConfigError("RXBENCH_HARDWARE_ID=$(hardware_id) is not registered in data/hardware.yml"))
    cfg = Harness.load_experiments(joinpath(DATA_DIR, "experiments.yml"); models_dir = MODELS_DIR)

    experiments = cfg["experiments"]
    if model_filter !== nothing
        experiments = filter(e -> e["model"] == model_filter, experiments)
        isempty(experiments) && throw(Harness.ConfigError("no experiment uses model `$(model_filter)`"))
    end

    defaults = cfg["defaults"]
    processes = (smoke || quick) ? 1 : get(defaults, "processes", 3)
    # Default to the seed tree; the public REAL dataset is opt-in via `--output data/results`
    # (only CI does this). Smoke runs always go to a throwaway temp dir.
    default_results_dir = smoke ? mktempdir(; prefix = "rxbench-smoke-") : joinpath(DATA_DIR, "seed", "results")
    results_dir = something(output, default_results_dir)

    # The fingerprint covers ALL model projects (the environment identity),
    # regardless of which experiments run in this invocation.
    all_model_dirs = [joinpath(MODELS_DIR, name) for name in sort(readdir(MODELS_DIR)) if isdir(joinpath(MODELS_DIR, name))]
    dependencies = Harness.collect_dependencies(all_model_dirs)
    environment = Harness.collect_environment(; hardware_id, dependencies)
    fingerprint = Harness.compute_fingerprint(environment["julia_version"], dependencies)

    @info "benchmark run" hardware_id julia = environment["julia_version"] rxinfer = environment["rxinfer_version"] fingerprint = Harness.short_fingerprint(fingerprint) smoke processes results_dir

    scenarios_by_experiment = Dict{String,Any}()
    failures = 0
    for experiment in experiments
        scenarios = Harness.expand_scenarios(experiment, defaults; smoke)
        model_dir = joinpath(MODELS_DIR, experiment["model"])
        results = Vector{Dict{String,Any}}()
        for scenario in scenarios
            @info "scenario" experiment = experiment["id"] scenario = scenario["scenario_id"] processes
            pooled = Dict{String,Any}(
                "scenario_id" => scenario["scenario_id"],
                "params" => scenario["params"],
                "status" => "ok",
                "samples" => Dict{String,Any}(),
            )
            for p in 1:processes
                payload = Harness.run_scenario(model_dir, scenario)
                if payload["status"] != "ok"
                    pooled["status"] = "error"
                    pooled["error"] = get(payload, "error", "unknown error")
                    failures += 1
                    @error "scenario process failed" experiment = experiment["id"] scenario = scenario["scenario_id"] process = p error = pooled["error"]
                    break
                end
                for (metric, values) in payload["samples"]
                    append!(get!(pooled["samples"], metric, Float64[]), values)
                end
                @info "  process done" process = p wall_ms = round(payload["subprocess_wall_ms"]; digits = 1)
            end
            pooled["status"] == "ok" || empty!(pooled["samples"])
            push!(results, pooled)
        end
        scenarios_by_experiment[experiment["id"]] = results
    end

    timestamp_utc = Dates.format(now(UTC), dateformat"yyyy-mm-dd\THH:MM:SS\Z")
    doc = Harness.assemble_result(;
        environment, fingerprint,
        timestamp_utc, commit = git_info(REPO_ROOT),
        processes, scenarios_by_experiment,
    )
    Harness.validate_result(doc)

    path = joinpath(results_dir, Harness.result_relpath(hardware_id, environment["julia_version"], fingerprint))
    if isfile(path)
        existing = Harness.read_json(path)
        doc = Harness.merge_results(existing, doc)
        Harness.validate_result(doc)
        @info "merged into existing fingerprint entry (sample pooling)" path runs = length(doc["runs"])
    else
        @info "new fingerprint entry" path
    end
    Harness.write_json(path, doc)

    println("\nresult: $(path)")
    failures == 0 || error("$(failures) scenario(s) failed — see log above")
end

main()
