using Test
using LinearRegressionModel
using RxInfer
using Statistics

make_scenario(; n = 250, iterations = 20, seed = 42) = Dict{String,Any}(
    "experiment_id" => "basic/linear_regression",
    "model" => "linear_regression",
    "scenario_id" => "iterations=$(iterations)__n=$(n)__seed=$(seed)",
    "params" => Dict{String,Any}("n" => n, "iterations" => iterations, "seed" => seed),
)

@testset "LinearRegressionModel" begin
    @testset "posterior recovers slope and intercept" begin
        result = LinearRegressionModel.run_benchmark(make_scenario(n = 250, iterations = 20))
        a = result.posteriors[:a]
        b = result.posteriors[:b]
        @test isapprox(mean(a), LinearRegressionModel.TRUE_SLOPE; atol = 0.05)
        @test isapprox(mean(b), LinearRegressionModel.TRUE_INTERCEPT; atol = 2.0)
    end

    @testset "free energy is finite and decreases after the first iteration" begin
        result = LinearRegressionModel.run_benchmark(make_scenario(n = 100, iterations = 10))
        fe = result.free_energy
        @test all(isfinite, fe)
        # the official example notes the first iteration is influenced by init messages
        @test last(fe) <= fe[2]
    end

    @testset "data generation is deterministic in the seed" begin
        a = LinearRegressionModel.generate_data(Dict{String,Any}("n" => 50, "seed" => 42))
        b = LinearRegressionModel.generate_data(Dict{String,Any}("n" => 50, "seed" => 42))
        c = LinearRegressionModel.generate_data(Dict{String,Any}("n" => 50, "seed" => 7))
        @test a == b
        @test a != c
        @test length(a.x) == 50 && length(a.y) == 50
    end

    @testset "benchmark callbacks record phases" begin
        callbacks = RxInferBenchmarkCallbacks()
        LinearRegressionModel.run_benchmark(make_scenario(n = 30, iterations = 3); callbacks)
        @test length(callbacks.before_model_creation_ts) == 1
        @test length(last(callbacks.before_iteration_ts)) == 3
    end

    @testset "large n runs (limited stack depth)" begin
        result = LinearRegressionModel.run_benchmark(make_scenario(n = 10000, iterations = 2))
        @test isfinite(mean(result.posteriors[:a]))
    end

    @testset "tiny smoke scenario runs" begin
        result = LinearRegressionModel.run_benchmark(make_scenario(n = 8, iterations = 2))
        @test result.posteriors[:a] isa UnivariateDistribution
    end
end
