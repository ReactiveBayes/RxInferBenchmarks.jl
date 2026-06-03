# Uniform benchmark entry point — IDENTICAL across all models (design/benchmarks.md).
# The model package is discovered from this directory's Project.toml.
#
# Usage:  julia --startup-file=no --project=<model dir> benchmark.jl <scenario.json>
#
# Contract: reads one scenario JSON from ARGS[1]; prints EXACTLY ONE JSON object to
# stdout (a `samples` block with single-element arrays — one fresh process = one
# sample); logs to stderr; exit code 0 on success.

import JSON3
import TOML
import Statistics: median

function fail(message)
    JSON3.write(stdout, Dict("status" => "error", "error" => message))
    println(stdout)
    exit(1)
end

length(ARGS) == 1 || fail("usage: benchmark.jl <scenario.json>")

scenario = try
    JSON3.read(read(ARGS[1], String), Dict{String,Any})
catch err
    fail("cannot read scenario JSON: $(sprint(showerror, err))")
end

model_name = Symbol(TOML.parsefile(joinpath(@__DIR__, "Project.toml"))["name"])
smoke = get(ENV, "RXBENCH_SMOKE", "0") == "1"

ns_to_ms(x) = Float64(x) / 1.0e6

# Package loading must be its own top-level expression: the `try` block below uses
# BenchmarkTools macros, which must already be loaded when that block is lowered.
# A loading failure exits non-zero with the error on stderr — the harness records it.
t_load = @elapsed @eval begin
    using RxInfer
    using BenchmarkTools
    using $model_name
end
M = getfield(Main, model_name)

try
    cold_callbacks = RxInferBenchmarkCallbacks()
    cold = @timed M.run_benchmark(scenario; callbacks = cold_callbacks)

    # -- warm statistics via BenchmarkTools (no callbacks: nothing perturbs the timing)
    GC.gc()
    trial = run(
        @benchmarkable($M.run_benchmark($scenario));
        samples = smoke ? 2 : 10,
        seconds = smoke ? 5 : 60,
        evals = 1,
    )

    # -- one instrumented warm run for phase timings (model creation / iterations / autostart)
    warm_callbacks = RxInferBenchmarkCallbacks()
    M.run_benchmark(scenario; callbacks = warm_callbacks)

    samples = Dict{String,Any}(
        "ttfx_ms" => [(t_load + cold.time) * 1.0e3],
        "cold_run_ms" => [cold.time * 1.0e3],
        "warm_run_min_ms" => [ns_to_ms(minimum(trial.times))],
        "warm_run_median_ms" => [ns_to_ms(median(trial.times))],
        "allocations" => [Int(trial.allocs)],
        "allocated_bytes" => [Int(trial.memory)],
        "gc_time_ms" => [ns_to_ms(median(trial.gctimes))],
    )

    if !isempty(warm_callbacks.before_model_creation_ts)
        creation = first(warm_callbacks.after_model_creation_ts) - first(warm_callbacks.before_model_creation_ts)
        samples["model_creation_ms"] = [ns_to_ms(creation)]
    end
    if !isempty(warm_callbacks.before_iteration_ts) && !isempty(last(warm_callbacks.before_iteration_ts))
        durations = last(warm_callbacks.after_iteration_ts) .- last(warm_callbacks.before_iteration_ts)
        samples["iteration_median_ms"] = [ns_to_ms(median(durations))]
    end
    if !isempty(warm_callbacks.before_autostart_ts)
        autostart = last(warm_callbacks.after_autostart_ts) - last(warm_callbacks.before_autostart_ts)
        samples["autostart_ms"] = [ns_to_ms(autostart)]
    end

    JSON3.write(stdout, Dict{String,Any}(
        "status" => "ok",
        "scenario_id" => scenario["scenario_id"],
        "samples" => samples,
    ))
    println(stdout)
catch err
    fail(sprint(showerror, err, catch_backtrace()))
end
