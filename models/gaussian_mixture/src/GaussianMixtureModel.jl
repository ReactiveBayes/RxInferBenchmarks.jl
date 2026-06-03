"""
    GaussianMixtureModel

Univariate Gaussian mixture benchmark (variational inference with mean-field
constraints), ported from the official "Gaussian Mixture" example
(https://examples.rxinfer.com). Exposes the uniform benchmark contract:
`run_benchmark(scenario; callbacks)`.
"""
module GaussianMixtureModel

using RxInfer
using Distributions
using StableRNGs

export run_benchmark

"True component means and mixing weight of the simulated data."
const TRUE_MEANS = (-10.0, 10.0)
const TRUE_PRECISION = 1.777
const TRUE_WEIGHT = 2 / 3 # probability of the second component

"Deterministic synthetic dataset from scenario params (`n`, `seed`). StableRNG
guarantees the exact same data on every Julia version and platform."
function generate_data(params::AbstractDict)
    rng = StableRNG(get(params, "seed", 42))
    n = params["n"]
    z = rand(rng, Bernoulli(TRUE_WEIGHT), n)
    σ = 1 / sqrt(TRUE_PRECISION)
    return [rand(rng, Normal(z[i] ? TRUE_MEANS[2] : TRUE_MEANS[1], σ)) for i in 1:n]
end

@model function univariate_gaussian_mixture_model(y)
    s ~ Beta(1.0, 1.0)

    m[1] ~ Normal(mean = -2.0, variance = 1e3)
    w[1] ~ Gamma(shape = 0.01, rate = 0.01)

    m[2] ~ Normal(mean = 2.0, variance = 1e3)
    w[2] ~ Gamma(shape = 0.01, rate = 0.01)

    for i in eachindex(y)
        z[i] ~ Bernoulli(s)
        y[i] ~ NormalMixture(switch = z[i], m = m, p = w)
    end
end

const mixture_initialization = @initialization begin
    q(s) = vague(Beta)
    q(m) = [NormalMeanVariance(-2.0, 1e3), NormalMeanVariance(2.0, 1e3)]
    q(w) = [vague(GammaShapeRate), vague(GammaShapeRate)]
end

"""
    run_benchmark(scenario; callbacks = nothing)

Uniform benchmark contract (design/benchmarks.md): generate bimodal data from
`scenario["params"]`, run mean-field variational inference, return the result.
"""
function run_benchmark(scenario::AbstractDict; callbacks = nothing)
    params = scenario["params"]
    y = generate_data(params)
    return infer(
        model = univariate_gaussian_mixture_model(),
        constraints = MeanField(),
        data = (y = y,),
        initialization = mixture_initialization,
        iterations = get(params, "iterations", 25),
        free_energy = true,
        callbacks = callbacks,
    )
end

end # module
