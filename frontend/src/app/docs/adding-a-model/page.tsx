import type { Metadata } from "next";
import { CodeBlock, DocLead, DocSection, DocTitle } from "@/components/docs/Prose";

export const metadata: Metadata = { title: "Adding a model — RxInfer Benchmarks" };

export default function AddingAModelPage() {
  return (
    <article>
      <DocTitle>Adding a new model</DocTitle>
      <DocLead>
        A complete tutorial for contributing a new benchmark model. The whole process is five
        steps; the example adds a hypothetical <code>linear_regression</code> model. Development
        is test-driven — the correctness test comes first, and that is a hard rule.
      </DocLead>

      <DocSection title="Step 0 — Prerequisites">
        <p>
          Clone{" "}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href="https://github.com/ReactiveBayes/RxInferBenchmarks.jl"
            target="_blank"
            rel="noreferrer"
          >
            the repository
          </a>{" "}
          and check the tooling:
        </p>
        <CodeBlock>{`git clone git@github.com:ReactiveBayes/RxInferBenchmarks.jl.git
cd RxInferBenchmarks.jl
make help        # all available commands
julia --version  # >= 1.10`}</CodeBlock>
        <p>
          Prefer porting an existing model from{" "}
          <a className="text-primary underline-offset-4 hover:underline" href="https://examples.rxinfer.com" target="_blank" rel="noreferrer">
            examples.rxinfer.com
          </a>{" "}
          over inventing one — official examples are reviewed and idiomatic.
        </p>
      </DocSection>

      <DocSection title="Step 1 — Create a standalone Julia project">
        <CodeBlock label="models/linear_regression/Project.toml">{`name = "LinearRegressionModel"
uuid = "<run: julia -e 'using UUIDs; println(uuid4())'>"
version = "0.1.0"

[deps]
BenchmarkTools = "6e4b80f9-dd63-53aa-95a3-0cdb28fa8baf"
Distributions = "31c24e10-a181-5473-b8eb-7969acd0382f"
JSON3 = "0f8b85d8-7281-11e9-16c2-39a750bddbf1"
RxInfer = "86711068-29c9-4ff7-b620-ae75d7495b3d"
StableRNGs = "860ef19b-820b-49d6-a774-d7a799459cd3"

[extras]
Test = "8dfed614-e22c-5e08-85e1-65c5234f0b40"

[targets]
test = ["Test"]`}</CodeBlock>
        <p>
          Each model is isolated: its own <code>Project.toml</code> and committed{" "}
          <code>Manifest.toml</code> (created by <code>Pkg.instantiate()</code>). Benchmark CI
          updates dependencies to the latest released RxInfer before running and records the
          resolved versions in the environment fingerprint.
        </p>
      </DocSection>

      <DocSection title="Step 2 — Write the correctness test FIRST">
        <p>
          The test asserts the model is statistically correct on tiny data — it gates wiring, not
          speed:
        </p>
        <CodeBlock label="models/linear_regression/test/runtests.jl">{`using Test
using LinearRegressionModel
using RxInfer, Statistics

make_scenario(; n = 200, seed = 42) = Dict{String,Any}(
    "params" => Dict{String,Any}("n" => n, "iterations" => 10, "seed" => seed))

@testset "LinearRegressionModel" begin
    @testset "posterior recovers the true slope" begin
        result = LinearRegressionModel.run_benchmark(make_scenario(n = 1000))
        slope = mean(result.posteriors[:a])
        @test isapprox(slope, LinearRegressionModel.TRUE_SLOPE; atol = 0.1)
    end

    @testset "data generation is deterministic in the seed" begin
        a = LinearRegressionModel.generate_data(Dict("n" => 50, "seed" => 1))
        b = LinearRegressionModel.generate_data(Dict("n" => 50, "seed" => 1))
        @test a == b
    end

    @testset "benchmark callbacks record phases" begin
        callbacks = RxInferBenchmarkCallbacks()
        LinearRegressionModel.run_benchmark(make_scenario(n = 20); callbacks)
        @test length(callbacks.before_model_creation_ts) == 1
    end
end`}</CodeBlock>
        <p>Run it — it must fail first (the model does not exist yet), then pass after Step 3:</p>
        <CodeBlock>{`make test-model MODEL=linear_regression`}</CodeBlock>
      </DocSection>

      <DocSection title="Step 3 — Implement the uniform contract">
        <p>
          One module, one exported function: <code>run_benchmark(scenario; callbacks)</code>.
          Generate data deterministically from <code>scenario[&quot;params&quot;]</code>, build the
          model, call <code>infer</code> passing the callbacks through:
        </p>
        <CodeBlock label="models/linear_regression/src/LinearRegressionModel.jl">{`module LinearRegressionModel

using RxInfer, Distributions, StableRNGs

export run_benchmark

const TRUE_SLOPE = 2.5

@model function linear_regression(x, y)
    a ~ Normal(mean = 0.0, variance = 100.0)
    b ~ Normal(mean = 0.0, variance = 100.0)
    y .~ Normal(mean = a .* x .+ b, variance = 1.0)
end

function generate_data(params::AbstractDict)
    rng = StableRNG(get(params, "seed", 42))
    n = params["n"]
    x = collect(range(-2, 2; length = n))
    y = TRUE_SLOPE .* x .+ 1.0 .+ randn(rng, n)
    return (x = x, y = y)
end

function run_benchmark(scenario::AbstractDict; callbacks = nothing)
    params = scenario["params"]
    data = generate_data(params)
    return infer(
        model = linear_regression(),
        data = (x = data.x, y = data.y),
        iterations = get(params, "iterations", 10),
        callbacks = callbacks,
    )
end

end # module`}</CodeBlock>
        <p>
          Then copy the shared wrapper — it is byte-identical across all models and discovers your
          module from <code>Project.toml</code>:
        </p>
        <CodeBlock>{`cp models/coin_toss/benchmark.jl models/linear_regression/benchmark.jl
julia --project=models/linear_regression -e 'using Pkg; Pkg.instantiate()'`}</CodeBlock>
      </DocSection>

      <DocSection title="Step 4 — Register the experiment">
        <p>
          Add a block to <code>data/experiments.yml</code> (the matrix expands as a cartesian
          product into scenarios):
        </p>
        <CodeBlock label="data/experiments.yml">{`  - id: basic/linear_regression
    model: linear_regression
    category: Basic Examples
    title: Bayesian Linear Regression
    description: Conjugate linear regression with unknown slope and intercept.
    tags: [basic, regression]
    matrix:
      n: [1000, 10000]
      iterations: [10]`}</CodeBlock>
        <p>
          Regenerate the JSON mirrors and validate everything end-to-end with a smoke run (tiny
          sizes, one process, seconds):
        </p>
        <CodeBlock>{`make index
make bench-smoke`}</CodeBlock>
      </DocSection>

      <DocSection title="Step 5 — Open a pull request">
        <p>Check everything one more time and submit:</p>
        <CodeBlock>{`make test            # harness + all models + frontend
git checkout -b add-linear-regression
git add models/linear_regression data/experiments.yml data/*.json
git commit -m "Add linear_regression benchmark model"
git push -u origin add-linear-regression`}</CodeBlock>
        <p>
          CI runs the full suite on your PR. After merging, the next scheduled benchmark run
          measures your model on every tracked Julia version and hardware target, and it appears
          on this dashboard automatically — no frontend changes needed.
        </p>
      </DocSection>
    </article>
  );
}
