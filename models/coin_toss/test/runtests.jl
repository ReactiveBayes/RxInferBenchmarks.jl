using Test
using CoinTossModel
using RxInfer
using Statistics

make_scenario(; n = 2000, iterations = 10, seed = 42) = Dict{String,Any}(
    "experiment_id" => "basic/coin_toss",
    "model" => "coin_toss",
    "scenario_id" => "iterations=$(iterations)__n=$(n)__seed=$(seed)",
    "params" => Dict{String,Any}("n" => n, "iterations" => iterations, "seed" => seed),
)

@testset "CoinTossModel" begin
    @testset "posterior recovers the true coin bias" begin
        result = CoinTossModel.run_benchmark(make_scenario(n = 5000))
        posterior = last(result.posteriors[:θ])
        @test posterior isa Beta
        @test isapprox(mean(posterior), CoinTossModel.TRUE_BIAS; atol = 0.03)
        @test std(posterior) < 0.02
    end

    @testset "data generation is deterministic in the seed" begin
        a = CoinTossModel.generate_data(Dict{String,Any}("n" => 100, "seed" => 42))
        b = CoinTossModel.generate_data(Dict{String,Any}("n" => 100, "seed" => 42))
        c = CoinTossModel.generate_data(Dict{String,Any}("n" => 100, "seed" => 7))
        @test a == b
        @test a != c
        @test length(a) == 100
        @test all(x -> x isa Bool, a)
    end

    @testset "benchmark callbacks record phases" begin
        callbacks = RxInferBenchmarkCallbacks()
        CoinTossModel.run_benchmark(make_scenario(n = 50, iterations = 3); callbacks)
        @test length(callbacks.before_model_creation_ts) == 1
        @test length(callbacks.after_model_creation_ts) == 1
        @test length(callbacks.before_inference_ts) == 1
        @test length(callbacks.after_inference_ts) == 1
        @test length(last(callbacks.before_iteration_ts)) == 3
        @test length(last(callbacks.after_iteration_ts)) == 3
    end

    @testset "tiny smoke scenario runs" begin
        result = CoinTossModel.run_benchmark(make_scenario(n = 8, iterations = 2))
        @test last(result.posteriors[:θ]) isa Beta
    end
end
