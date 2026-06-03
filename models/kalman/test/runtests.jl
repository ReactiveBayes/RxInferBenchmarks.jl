using Test
using KalmanModel
using RxInfer
using Statistics
using LinearAlgebra

make_scenario(mode; n = 50, kwargs...) = Dict{String,Any}(
    "experiment_id" => "basic/kalman",
    "model" => "kalman",
    "scenario_id" => "mode=$(mode)__n=$(n)",
    "params" => Dict{String,Any}("mode" => mode, "n" => n, "seed" => 42,
                                 (string(k) => v for (k, v) in kwargs)...),
)

@testset "KalmanModel" begin
    @testset "data generation is deterministic and shaped" begin
        params = Dict{String,Any}("n" => 30, "seed" => 42)
        x1, y1 = KalmanModel.generate_data(params)
        x2, y2 = KalmanModel.generate_data(params)
        @test x1 == x2 && y1 == y2
        @test length(y1) == 30
        @test all(v -> length(v) == 2, y1)
        _, y3 = KalmanModel.generate_data(Dict{String,Any}("n" => 30, "seed" => 7))
        @test y1 != y3
    end

    @testset "smoothing recovers the hidden states" begin
        scenario = make_scenario("smoothing"; n = 100, iterations = 5)
        result = KalmanModel.run_benchmark(scenario)
        x_true, _ = KalmanModel.generate_data(scenario["params"])
        marginals = last(result.posteriors[:x])
        @test length(marginals) == 100
        # posterior means track the hidden signal much better than raw observation noise
        errs = [norm(mean(marginals[i]) - x_true[i]) for i in eachindex(x_true)]
        @test Statistics.mean(errs) < 3.0 # observation noise std is 5 per dim
        @test all(isfinite, result.free_energy)
    end

    @testset "filtering produces a posterior per observation" begin
        scenario = make_scenario("filtering"; n = 60)
        engine = KalmanModel.run_benchmark(scenario)
        history = engine.history[:x]
        @test length(history) == 60
    end

    @testset "smoothing is at least as certain as filtering at interior points" begin
        n = 80
        smoothing = KalmanModel.run_benchmark(make_scenario("smoothing"; n, iterations = 5))
        filtering = KalmanModel.run_benchmark(make_scenario("filtering"; n))
        smoothed = last(smoothing.posteriors[:x])
        filtered = filtering.history[:x]
        mid = n ÷ 2
        @test first(var(smoothed[mid])) <= first(var(filtered[mid])) + 1e-8
    end

    @testset "unknown mode is rejected" begin
        @test_throws ArgumentError KalmanModel.run_benchmark(make_scenario("nonsense"))
    end

    @testset "benchmark callbacks record phases (smoothing)" begin
        callbacks = RxInferBenchmarkCallbacks()
        KalmanModel.run_benchmark(make_scenario("smoothing"; n = 20, iterations = 2); callbacks)
        @test length(callbacks.before_model_creation_ts) == 1
        @test length(callbacks.before_inference_ts) == 1
    end

    @testset "benchmark callbacks record autostart (filtering)" begin
        callbacks = RxInferBenchmarkCallbacks()
        KalmanModel.run_benchmark(make_scenario("filtering"; n = 20); callbacks)
        @test length(callbacks.before_model_creation_ts) == 1
        @test length(callbacks.before_autostart_ts) == 1
    end
end
