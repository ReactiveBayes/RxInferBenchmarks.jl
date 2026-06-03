# Regenerate all generated data files (never hand-edited — design/data.md):
#   data/{experiments,hardware,metrics}.json   mirrors of the YAML sources
#   data/results/index.json                    manifest over all result files
#
# Usage: julia --project=benchmarks/harness benchmarks/harness/bin/build_index.jl

using Harness
using Dates

const REPO_ROOT = normpath(joinpath(@__DIR__, "..", "..", ".."))
const DATA_DIR = joinpath(REPO_ROOT, "data")

function main()
    for name in ("experiments", "hardware", "metrics")
        yml = joinpath(DATA_DIR, "$(name).yml")
        json = joinpath(DATA_DIR, "$(name).json")
        Harness.yaml_to_json(yml, json)
        println("wrote $(json)")
    end

    hardware_registry = Harness.load_hardware(joinpath(DATA_DIR, "hardware.yml"))
    index = Harness.build_index(joinpath(DATA_DIR, "results"); hardware_registry)
    index["generated_utc"] = Dates.format(now(UTC), dateformat"yyyy-mm-dd\THH:MM:SS\Z")
    path = Harness.write_json(joinpath(DATA_DIR, "results", "index.json"), index)
    println("wrote $(path)")
end

main()
