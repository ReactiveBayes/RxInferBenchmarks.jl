"""
    IIDNormalModel

Estimating the mean and precision of an IID Gaussian with mean-field
variational constraints `q(μ, τ) = q(μ)q(τ)`, following the official
constraints-specification manual
(https://docs.rxinfer.com/stable/manuals/variational/constraints-specification/).
Exposes the uniform benchmark contract: `run_benchmark(scenario; callbacks)`.
"""
module IIDNormalModel

using RxInfer
using Distributions
using StableRNGs

export run_benchmark

const TRUE_MEAN = 3.0
const TRUE_PRECISION = 4.0 # std = 0.5
# Fixed per model (design/benchmarks.md): per-iteration time is reported
# separately, so an iterations axis would only burn CI cycles.
const ITERATIONS = 25

@model function iid_normal(y)
    μ ~ Normal(mean = 0.0, variance = 1.0)
    τ ~ Gamma(shape = 1.0, rate = 1.0)
    y .~ Normal(mean = μ, precision = τ)
end

const meanfield_constraints = @constraints begin
    q(μ, τ) = q(μ)q(τ)
end

const meanfield_initialization = @initialization begin
    q(τ) = GammaShapeRate(1.0, 1.0)
end

"Deterministic synthetic dataset from scenario params (`n`, `seed`). StableRNG
guarantees the exact same data on every Julia version and platform."
function generate_data(params::AbstractDict)
    rng = StableRNG(get(params, "seed", 42))
    n = params["n"]
    return TRUE_MEAN .+ randn(rng, n) ./ sqrt(TRUE_PRECISION)
end

"""
    run_benchmark(scenario; callbacks = nothing)

Uniform benchmark contract (design/benchmarks.md): generate data from
`scenario["params"]`, run mean-field VMP, return the result.
"""
function run_benchmark(scenario::AbstractDict; callbacks = nothing)
    params = scenario["params"]
    y = generate_data(params)
    return infer(
        model = iid_normal(),
        data = (y = y,),
        constraints = meanfield_constraints,
        initialization = meanfield_initialization,
        iterations = get(params, "iterations", ITERATIONS),
        free_energy = true,
        callbacks = callbacks,
    )
end

end # module
