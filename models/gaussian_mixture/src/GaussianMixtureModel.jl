"""
    GaussianMixtureModel

Finite Gaussian mixture benchmark (variational inference with mean-field
constraints), ported from the official "Gaussian Mixture" example
(https://examples.rxinfer.com). Two flavors selected by `params["type"]`:

- `"univariate"`: k components on a line (Dirichlet/Categorical switch),
- `"multivariate"`: k 2-D components arranged on a circle (Wishart precisions),
  exactly as in the official example.

Exposes the uniform benchmark contract: `run_benchmark(scenario; callbacks)`.
"""
module GaussianMixtureModel

using RxInfer
using Distributions
using LinearAlgebra
using StableRNGs

export run_benchmark

const TRUE_PRECISION = 1.777
const CIRCLE_RADIUS = 50.0 # multivariate components live on this circle (official example)
const UNIVARIATE_SPREAD = 10.0

"True univariate component means for `k` components: equally spaced on a line."
univariate_means(k::Integer) = [UNIVARIATE_SPREAD * (2 * (i - 1) / max(k - 1, 1) - 1) for i in 1:k]

"True multivariate component means for `k` components: equally spaced on a circle."
function multivariate_means(k::Integer)
    return [CIRCLE_RADIUS .* [cos(2π * (i - 1) / k), sin(2π * (i - 1) / k)] for i in 1:k]
end

"Deterministic synthetic dataset from scenario params (`type`, `n_components`, `n`, `seed`)."
function generate_data(params::AbstractDict)
    rng = StableRNG(get(params, "seed", 42))
    n = params["n"]
    k = get(params, "n_components", 2)
    type = get(params, "type", "univariate")
    z = rand(rng, Categorical(fill(1 / k, k)), n)
    if type == "multivariate"
        means = multivariate_means(k)
        cov = [10.0 0.0; 0.0 20.0]
        return [rand(rng, MvNormal(means[z[i]], cov)) for i in 1:n]
    end
    means = univariate_means(k)
    σ = 1 / sqrt(TRUE_PRECISION)
    return [rand(rng, Normal(means[z[i]], σ)) for i in 1:n]
end

# -- univariate: k components with a Dirichlet/Categorical switch ----------------------

@model function univariate_gaussian_mixture_model(k, priors_m, y)
    local m
    local w
    for i in 1:k
        m[i] ~ priors_m[i]
        w[i] ~ Gamma(shape = 0.01, rate = 0.01)
    end
    s ~ Dirichlet(ones(k))
    for i in eachindex(y)
        z[i] ~ Categorical(s)
        y[i] ~ NormalMixture(switch = z[i], m = m, p = w)
    end
end

function run_univariate(y, k, params; callbacks)
    # weakly informative priors near (but not at) the true means, as in the example
    priors_m = [NormalMeanVariance(0.2 * m, 1e3) for m in univariate_means(k)]
    initialization = @initialization begin
        q(s) = vague(Dirichlet, k)
        q(m) = priors_m
        q(w) = [vague(GammaShapeRate) for _ in 1:k]
    end
    return infer(
        model = univariate_gaussian_mixture_model(k = k, priors_m = priors_m),
        constraints = MeanField(),
        data = (y = y,),
        initialization = initialization,
        iterations = get(params, "iterations", 10),
        free_energy = true,
        callbacks = callbacks,
    )
end

# -- multivariate: official 2-D circle mixture with Wishart precisions -----------------

@model function multivariate_gaussian_mixture_model(k, priors_m, y)
    local m
    local w
    for i in 1:k
        m[i] ~ priors_m[i]
        w[i] ~ Wishart(3, 1e2 * diagm(ones(2)))
    end
    s ~ Dirichlet(ones(k))
    for i in eachindex(y)
        z[i] ~ Categorical(s)
        y[i] ~ NormalMixture(switch = z[i], m = m, p = w)
    end
end

function run_multivariate(y, k, params; callbacks)
    priors_m = [MvNormal(0.5 .* m, diagm(1e2 * ones(2))) for m in multivariate_means(k)]
    initialization = @initialization begin
        q(s) = vague(Dirichlet, k)
        q(m) = priors_m
        q(w) = Wishart(3, diagm(1e2 * ones(2)))
    end
    return infer(
        model = multivariate_gaussian_mixture_model(k = k, priors_m = priors_m),
        constraints = MeanField(),
        data = (y = y,),
        initialization = initialization,
        iterations = get(params, "iterations", 10),
        free_energy = true,
        callbacks = callbacks,
    )
end

"""
    run_benchmark(scenario; callbacks = nothing)

Uniform benchmark contract (design/benchmarks.md). `params["type"]` selects
`"univariate"` or `"multivariate"`; `params["n_components"]` the number of
mixture components.
"""
function run_benchmark(scenario::AbstractDict; callbacks = nothing)
    params = scenario["params"]
    y = generate_data(params)
    k = get(params, "n_components", 2)
    type = get(params, "type", "univariate")
    if type == "univariate"
        return run_univariate(y, k, params; callbacks)
    elseif type == "multivariate"
        return run_multivariate(y, k, params; callbacks)
    else
        throw(ArgumentError("unknown mixture type `$(type)` (expected \"univariate\" or \"multivariate\")"))
    end
end

end # module
