using Test
using GaussianMixtureModel
using RxInfer
using Statistics

make_scenario(; n = 500, iterations = 25, seed = 42) = Dict{String,Any}(
    "experiment_id" => "problem_specific/gaussian_mixture",
    "model" => "gaussian_mixture",
    "scenario_id" => "iterations=$(iterations)__k=2__n=$(n)",
    "params" => Dict{String,Any}("n" => n, "k" => 2, "iterations" => iterations, "seed" => seed),
)

@testset "GaussianMixtureModel" begin
    @testset "data generation is deterministic and bimodal" begin
        params = Dict{String,Any}("n" => 400, "seed" => 42)
        a = GaussianMixtureModel.generate_data(params)
        b = GaussianMixtureModel.generate_data(params)
        @test a == b
        @test length(a) == 400
        # two well-separated modes at ±10
        @test any(<(-5), a) && any(>(5), a)
    end

    @testset "posterior recovers both component means (up to permutation)" begin
        result = GaussianMixtureModel.run_benchmark(make_scenario(n = 600))
        m_post = last(result.posteriors[:m])
        means = sort(mean.(m_post))
        @test isapprox(means[1], GaussianMixtureModel.TRUE_MEANS[1]; atol = 1.5)
        @test isapprox(means[2], GaussianMixtureModel.TRUE_MEANS[2]; atol = 1.5)
    end

    @testset "free energy decreases over iterations" begin
        result = GaussianMixtureModel.run_benchmark(make_scenario(n = 300, iterations = 15))
        fe = result.free_energy
        @test all(isfinite, fe)
        @test last(fe) < first(fe)
    end

    @testset "benchmark callbacks record phases" begin
        callbacks = RxInferBenchmarkCallbacks()
        GaussianMixtureModel.run_benchmark(make_scenario(n = 50, iterations = 3); callbacks)
        @test length(callbacks.before_model_creation_ts) == 1
        @test length(last(callbacks.before_iteration_ts)) == 3
    end

    @testset "tiny smoke scenario runs" begin
        result = GaussianMixtureModel.run_benchmark(make_scenario(n = 8, iterations = 2))
        @test length(last(result.posteriors[:m])) == 2
    end
end
