"""
    BSTSModel

Bayesian Structural Time Series benchmark, ported from the official
"Bayesian Structured Time Series" example (https://examples.rxinfer.com).
The model is the official `rxsts` (trend + two damped seasonal cycles + AR
residual + regression component, with a learned transition and `ContinuousTransition`
nodes); the weather-API data of the example is replaced by a deterministic
synthetic simulation with the same generative structure.

Exposes the uniform benchmark contract: `run_benchmark(scenario; callbacks)`.
"""
module BSTSModel

using RxInfer
using Distributions
using LinearAlgebra
using Random

export run_benchmark

const D = 6 # state: [level, seasonal-A cos/sin, seasonal-B cos/sin, AR]
const TRUE_BETA = 2.0
const OBS_NOISE_STD = 5.0

# Observation selection: level + both cycle cosines + AR.
const H_VEC = [1.0, 1.0, 0.0, 1.0, 0.0, 1.0]

# Maps 4 noise sources onto the 6 states (sine components are deterministic rotations).
const R_MAT = [1.0 0.0 0.0 0.0;
               0.0 1.0 0.0 0.0;
               0.0 0.0 0.0 0.0;
               0.0 0.0 1.0 0.0;
               0.0 0.0 0.0 0.0;
               0.0 0.0 0.0 1.0]

"Dense transition matrix from the 5 learned components (official `transition`)."
function transition(F)
    FT = eltype(F)
    M = zeros(FT, D, D)
    M[1, 1] = one(FT)                      # random-walk trend
    M[2, 2] = F[1]; M[2, 3] = F[2]         # cycle A rotation
    M[3, 2] = -F[2]; M[3, 3] = F[1]
    M[4, 4] = F[3]; M[4, 5] = F[4]         # cycle B rotation
    M[5, 4] = -F[4]; M[5, 5] = F[3]
    M[6, 6] = F[5]                         # AR residual
    return M
end

function true_transition(period)
    damp_a, freq_a = 0.99, 2π / 1
    damp_b, freq_b = 0.98, 2π / period
    rho_ar = 0.7
    return transition([
        damp_a * cos(freq_a), damp_a * sin(freq_a),
        damp_b * cos(freq_b), damp_b * sin(freq_b),
        rho_ar,
    ])
end

"""
Deterministic synthetic series from scenario params (`n`, `period`, `seed`):
state-space simulation with the example's dynamics plus a sinusoidal
"temperature" regressor with true coefficient `TRUE_BETA`.
"""
function generate_data(params::AbstractDict)
    rng = MersenneTwister(get(params, "seed", 42))
    n = params["n"]
    period = get(params, "period", 7)

    F = true_transition(period)
    dist_noise = MvNormal(zeros(4), diagm([0.5^2, 1.0^2, 0.8^2, 2.0^2]))

    # Synthetic regressor: "temperature" oscillating with period 2×`period` —
    # several full cycles inside the window and distinct from the model's own
    # cycle periods, so the regression coefficient is identifiable (a slow
    # seasonal ramp would be absorbed by the random-walk trend).
    temperature = [72.0 + 15.0 * sin(2π * t / (2 * period)) + 2.0 * randn(rng) for t in 1:n]

    z = [150.0, 10.0, 0.0, 20.0, 0.0, 0.0]
    y = Vector{Float64}(undef, n)
    X = Vector{Vector{Float64}}(undef, n)
    for t in 1:n
        z = F * z + R_MAT * rand(rng, dist_noise)
        X[t] = [temperature[t] - 72.0]
        y[t] = dot(H_VEC, z) + dot(X[t], [TRUE_BETA]) + OBS_NOISE_STD * randn(rng)
    end
    return (y = y, X = X)
end

# -- the official rxsts model ----------------------------------------------------------

@model function rxsts(H, X, y, R, priors)
    τy ~ priors[:τy]
    β ~ priors[:β]
    Q ~ Wishart(priors[:Q].df, priors[:Q].S)
    zprev ~ priors[:z0]
    F ~ priors[:F]

    for t in eachindex(y)
        η[t] ~ MvNormal(mean = zeros(4), precision = Q)
        z_mean[t] ~ ContinuousTransition(zprev, F, diageye(D))
        z_shock[t] ~ R * η[t]
        z[t] ~ z_mean[t] + z_shock[t]
        μ[t] ~ dot(H, z[t]) + dot(X[t], β)
        y[t] ~ Normal(mean = μ[t], precision = τy)
        zprev = z[t]
    end
end

@constraints function rxsts_constraints()
    q(z, z_mean, z_shock, zprev, F, Q, η, μ, y, τy, β) = q(z, z_mean, z_shock, zprev, μ, y, β, η)q(F)q(Q)q(τy)
end

@meta function rxsts_meta()
    ContinuousTransition() -> CTMeta(transition)
end

function make_priors(rng)
    return Dict(
        :τy => GammaShapeRate(10.0, 1.0),
        :β => MvNormalMeanPrecision(zeros(1), diageye(1)),
        :z0 => MvNormalMeanPrecision(ones(D), diageye(D)),
        :F => MvNormalMeanPrecision(randn(rng, 5), diageye(5)),
        :Q => Wishart(6, diagm(ones(4))),
    )
end

@initialization function rxsts_init(priors)
    q(F) = priors[:F]
    q(Q) = priors[:Q]
    q(τy) = priors[:τy]
    μ(z) = priors[:z0]
end

"""
    run_benchmark(scenario; callbacks = nothing)

Uniform benchmark contract (design/benchmarks.md): simulate a structural time
series from `scenario["params"]`, run VMP inference on the official `rxsts`
model, return the result.
"""
function run_benchmark(scenario::AbstractDict; callbacks = nothing)
    params = scenario["params"]
    data = generate_data(params)
    priors = make_priors(MersenneTwister(get(params, "seed", 42)))
    return infer(
        model = rxsts(H = H_VEC, X = data.X, R = R_MAT, priors = priors),
        data = (y = data.y,),
        constraints = rxsts_constraints(),
        meta = rxsts_meta(),
        initialization = rxsts_init(priors),
        options = (limit_stack_depth = 100,),
        returnvars = KeepLast(),
        iterations = get(params, "iterations", 20),
        callbacks = callbacks,
    )
end

end # module
