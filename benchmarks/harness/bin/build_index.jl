# Regenerate generated data files (never hand-edited — design/data.md).
#
# There are two data trees the frontend can be pointed at (design/data.md):
#   data/        REAL data — public CI results, deployed to the live site.
#   data/seed/   FAKE seed data — produced by local `make bench*`, for UI dev only.
#
# Usage:
#   build_index.jl                 full REAL build: data/{*.json} + data/results/index.json
#                                  (CI uses this — it has the real result files present)
#   build_index.jl --out data/seed full build of an alternate tree: <out>/{*.json}
#                                  + <out>/results/index.json (used to (re)build the seed)
#   build_index.jl --mirrors-only  only mirror the YAML sources to data/{*.json};
#                                  leaves the CI-owned data/results/index.json untouched
#                                  (safe to run locally after editing the YAML sources)
#
# The YAML sources live only in data/; alternate trees mirror the same JSON.

using Harness
using Dates

const REPO_ROOT = normpath(joinpath(@__DIR__, "..", "..", ".."))
const DATA_DIR = joinpath(REPO_ROOT, "data")

function parse_args(args)
    out = nothing
    mirrors_only = false
    i = 1
    while i <= length(args)
        if args[i] == "--out" && i < length(args)
            out = args[i + 1]; i += 2
        elseif args[i] == "--mirrors-only"
            mirrors_only = true; i += 1
        else
            error("unknown argument: $(args[i])")
        end
    end
    return (; out, mirrors_only)
end

"Mirror the human-edited YAML sources to JSON under `out_dir` (always read from data/)."
function write_mirrors(out_dir)
    for name in ("experiments", "hardware", "metrics")
        yml = joinpath(DATA_DIR, "$(name).yml")
        json = joinpath(out_dir, "$(name).json")
        Harness.yaml_to_json(yml, json)
        println("wrote $(json)")
    end
end

"Rebuild the results manifest for the tree rooted at `out_dir`."
function write_results_index(out_dir)
    hardware_registry = Harness.load_hardware(joinpath(DATA_DIR, "hardware.yml"))
    index = Harness.build_index(joinpath(out_dir, "results"); hardware_registry)
    index["generated_utc"] = Dates.format(now(UTC), dateformat"yyyy-mm-dd\THH:MM:SS\Z")
    path = Harness.write_json(joinpath(out_dir, "results", "index.json"), index)
    println("wrote $(path)")
end

function main()
    (; out, mirrors_only) = parse_args(ARGS)
    out_dir = something(out, DATA_DIR)

    write_mirrors(out_dir)
    if mirrors_only
        println("--mirrors-only: left $(joinpath(out_dir, "results", "index.json")) untouched")
        return
    end
    write_results_index(out_dir)
end

main()
