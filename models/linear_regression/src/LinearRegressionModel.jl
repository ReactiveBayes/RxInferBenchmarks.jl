"""
    LinearRegressionModel

Univariate Bayesian linear regression, ported from the official
"Bayesian Linear Regression" example
(https://examples.rxinfer.com/categories/basic_examples/bayesian_linear_regression/).
Exposes the uniform benchmark contract: `run_benchmark(scenario; callbacks)`.
"""
module LinearRegressionModel

using RxInfer
using Distributions
using StableRNGs

export run_benchmark

const TRUE_SLOPE = 0.5
const TRUE_INTERCEPT = 25.0
const NOISE_VARIANCE = 1.0
# Fixed per model (design/benchmarks.md): per-iteration time is reported
# separately, so an iterations axis would only burn CI cycles.
const ITERATIONS = 20

@model function linear_regression(x, y)
    a ~ Normal(mean = 0.0, variance = 1.0)
    b ~ Normal(mean = 0.0, variance = 100.0)
    y .~ Normal(mean = a .* x .+ b, variance = 1.0)
end

const regression_initialization = @initialization begin
    μ(b) = NormalMeanVariance(0.0, 100.0)
end

"Deterministic synthetic dataset from scenario params (`n`, `seed`). StableRNG
guarantees the exact same data on every Julia version and platform."
function generate_data(params::AbstractDict)
    rng = StableRNG(get(params, "seed", 42))
    n = params["n"]
    x = float.(collect(1:n))
    y = TRUE_SLOPE .* x .+ TRUE_INTERCEPT .+ randn(rng, n) .* sqrt(NOISE_VARIANCE)
    return (x = x, y = y)
end

"""
    run_benchmark(scenario; callbacks = nothing)

Uniform benchmark contract (design/benchmarks.md): generate data from
`scenario["params"]`, run inference, return the result.
"""
function run_benchmark(scenario::AbstractDict; callbacks = nothing)
    params = scenario["params"]
    data = generate_data(params)
    return infer(
        model = linear_regression(),
        data = (y = data.y, x = data.x),
        initialization = regression_initialization,
        returnvars = (a = KeepLast(), b = KeepLast()),
        iterations = get(params, "iterations", ITERATIONS),
        free_energy = true,
        callbacks = callbacks,
    )
end

end # module
