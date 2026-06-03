@testset "scenario expansion" begin
    defaults = Dict("processes" => 3, "seed" => 42)

    @testset "matrix expands as cartesian product" begin
        exp = Dict{String,Any}(
            "id" => "basic/coin_toss", "model" => "coin_toss",
            "matrix" => Dict("n" => [1000, 10000], "iterations" => [10, 20]))
        scenarios = Harness.expand_scenarios(exp, defaults)
        @test length(scenarios) == 4
        @test all(s["experiment_id"] == "basic/coin_toss" for s in scenarios)
        @test all(s["model"] == "coin_toss" for s in scenarios)
        @test all(s["params"]["seed"] == 42 for s in scenarios) # default seed injected
        ns = sort(unique(s["params"]["n"] for s in scenarios))
        @test ns == [1000, 10000]
        # ids unique and deterministic
        ids = [s["scenario_id"] for s in scenarios]
        @test allunique(ids)
    end

    @testset "explicit scenarios pass through" begin
        exp = Dict{String,Any}(
            "id" => "basic/kalman", "model" => "kalman",
            "scenarios" => [
                Dict{String,Any}("params" => Dict{String,Any}("mode" => "filtering", "n" => 1000)),
                Dict{String,Any}("params" => Dict{String,Any}("mode" => "smoothing", "n" => 1000, "iterations" => 10)),
            ])
        scenarios = Harness.expand_scenarios(exp, defaults)
        @test length(scenarios) == 2
        @test scenarios[1]["params"]["mode"] == "filtering"
        @test scenarios[2]["params"]["iterations"] == 10
        @test allunique([s["scenario_id"] for s in scenarios])
    end

    @testset "explicit seed in params wins over default" begin
        exp = Dict{String,Any}(
            "id" => "x/y", "model" => "y",
            "scenarios" => [Dict{String,Any}("params" => Dict{String,Any}("n" => 5, "seed" => 7))])
        scenarios = Harness.expand_scenarios(exp, defaults)
        @test scenarios[1]["params"]["seed"] == 7
    end

    @testset "scenario_id deterministic and order-independent" begin
        a = Harness.scenario_id(Dict("n" => 1000, "iterations" => 10, "seed" => 42))
        b = Harness.scenario_id(Dict("iterations" => 10, "seed" => 42, "n" => 1000))
        @test a == b
        @test a == "iterations=10__n=1000__seed=42"
    end

    @testset "scenario_id is filesystem/url safe" begin
        id = Harness.scenario_id(Dict("mode" => "filtering smooth", "n" => 100))
        @test !occursin(" ", id)
        @test !occursin("/", id)
        @test occursin("mode=filtering-smooth", id)
    end

    @testset "smoke override shrinks scenarios" begin
        exp = Dict{String,Any}(
            "id" => "basic/coin_toss", "model" => "coin_toss",
            "matrix" => Dict("n" => [1000, 10000], "iterations" => [10, 20]))
        scenarios = Harness.expand_scenarios(exp, defaults; smoke = true)
        @test length(scenarios) == 1 # only first value of each axis
        @test scenarios[1]["params"]["n"] <= Harness.SMOKE_MAX_SIZE
        @test scenarios[1]["params"]["iterations"] <= 2
    end
end
