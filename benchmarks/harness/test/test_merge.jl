@testset "merge (sample pooling)" begin
    @testset "same fingerprint pools samples 3+3=6" begin
        existing = fixture_result(; timestamp = "2026-06-01T03:12:00Z", commit = "aaaaaaa")
        incoming = fixture_result(; timestamp = "2026-06-08T03:11:00Z", commit = "bbbbbbb")
        merged = Harness.merge_results(existing, incoming)

        @test length(merged["runs"]) == 2
        @test merged["first_seen_utc"] == "2026-06-01T03:12:00Z"
        @test merged["last_seen_utc"] == "2026-06-08T03:11:00Z"

        samples = merged["experiments"][1]["scenarios"][1]["samples"]
        @test length(samples["cold_run_ms"]) == 6
        @test length(samples["warm_run_min_ms"]) == 6
        @test length(samples["allocations"]) == 6
        @test Harness.validate_result(merged)
    end

    @testset "merge is associative over three runs (3+3+3=9)" begin
        r1 = fixture_result(; timestamp = "2026-06-01T00:00:00Z", commit = "aaaaaaa")
        r2 = fixture_result(; timestamp = "2026-06-08T00:00:00Z", commit = "bbbbbbb")
        r3 = fixture_result(; timestamp = "2026-06-15T00:00:00Z", commit = "ccccccc")
        merged = Harness.merge_results(Harness.merge_results(r1, r2), r3)
        @test length(merged["runs"]) == 3
        @test length(merged["experiments"][1]["scenarios"][1]["samples"]["cold_run_ms"]) == 9
        @test merged["last_seen_utc"] == "2026-06-15T00:00:00Z"
    end

    @testset "different fingerprints refuse to merge" begin
        existing = fixture_result(; fingerprint = "aaaa00000000")
        incoming = fixture_result(; fingerprint = "bbbb00000000")
        @test_throws Harness.MergeError Harness.merge_results(existing, incoming)
    end

    @testset "new scenarios/experiments are added on merge" begin
        existing = fixture_result()
        incoming = fixture_result(; timestamp = "2026-06-08T00:00:00Z")
        extra_scenario = fixture_scenario_result()
        extra_scenario["scenario_id"] = "iterations=10__n=99999__seed=42"
        push!(incoming["experiments"][1]["scenarios"], extra_scenario)
        push!(incoming["experiments"], Dict{String,Any}(
            "experiment_id" => "basic/kalman",
            "scenarios" => [fixture_scenario_result()]))

        merged = Harness.merge_results(existing, incoming)
        coin = only(filter(e -> e["experiment_id"] == "basic/coin_toss", merged["experiments"]))
        @test length(coin["scenarios"]) == 2
        # pre-existing scenario pooled, new scenario starts fresh
        pooled = only(filter(s -> s["scenario_id"] == "iterations=10__n=1000__seed=42", coin["scenarios"]))
        @test length(pooled["samples"]["cold_run_ms"]) == 6
        fresh = only(filter(s -> s["scenario_id"] == "iterations=10__n=99999__seed=42", coin["scenarios"]))
        @test length(fresh["samples"]["cold_run_ms"]) == 3
        @test any(e -> e["experiment_id"] == "basic/kalman", merged["experiments"])
    end

    @testset "merge does not mutate inputs" begin
        existing = fixture_result()
        incoming = fixture_result(; timestamp = "2026-06-08T00:00:00Z")
        n_before = length(existing["experiments"][1]["scenarios"][1]["samples"]["cold_run_ms"])
        Harness.merge_results(existing, incoming)
        @test length(existing["experiments"][1]["scenarios"][1]["samples"]["cold_run_ms"]) == n_before
        @test length(existing["runs"]) == 1
    end

    @testset "error status: ok overrides previous error" begin
        existing = fixture_result()
        existing["experiments"][1]["scenarios"][1]["status"] = "error"
        existing["experiments"][1]["scenarios"][1]["error"] = "boom"
        empty!(existing["experiments"][1]["scenarios"][1]["samples"])
        incoming = fixture_result(; timestamp = "2026-06-08T00:00:00Z")
        merged = Harness.merge_results(existing, incoming)
        scenario = merged["experiments"][1]["scenarios"][1]
        @test scenario["status"] == "ok"
        @test length(scenario["samples"]["cold_run_ms"]) == 3
        @test !haskey(scenario, "error")
    end
end
