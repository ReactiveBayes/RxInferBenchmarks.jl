using Test
using GaussianMixtureModel
using RxInfer
using Statistics
using LinearAlgebra

make_scenario(; type = "univariate", k = 2, n = 500, iterations = 25, seed = 42) = Dict{String,Any}(
    "experiment_id" => "problem_specific/gaussian_mixture",
    "model" => "gaussian_mixture",
    "scenario_id" => "iterations=$(iterations)__n=$(n)__n_components=$(k)__type=$(type)",
    "params" => Dict{String,Any}(
        "type" => type, "n_components" => k, "n" => n,
        "iterations" => iterations, "seed" => seed,
    ),
)

@testset "GaussianMixtureModel" begin
    @testset "data generation is deterministic and shaped" begin
        uni = GaussianMixtureModel.generate_data(
            Dict{String,Any}("n" => 200, "n_components" => 3, "type" => "univariate", "seed" => 42))
        @test uni == GaussianMixtureModel.generate_data(
            Dict{String,Any}("n" => 200, "n_components" => 3, "type" => "univariate", "seed" => 42))
        @test length(uni) == 200
        @test uni isa Vector{Float64}

        multi = GaussianMixtureModel.generate_data(
            Dict{String,Any}("n" => 100, "n_components" => 2, "type" => "multivariate", "seed" => 42))
        @test length(multi) == 100
        @test all(v -> length(v) == 2, multi)
    end

    @testset "univariate k=2 recovers both component means (up to permutation)" begin
        result = GaussianMixtureModel.run_benchmark(make_scenario(k = 2, n = 600))
        means = sort(mean.(last(result.posteriors[:m])))
        expected = sort(GaussianMixtureModel.univariate_means(2))
        @test isapprox(means[1], expected[1]; atol = 1.5)
        @test isapprox(means[2], expected[2]; atol = 1.5)
    end

    @testset "univariate k=3 runs and separates the extremes" begin
        result = GaussianMixtureModel.run_benchmark(make_scenario(k = 3, n = 900))
        means = sort(mean.(last(result.posteriors[:m])))
        @test minimum(means) < -5.0
        @test maximum(means) > 5.0
    end

    @testset "multivariate k=2 recovers circle components (up to permutation)" begin
        result = GaussianMixtureModel.run_benchmark(
            make_scenario(type = "multivariate", k = 2, n = 400, iterations = 25))
        posterior_means = mean.(last(result.posteriors[:m]))
        expected = GaussianMixtureModel.multivariate_means(2)
        # each true mean is close to some posterior mean
        for target in expected
            @test minimum(norm(m - target) for m in posterior_means) < 10.0
        end
    end

    @testset "free energy decreases over iterations" begin
        result = GaussianMixtureModel.run_benchmark(make_scenario(n = 300, iterations = 15))
        fe = result.free_energy
        @test all(isfinite, fe)
        @test last(fe) < first(fe)
    end

    @testset "unknown type is rejected" begin
        @test_throws ArgumentError GaussianMixtureModel.run_benchmark(
            make_scenario(type = "nonsense"))
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
