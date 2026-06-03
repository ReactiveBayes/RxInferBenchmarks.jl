@testset "index building" begin
    hardware_registry = Dict(
        "github-actions-ubuntu" => Dict{String,Any}(
            "id" => "github-actions-ubuntu", "label" => "GitHub Actions (ubuntu-latest)"),
        "raspberry-pi-5" => Dict{String,Any}(
            "id" => "raspberry-pi-5", "label" => "Raspberry Pi 5"))

    function write_fixture_results(dir)
        # two fingerprints on gha/1.12, one on gha/1.10, one on rpi/1.12 — unaligned timelines
        for (hw, jl, fp, first, last, runs, samples) in [
            ("github-actions-ubuntu", "1.12.6", "aaaa00000001", "2026-06-01T00:00:00Z", "2026-06-08T00:00:00Z", 2, 6),
            ("github-actions-ubuntu", "1.12.6", "aaaa00000002", "2026-06-15T00:00:00Z", "2026-06-15T00:00:00Z", 1, 3),
            ("github-actions-ubuntu", "1.10.9", "bbbb00000001", "2026-06-01T00:10:00Z", "2026-06-01T00:10:00Z", 1, 3),
            ("raspberry-pi-5",        "1.12.6", "cccc00000001", "2026-06-20T00:00:00Z", "2026-06-20T00:00:00Z", 1, 3),
        ]
            doc = fixture_result(; fingerprint = fp, julia = jl,
                                 timestamp = first, samples = 3)
            doc["hardware_id"] = hw
            doc["environment"]["hardware_id"] = hw
            doc["last_seen_utc"] = last
            if runs == 2
                push!(doc["runs"], Dict{String,Any}(
                    "timestamp_utc" => last, "commit" => "fffffff", "processes" => 3))
                s = doc["experiments"][1]["scenarios"][1]["samples"]
                for k in keys(s)
                    append!(s[k], s[k])
                end
            end
            path = joinpath(dir, Harness.result_relpath(hw, jl, fp))
            Harness.write_json(path, doc)
        end
    end

    @testset "build_index aggregates result files" begin
        mktempdir() do dir
            write_fixture_results(dir)
            index = Harness.build_index(dir; hardware_registry)
            @test index["schema_version"] == Harness.SCHEMA_VERSION
            @test length(index["hardware"]) == 2

            gha = only(filter(h -> h["id"] == "github-actions-ubuntu", index["hardware"]))
            @test gha["label"] == "GitHub Actions (ubuntu-latest)"
            @test sort(gha["julia_versions"]) == ["1.10", "1.12"]
            @test length(gha["entries"]) == 3

            # entries sorted by first_seen
            entries_112 = filter(e -> Harness.julia_minor(e["julia_version"]) == "1.12", gha["entries"])
            @test [e["fingerprint"] for e in entries_112] == ["aaaa00000001", "aaaa00000002"]
            e1 = entries_112[1]
            @test e1["file"] == "github-actions-ubuntu/1.12/aaaa00000001.json"
            @test e1["run_count"] == 2
            @test e1["sample_count"] == 6
            @test e1["rxinfer_version"] == "4.6.0"

            rpi = only(filter(h -> h["id"] == "raspberry-pi-5", index["hardware"]))
            @test length(rpi["entries"]) == 1
        end
    end

    @testset "build_index is idempotent / deterministic" begin
        mktempdir() do dir
            write_fixture_results(dir)
            a = Harness.build_index(dir; hardware_registry)
            b = Harness.build_index(dir; hardware_registry)
            # generated_utc is injected by the caller, not build_index, so full equality holds
            @test a == b
        end
    end

    @testset "build_index tolerates empty/missing folders" begin
        mktempdir() do dir
            index = Harness.build_index(dir; hardware_registry)
            @test index["hardware"] == []
        end
    end

    @testset "build_index rejects unknown hardware folder" begin
        mktempdir() do dir
            doc = fixture_result()
            doc["hardware_id"] = "unknown-machine"
            path = joinpath(dir, Harness.result_relpath("unknown-machine", "1.12.6", doc["fingerprint"]))
            Harness.write_json(path, doc)
            @test_throws Harness.ConfigError Harness.build_index(dir; hardware_registry)
        end
    end

    @testset "yaml mirrors convert to json" begin
        mktempdir() do dir
            yml = joinpath(dir, "metrics.yml")
            write(yml, """
            version: 1
            metrics:
              - { id: cold_run_ms, label: Cold run, unit: ms, lower_is_better: true }
            """)
            out = joinpath(dir, "metrics.json")
            Harness.yaml_to_json(yml, out)
            data = Harness.read_json(out)
            @test data["version"] == 1
            @test data["metrics"][1]["id"] == "cold_run_ms"
            @test data["metrics"][1]["lower_is_better"] == true
        end
    end
end
