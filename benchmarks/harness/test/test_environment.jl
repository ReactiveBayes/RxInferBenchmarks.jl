@testset "environment & fingerprint" begin
    deps = Dict("RxInfer" => "4.6.0", "ReactiveMP" => "5.7.1", "Distributions" => "0.25.107")

    @testset "fingerprint is deterministic and order-independent" begin
        a = Harness.compute_fingerprint("1.12.6", deps)
        b = Harness.compute_fingerprint("1.12.6",
            Dict("Distributions" => "0.25.107", "RxInfer" => "4.6.0", "ReactiveMP" => "5.7.1"))
        @test a == b
        @test length(a) == 64 # sha256 hex
        @test occursin(r"^[0-9a-f]+$", a)
    end

    @testset "fingerprint is sensitive to every input" begin
        base = Harness.compute_fingerprint("1.12.6", deps)
        @test base != Harness.compute_fingerprint("1.12.7", deps) # julia patch bump
        bumped = merge(deps, Dict("ReactiveMP" => "5.7.2"))
        @test base != Harness.compute_fingerprint("1.12.6", bumped) # dep bump
        added = merge(deps, Dict("NewDep" => "1.0.0"))
        @test base != Harness.compute_fingerprint("1.12.6", added) # dep added
    end

    @testset "short fingerprint" begin
        fp = Harness.compute_fingerprint("1.12.6", deps)
        @test Harness.short_fingerprint(fp) == fp[1:12]
    end

    @testset "julia_minor" begin
        @test Harness.julia_minor("1.12.6") == "1.12"
        @test Harness.julia_minor("1.10.0") == "1.10"
    end

    @testset "collect_dependencies parses manifests" begin
        mktempdir() do dir
            manifest = """
            julia_version = "1.12.6"
            manifest_format = "2.0"

            [[deps.RxInfer]]
            uuid = "86711068-29c9-4ff7-b620-ae75d7495b3d"
            version = "4.6.0"

            [[deps.Dates]]
            uuid = "ade2ca70-3891-5945-98fb-dc099432e06a"
            """
            write(joinpath(dir, "Manifest.toml"), manifest)
            deps = Harness.collect_dependencies([dir])
            @test deps["RxInfer"] == "4.6.0"
            @test deps["Dates"] == "stdlib" # stdlib without version
        end
    end

    @testset "collect_dependencies merges multiple projects" begin
        mktempdir() do a
            mktempdir() do b
                write(joinpath(a, "Manifest.toml"), """
                manifest_format = "2.0"
                [[deps.PkgA]]
                uuid = "00000000-0000-0000-0000-000000000001"
                version = "1.0.0"
                """)
                write(joinpath(b, "Manifest.toml"), """
                manifest_format = "2.0"
                [[deps.PkgB]]
                uuid = "00000000-0000-0000-0000-000000000002"
                version = "2.0.0"
                """)
                deps = Harness.collect_dependencies([a, b])
                @test deps["PkgA"] == "1.0.0"
                @test deps["PkgB"] == "2.0.0"
            end
        end
    end

    @testset "collect_dependencies rejects conflicting versions" begin
        mktempdir() do a
            mktempdir() do b
                write(joinpath(a, "Manifest.toml"), """
                manifest_format = "2.0"
                [[deps.PkgA]]
                uuid = "00000000-0000-0000-0000-000000000001"
                version = "1.0.0"
                """)
                write(joinpath(b, "Manifest.toml"), """
                manifest_format = "2.0"
                [[deps.PkgA]]
                uuid = "00000000-0000-0000-0000-000000000001"
                version = "1.5.0"
                """)
                @test_throws Harness.ConfigError Harness.collect_dependencies([a, b])
            end
        end
    end

    @testset "collect_environment assembles metadata" begin
        deps = Dict("RxInfer" => "4.6.0", "Other" => "1.0.0")
        env = Harness.collect_environment(;
            hardware_id = "github-actions-ubuntu",
            julia_version = "1.12.6",
            dependencies = deps)
        @test env["hardware_id"] == "github-actions-ubuntu"
        @test env["julia_version"] == "1.12.6"
        @test env["rxinfer_version"] == "4.6.0"
        @test env["dependencies"] == deps
        @test haskey(env, "os")
        @test haskey(env, "arch")
        @test haskey(env, "cpu_model")
        @test env["cpu_threads"] isa Integer
        @test env["total_memory_bytes"] isa Integer
    end

    @testset "collect_environment requires RxInfer in deps" begin
        @test_throws Harness.ConfigError Harness.collect_environment(;
            hardware_id = "x", julia_version = "1.12.6",
            dependencies = Dict("Other" => "1.0.0"))
    end
end
