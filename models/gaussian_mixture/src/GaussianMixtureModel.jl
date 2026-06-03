"""
    GaussianMixtureModel

Finite Gaussian mixture benchmark (variational inference with mean-field
constraints), ported from the official "Gaussian Mixture" example
(https://examples.rxinfer.com). The data/component dimension is a scenario
parameter: `dimension = 1` runs the univariate model, `dimension > 1` the
multivariate one (component means on a circle embedded in the first two
coordinates, Wishart precisions — as in the official 2-D example).

Iteration count is fixed (`ITERATIONS`): per-iteration time is reported
separately, so an iterations axis would only burn CI cycles.

Exposes the uniform benchmark contract: `run_benchmark(scenario; callbacks)`.
"""
module GaussianMixtureModel

using RxInfer
using Distributions
using LinearAlgebra
using StableRNGs

export run_benchmark

const ITERATIONS = 25
const TRUE_PRECISION = 1.777
const CIRCLE_RADIUS = 50.0 # multivariate components live on this circle (official example)
const UNIVARIATE_SPREAD = 10.0

"True univariate component means for `k` components: equally spaced on a line."
univariate_means(k::Integer) = [UNIVARIATE_SPREAD * (2 * (i - 1) / max(k - 1, 1) - 1) for i in 1:k]

"""
True multivariate component means for `k` components in `dim` dimensions:
equally spaced on a circle embedded in the first two coordinates (the official
example's geometry, generalized to any dimension).
"""
function multivariate_means(k::Integer, dim::Integer)
    return map(1:k) do i
        angle = 2π * (i - 1) / k
        mean = zeros(dim)
        mean[1] = CIRCLE_RADIUS * cos(angle)
        mean[2] = CIRCLE_RADIUS * sin(angle)
        return mean
    end
end

"True component covariance in `dim` dimensions (alternating 10/20 diagonal)."
true_covariance(dim::Integer) = diagm([isodd(i) ? 10.0 : 20.0 for i in 1:dim])

"Deterministic synthetic dataset from scenario params (`dimension`, `n_components`, `n`, `seed`)."
function generate_data(params::AbstractDict)
    rng = StableRNG(get(params, "seed", 42))
    n = params["n"]
    k = get(params, "n_components", 2)
    dim = get(params, "dimension", 1)
    z = rand(rng, Categorical(fill(1 / k, k)), n)
    if dim > 1
        means = multivariate_means(k, dim)
        cov = true_covariance(dim)
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

function run_univariate(y, k; callbacks)
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
        iterations = ITERATIONS,
        free_energy = true,
        callbacks = callbacks,
    )
end

# -- multivariate: official circle mixture with Wishart precisions ---------------------

@model function multivariate_gaussian_mixture_model(k, dim, priors_m, y)
    local m
    local w
    for i in 1:k
        m[i] ~ priors_m[i]
        w[i] ~ Wishart(dim + 1, 1e2 * diagm(ones(dim)))
    end
    s ~ Dirichlet(ones(k))
    for i in eachindex(y)
        z[i] ~ Categorical(s)
        y[i] ~ NormalMixture(switch = z[i], m = m, p = w)
    end
end

function run_multivariate(y, k, dim; callbacks)
    priors_m = [MvNormal(0.5 .* m, diagm(1e2 * ones(dim))) for m in multivariate_means(k, dim)]
    initialization = @initialization begin
        q(s) = vague(Dirichlet, k)
        q(m) = priors_m
        q(w) = Wishart(dim + 1, diagm(1e2 * ones(dim)))
    end
    return infer(
        model = multivariate_gaussian_mixture_model(k = k, dim = dim, priors_m = priors_m),
        constraints = MeanField(),
        data = (y = y,),
        initialization = initialization,
        iterations = ITERATIONS,
        free_energy = true,
        callbacks = callbacks,
    )
end

"""
    run_benchmark(scenario; callbacks = nothing)

Uniform benchmark contract (design/benchmarks.md). `params["dimension"]`
selects the model dynamically: 1 → univariate, >1 → multivariate.
"""
function run_benchmark(scenario::AbstractDict; callbacks = nothing)
    params = scenario["params"]
    y = generate_data(params)
    k = get(params, "n_components", 2)
    dim = get(params, "dimension", 1)
    dim >= 1 || throw(ArgumentError("dimension must be >= 1, got $(dim)"))
    if dim == 1
        return run_univariate(y, k; callbacks)
    end
    return run_multivariate(y, k, dim; callbacks)
end

end # module
