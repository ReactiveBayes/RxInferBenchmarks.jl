function fixture_environment(; julia = "1.12.6")
    Dict{String,Any}(
        "hardware_id" => "github-actions-ubuntu",
        "julia_version" => julia,
        "rxinfer_version" => "4.6.0",
        "os" => "linux", "arch" => "x86_64",
        "cpu_model" => "Test CPU", "cpu_threads" => 4,
        "total_memory_bytes" => 16_000_000_000,
        "dependencies" => Dict{String,Any}("RxInfer" => "4.6.0"))
end

function fixture_scenario_result(; samples = 3)
    Dict{String,Any}(
        "scenario_id" => "iterations=10__n=1000__seed=42",
        "params" => Dict{String,Any}("n" => 1000, "iterations" => 10, "seed" => 42),
        "status" => "ok",
        "samples" => Dict{String,Any}(
            "cold_run_ms" => fill(180.0, samples),
            "warm_run_min_ms" => fill(1.5, samples),
            "allocations" => fill(412035, samples)))
end

function fixture_result(; fingerprint = "abcdef123456", julia = "1.12.6",
                        timestamp = "2026-06-01T03:12:00Z", commit = "a1b2c3d",
                        samples = 3)
    Dict{String,Any}(
        "schema_version" => Harness.SCHEMA_VERSION,
        "fingerprint" => fingerprint,
        "hardware_id" => "github-actions-ubuntu",
        "environment" => fixture_environment(; julia),
        "runs" => [Dict{String,Any}(
            "timestamp_utc" => timestamp, "commit" => commit, "processes" => samples)],
        "first_seen_utc" => timestamp,
        "last_seen_utc" => timestamp,
        "experiments" => [Dict{String,Any}(
            "experiment_id" => "basic/coin_toss",
            "scenarios" => [fixture_scenario_result(; samples)])])
end

@testset "result assembly & validation" begin
    @testset "assemble_result builds a valid document" begin
        env = fixture_environment()
        scenarios_by_experiment = Dict(
            "basic/coin_toss" => [fixture_scenario_result()])
        doc = Harness.assemble_result(;
            environment = env,
            fingerprint = "abc123",
            timestamp_utc = "2026-06-01T03:12:00Z",
            commit = "a1b2c3d",
            processes = 3,
            scenarios_by_experiment)
        @test doc["schema_version"] == Harness.SCHEMA_VERSION
        @test doc["fingerprint"] == "abc123"
        @test doc["hardware_id"] == "github-actions-ubuntu"
        @test doc["first_seen_utc"] == "2026-06-01T03:12:00Z"
        @test doc["last_seen_utc"] == "2026-06-01T03:12:00Z"
        @test length(doc["runs"]) == 1
        @test doc["runs"][1]["commit"] == "a1b2c3d"
        @test length(doc["experiments"]) == 1
        @test Harness.validate_result(doc)
    end

    @testset "validate_result rejects broken documents" begin
        @test Harness.validate_result(fixture_result())
        broken = fixture_result(); delete!(broken, "fingerprint")
        @test_throws Harness.ValidationError Harness.validate_result(broken)
        broken = fixture_result(); delete!(broken, "schema_version")
        @test_throws Harness.ValidationError Harness.validate_result(broken)
        broken = fixture_result()
        broken["experiments"][1]["scenarios"][1]["samples"]["cold_run_ms"] = "not a number"
        @test_throws Harness.ValidationError Harness.validate_result(broken)
        broken = fixture_result()
        delete!(broken["experiments"][1]["scenarios"][1], "scenario_id")
        @test_throws Harness.ValidationError Harness.validate_result(broken)
        broken = fixture_result()
        # sample arrays must have equal lengths within a scenario
        broken["experiments"][1]["scenarios"][1]["samples"]["cold_run_ms"] = [1.0]
        @test_throws Harness.ValidationError Harness.validate_result(broken)
    end

    @testset "result_relpath layout" begin
        relpath = Harness.result_relpath("github-actions-ubuntu", "1.12.6", "abcdef1234567890")
        @test relpath == joinpath("github-actions-ubuntu", "1.12", "abcdef123456.json")
    end

    @testset "json round-trip" begin
        mktempdir() do dir
            doc = fixture_result()
            path = joinpath(dir, "result.json")
            Harness.write_json(path, doc)
            @test isfile(path)
            loaded = Harness.read_json(path)
            @test loaded["fingerprint"] == doc["fingerprint"]
            @test loaded["experiments"][1]["scenarios"][1]["samples"]["allocations"] == [412035, 412035, 412035]
        end
    end
end
