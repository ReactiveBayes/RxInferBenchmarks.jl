using Test
using GaussianMixtureModel
using RxInfer
using Statistics
using LinearAlgebra

make_scenario(; dim = 1, k = 2, n = 500, seed = 42) = Dict{String,Any}(
    "experiment_id" => "problem_specific/gaussian_mixture",
    "model" => "gaussian_mixture",
    "scenario_id" => "dimension=$(dim)__n=$(n)__n_components=$(k)",
    "params" => Dict{String,Any}(
        "dimension" => dim, "n_components" => k, "n" => n, "seed" => seed,
    ),
)

@testset "GaussianMixtureModel" begin
    @testset "data generation is deterministic and dimension-aware" begin
        uni = GaussianMixtureModel.generate_data(
            Dict{String,Any}("n" => 200, "n_components" => 3, "dimension" => 1, "seed" => 42))
        @test uni == GaussianMixtureModel.generate_data(
            Dict{String,Any}("n" => 200, "n_components" => 3, "dimension" => 1, "seed" => 42))
        @test length(uni) == 200
        @test uni isa Vector{Float64}

        multi = GaussianMixtureModel.generate_data(
            Dict{String,Any}("n" => 100, "n_components" => 2, "dimension" => 5, "seed" => 42))
        @test length(multi) == 100
        @test all(v -> length(v) == 5, multi)
    end

    @testset "dimension=1 recovers both component means (up to permutation)" begin
        result = GaussianMixtureModel.run_benchmark(make_scenario(dim = 1, k = 2, n = 600))
        means = sort(mean.(last(result.posteriors[:m])))
        expected = sort(GaussianMixtureModel.univariate_means(2))
        @test isapprox(means[1], expected[1]; atol = 1.5)
        @test isapprox(means[2], expected[2]; atol = 1.5)
    end

    @testset "dimension=1 with k=3 separates the extremes" begin
        result = GaussianMixtureModel.run_benchmark(make_scenario(dim = 1, k = 3, n = 900))
        means = sort(mean.(last(result.posteriors[:m])))
        @test minimum(means) < -5.0
        @test maximum(means) > 5.0
    end

    @testset "dimension=5 recovers circle components (up to permutation)" begin
        result = GaussianMixtureModel.run_benchmark(make_scenario(dim = 5, k = 2, n = 400))
        posterior_means = mean.(last(result.posteriors[:m]))
        expected = GaussianMixtureModel.multivariate_means(2, 5)
        for target in expected
            @test minimum(norm(m - target) for m in posterior_means) < 10.0
        end
    end

    @testset "free energy decreases over iterations" begin
        result = GaussianMixtureModel.run_benchmark(make_scenario(dim = 1, n = 300))
        fe = result.free_energy
        @test all(isfinite, fe)
        @test last(fe) < first(fe)
    end

    @testset "invalid dimension is rejected" begin
        @test_throws ArgumentError GaussianMixtureModel.run_benchmark(make_scenario(dim = 0))
    end

    @testset "benchmark callbacks record phases (fixed iteration count)" begin
        callbacks = RxInferBenchmarkCallbacks()
        GaussianMixtureModel.run_benchmark(make_scenario(dim = 1, n = 50); callbacks)
        @test length(callbacks.before_model_creation_ts) == 1
        @test length(last(callbacks.before_iteration_ts)) == GaussianMixtureModel.ITERATIONS
    end

    @testset "tiny smoke scenario runs" begin
        result = GaussianMixtureModel.run_benchmark(make_scenario(dim = 1, n = 8))
        @test length(last(result.posteriors[:m])) == 2
    end
end
