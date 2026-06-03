using Test
using Harness

@testset "Harness" begin
    include("test_config.jl")
    include("test_scenarios.jl")
    include("test_environment.jl")
    include("test_results.jl")
    include("test_merge.jl")
    include("test_index.jl")
    if get(ENV, "RXBENCH_SKIP_SMOKE", "0") != "1"
        include("test_smoke.jl")
    end
end
