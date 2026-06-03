# End-to-end smoke test: spawns a REAL model subprocess with a tiny scenario and
# asserts the full uniform contract (design/benchmarks.md).
# Skipped when the coin_toss model project is not instantiated (e.g. harness-only CI job)
# or when RXBENCH_SKIP_SMOKE=1.

const COIN_TOSS_DIR = normpath(joinpath(@__DIR__, "..", "..", "..", "models", "coin_toss"))

@testset "smoke: coin_toss subprocess" begin
    if !isfile(joinpath(COIN_TOSS_DIR, "benchmark.jl"))
        @warn "models/coin_toss not present — skipping smoke test"
        @test_skip false
    else
        scenario = Dict{String,Any}(
            "experiment_id" => "basic/coin_toss",
            "model" => "coin_toss",
            "scenario_id" => "iterations=2__n=8__seed=42",
            "params" => Dict{String,Any}("n" => 8, "iterations" => 2, "seed" => 42))

        payload = Harness.run_scenario(COIN_TOSS_DIR, scenario)

        @test payload["status"] == "ok"
        @test haskey(payload, "samples")
        for key in ["ttfx_ms", "model_creation_ms", "cold_run_ms",
                    "warm_run_min_ms", "warm_run_median_ms",
                    "allocations", "allocated_bytes"]
            @test haskey(payload["samples"], key)
            @test length(payload["samples"][key]) == 1 # one process => one sample
            @test payload["samples"][key][1] >= 0
        end
        @test payload["samples"]["ttfx_ms"][1] > 0
        @test payload["samples"]["cold_run_ms"][1] > 0
        @test payload["samples"]["allocations"][1] > 0
        @test haskey(payload, "subprocess_wall_ms")
        @test payload["subprocess_wall_ms"] > 0
    end
end
