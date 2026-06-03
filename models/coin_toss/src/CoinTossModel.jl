"""
    CoinTossModel

Beta-Bernoulli coin toss benchmark, ported from the official RxInfer
getting-started example (https://docs.rxinfer.com/stable/manuals/getting-started/).
Exposes the uniform benchmark contract: `run_benchmark(scenario; callbacks)`.
"""
module CoinTossModel

using RxInfer
using Distributions
using StableRNGs

export run_benchmark

"True bias of the simulated coin; the correctness test recovers it."
const TRUE_BIAS = 0.75

@model function coin_toss(y, a, b)
    θ ~ Beta(a, b)
    y .~ Bernoulli(θ)
end

"Deterministic synthetic dataset from scenario params (`n`, `seed`). StableRNG
guarantees the exact same data on every Julia version and platform."
function generate_data(params::AbstractDict)
    rng = StableRNG(get(params, "seed", 42))
    return rand(rng, Bernoulli(TRUE_BIAS), params["n"])
end

"""
    run_benchmark(scenario; callbacks = nothing)

Uniform benchmark contract (design/benchmarks.md): generate data from
`scenario["params"]`, build the model, run `infer` with the given callbacks
(phase timings are recorded by `RxInferBenchmarkCallbacks`), return the result.
"""
function run_benchmark(scenario::AbstractDict; callbacks = nothing)
    params = scenario["params"]
    y = generate_data(params)
    return infer(
        model = coin_toss(a = 2.0, b = 7.0),
        data = (y = y,),
        iterations = get(params, "iterations", 10),
        callbacks = callbacks,
    )
end

end # module
