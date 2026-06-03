using Test
using BSTSModel
using RxInfer
using Statistics

make_scenario(; n = 80, iterations = 10, period = 7, seed = 42) = Dict{String,Any}(
    "experiment_id" => "advanced/bsts",
    "model" => "bsts",
    "scenario_id" => "iterations=$(iterations)__n=$(n)__period=$(period)",
    "params" => Dict{String,Any}("n" => n, "period" => period,
                                 "iterations" => iterations, "seed" => seed),
)

@testset "BSTSModel" begin
    @testset "data generation is deterministic and shaped" begin
        params = Dict{String,Any}("n" => 60, "period" => 7, "seed" => 42)
        a = BSTSModel.generate_data(params)
        b = BSTSModel.generate_data(params)
        @test a.y == b.y && a.X == b.X
        @test length(a.y) == 60
        @test length(a.X) == 60
        @test all(x -> length(x) == 1, a.X) # one regressor (temperature)
        c = BSTSModel.generate_data(Dict{String,Any}("n" => 60, "period" => 7, "seed" => 7))
        @test a.y != c.y
    end

    @testset "inference runs and learns the regression coefficient" begin
        result = BSTSModel.run_benchmark(make_scenario(n = 100, iterations = 10))
        β_post = result.posteriors[:β]
        β_mean = first(mean(β_post))
        # true β is 2.0; generous tolerance — short series, many latent states
        @test isapprox(β_mean, BSTSModel.TRUE_BETA; atol = 1.0)
        @test isfinite(β_mean)
    end

    @testset "posterior states cover the series" begin
        n = 60
        result = BSTSModel.run_benchmark(make_scenario(; n, iterations = 5))
        z_post = result.posteriors[:z]
        @test length(z_post) == n
        @test all(z -> isfinite(first(mean(z))), z_post)
    end

    @testset "benchmark callbacks record phases" begin
        callbacks = RxInferBenchmarkCallbacks()
        BSTSModel.run_benchmark(make_scenario(n = 30, iterations = 2); callbacks)
        @test length(callbacks.before_model_creation_ts) == 1
        @test length(last(callbacks.before_iteration_ts)) == 2
    end

    @testset "tiny smoke scenario runs" begin
        result = BSTSModel.run_benchmark(make_scenario(n = 8, iterations = 2, period = 4))
        @test length(result.posteriors[:z]) == 8
    end
end
