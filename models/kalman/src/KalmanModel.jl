"""
    KalmanModel

Linear Gaussian state-space benchmark in two modes, ported from the official
"Kalman filtering and smoothing" example (https://examples.rxinfer.com):

- `mode = "smoothing"`: batch inference over the full rotating 2D state-space model.
- `mode = "filtering"`: streaming (online) inference with `@autoupdates` over a
  datastream of observations.

Exposes the uniform benchmark contract: `run_benchmark(scenario; callbacks)`.
"""
module KalmanModel

using RxInfer
using Distributions
using LinearAlgebra
using StableRNGs

export run_benchmark

# Fixed, known dynamics — identical to the official example.
const THETA = π / 35
const A = [cos(THETA) -sin(THETA); sin(THETA) cos(THETA)]
const B = diageye(2)
const P = diageye(2)
const Q = 25.0 * diageye(2)
const X0_MEAN = [10.0, -10.0]

"Deterministic synthetic trajectory + observations from scenario params (`n`, `seed`).
StableRNG guarantees the exact same data on every Julia version and platform."
function generate_data(params::AbstractDict)
    rng = StableRNG(get(params, "seed", 42))
    n = params["n"]
    x = Vector{Vector{Float64}}(undef, n)
    y = Vector{Vector{Float64}}(undef, n)
    x_prev = X0_MEAN
    for i in 1:n
        x[i] = rand(rng, MvNormalMeanCovariance(A * x_prev, P))
        y[i] = rand(rng, MvNormalMeanCovariance(B * x[i], Q))
        x_prev = x[i]
    end
    return x, y
end

# -- smoothing: full batch model over all observations --------------------------------

@model function rotate_ssm(y, x0, A, B, P, Q)
    x_prior ~ x0
    x_prev = x_prior
    for i in 1:length(y)
        x[i] ~ MvNormalMeanCovariance(A * x_prev, P)
        y[i] ~ MvNormalMeanCovariance(B * x[i], Q)
        x_prev = x[i]
    end
end

function run_smoothing(y, params; callbacks)
    x0 = MvNormalMeanCovariance(zeros(2), 100.0 * diageye(2))
    # Exact belief propagation: converges in a single pass — `iterations` is
    # only honored when a scenario explicitly asks for it.
    return infer(
        model = rotate_ssm(x0 = x0, A = A, B = B, P = P, Q = Q),
        data = (y = y,),
        iterations = get(params, "iterations", nothing),
        free_energy = true,
        options = (limit_stack_depth = 500,),
        callbacks = callbacks,
    )
end

# -- filtering: streaming one-step model with autoupdates -----------------------------

@model function rotate_ssm_filter(y, x_prev_mean, x_prev_cov, A, B, P, Q)
    x_prev ~ MvNormalMeanCovariance(x_prev_mean, x_prev_cov)
    x ~ MvNormalMeanCovariance(A * x_prev, P)
    y ~ MvNormalMeanCovariance(B * x, Q)
end

const filter_autoupdates = @autoupdates begin
    x_prev_mean = mean(q(x))
    x_prev_cov = cov(q(x))
end

const filter_initialization = @initialization begin
    q(x) = MvNormalMeanCovariance(zeros(2), 100.0 * diageye(2))
end

function run_filtering(y, params; callbacks)
    datastream = from(y) |> map(NamedTuple{(:y,),Tuple{Vector{Float64}}}, (d) -> (y = d,))
    return infer(
        model = rotate_ssm_filter(A = A, B = B, P = P, Q = Q),
        datastream = datastream,
        autoupdates = filter_autoupdates,
        initialization = filter_initialization,
        keephistory = length(y),
        autostart = true,
        callbacks = callbacks,
    )
end

"""
    run_benchmark(scenario; callbacks = nothing)

Uniform benchmark contract (design/benchmarks.md). `scenario["params"]["mode"]`
selects `"smoothing"` (batch) or `"filtering"` (streaming).
"""
function run_benchmark(scenario::AbstractDict; callbacks = nothing)
    params = scenario["params"]
    _, y = generate_data(params)
    mode = params["mode"]
    if mode == "smoothing"
        return run_smoothing(y, params; callbacks)
    elseif mode == "filtering"
        return run_filtering(y, params; callbacks)
    else
        throw(ArgumentError("unknown kalman mode `$(mode)` (expected \"filtering\" or \"smoothing\")"))
    end
end

end # module
