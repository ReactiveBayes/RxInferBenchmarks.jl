const FIXTURES = joinpath(@__DIR__, "fixtures")
const REPO_ROOT = normpath(joinpath(@__DIR__, "..", "..", ".."))

@testset "config loading" begin
    @testset "experiments: valid fixture parses" begin
        cfg = Harness.load_experiments(joinpath(FIXTURES, "experiments_valid.yml"))
        @test cfg["version"] == 1
        @test cfg["defaults"]["processes"] == 3
        @test cfg["defaults"]["seed"] == 42
        @test length(cfg["experiments"]) == 2
        @test cfg["experiments"][1]["id"] == "basic/coin_toss"
        @test cfg["experiments"][1]["model"] == "coin_toss"
    end

    @testset "experiments: real repo file parses" begin
        cfg = Harness.load_experiments(joinpath(REPO_ROOT, "data", "experiments.yml"))
        @test length(cfg["experiments"]) >= 4
        ids = [e["id"] for e in cfg["experiments"]]
        @test "basic/coin_toss" in ids
        @test allunique(ids)
    end

    @testset "experiments: duplicate ids rejected" begin
        @test_throws Harness.ConfigError Harness.load_experiments(
            joinpath(FIXTURES, "experiments_duplicate_ids.yml"))
    end

    @testset "experiments: missing model rejected" begin
        @test_throws Harness.ConfigError Harness.load_experiments(
            joinpath(FIXTURES, "experiments_missing_model.yml"))
    end

    @testset "experiments: neither matrix nor scenarios rejected" begin
        @test_throws Harness.ConfigError Harness.load_experiments(
            joinpath(FIXTURES, "experiments_no_scenarios.yml"))
    end

    @testset "experiments: model dir validation" begin
        # validates model dirs exist when models_dir is given
        mktempdir() do dir
            mkdir(joinpath(dir, "coin_toss"))
            mkdir(joinpath(dir, "kalman"))
            cfg = Harness.load_experiments(
                joinpath(FIXTURES, "experiments_valid.yml"); models_dir = dir)
            @test length(cfg["experiments"]) == 2
        end
        mktempdir() do dir # empty dir: no model projects
            @test_throws Harness.ConfigError Harness.load_experiments(
                joinpath(FIXTURES, "experiments_valid.yml"); models_dir = dir)
        end
    end

    @testset "hardware: valid fixture parses to registry" begin
        hw = Harness.load_hardware(joinpath(FIXTURES, "hardware_valid.yml"))
        @test haskey(hw, "github-actions-ubuntu")
        @test haskey(hw, "raspberry-pi-5")
        @test hw["github-actions-ubuntu"]["label"] == "GitHub Actions (ubuntu-latest)"
    end

    @testset "hardware: real repo file parses" begin
        hw = Harness.load_hardware(joinpath(REPO_ROOT, "data", "hardware.yml"))
        @test haskey(hw, "github-actions-ubuntu")
        @test haskey(hw, "rpi5-8gb")
        @test hw["rpi5-8gb"]["label"] == "Raspberry Pi 5 (8GB)"
        @test hw["rpi5-8gb"]["arch"] == "aarch64"
    end

    @testset "hardware: duplicate ids rejected" begin
        @test_throws Harness.ConfigError Harness.load_hardware(
            joinpath(FIXTURES, "hardware_duplicate_ids.yml"))
    end

    @testset "metrics: real repo file parses" begin
        metrics = Harness.load_metrics(joinpath(REPO_ROOT, "data", "metrics.yml"))
        ids = [m["id"] for m in metrics]
        @test "allocations" in ids
        @test "warm_run_min_ms" in ids
        @test all(haskey(m, "lower_is_better") for m in metrics)
    end
end
