using Test
using IIDNormalModel
using RxInfer
using Statistics

make_scenario(; n = 1000, iterations = 10, seed = 42) = Dict{String,Any}(
    "experiment_id" => "basic/iid_normal",
    "model" => "iid_normal",
    "scenario_id" => "iterations=$(iterations)__n=$(n)__seed=$(seed)",
    "params" => Dict{String,Any}("n" => n, "iterations" => iterations, "seed" => seed),
)

@testset "IIDNormalModel" begin
    @testset "posterior recovers mean and precision" begin
        result = IIDNormalModel.run_benchmark(make_scenario(n = 5000, iterations = 25))
        μ_post = last(result.posteriors[:μ])
        τ_post = last(result.posteriors[:τ])
        @test isapprox(mean(μ_post), IIDNormalModel.TRUE_MEAN; atol = 0.1)
        @test isapprox(mean(τ_post), IIDNormalModel.TRUE_PRECISION; rtol = 0.2)
    end

    @testset "free energy decreases over iterations" begin
        result = IIDNormalModel.run_benchmark(make_scenario(n = 500, iterations = 15))
        fe = result.free_energy
        @test all(isfinite, fe)
        @test last(fe) < first(fe)
    end

    @testset "data generation is deterministic in the seed" begin
        a = IIDNormalModel.generate_data(Dict{String,Any}("n" => 100, "seed" => 42))
        b = IIDNormalModel.generate_data(Dict{String,Any}("n" => 100, "seed" => 42))
        c = IIDNormalModel.generate_data(Dict{String,Any}("n" => 100, "seed" => 7))
        @test a == b
        @test a != c
    end

    @testset "benchmark callbacks record phases" begin
        callbacks = RxInferBenchmarkCallbacks()
        IIDNormalModel.run_benchmark(make_scenario(n = 50, iterations = 3); callbacks)
        @test length(callbacks.before_model_creation_ts) == 1
        @test length(last(callbacks.before_iteration_ts)) == 3
    end

    @testset "tiny smoke scenario runs" begin
        result = IIDNormalModel.run_benchmark(make_scenario(n = 8, iterations = 2))
        @test last(result.posteriors[:μ]) isa UnivariateDistribution
    end
end
