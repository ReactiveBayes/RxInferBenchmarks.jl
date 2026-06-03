import type { Metadata } from "next";
import { CodeBlock, DocLead, DocSection, DocTitle } from "@/components/docs/Prose";

export const metadata: Metadata = { title: "How it works — RxInfer Benchmarks" };

export default function HowItWorksPage() {
  return (
    <article>
      <DocTitle>How it works</DocTitle>
      <DocLead>
        The benchmark pipeline end-to-end: from Julia models to the charts on this dashboard.
        Everything lives in one public repository —{" "}
        <a
          className="text-primary underline-offset-4 hover:underline"
          href="https://github.com/ReactiveBayes/RxInferBenchmarks.jl"
          target="_blank"
          rel="noreferrer"
        >
          ReactiveBayes/RxInferBenchmarks.jl
        </a>
        . No database, no backend.
      </DocLead>

      <DocSection title="1. Models">
        <p>
          Each benchmarked model is a standalone Julia project under <code>models/</code>, ported
          from the official RxInfer examples. A model exposes exactly one function:
        </p>
        <CodeBlock>{`run_benchmark(scenario; callbacks = nothing)`}</CodeBlock>
        <p>
          It generates data deterministically from the scenario parameters (seeded RNG), builds the
          model, and calls <code>infer(...; callbacks)</code>. The callbacks instance —
          RxInfer&apos;s lightweight <code>RxInferBenchmarkCallbacks</code> — records
          model-creation, inference, and per-iteration timings without perturbing the run.
        </p>
      </DocSection>

      <DocSection title="2. Fresh processes, honest numbers">
        <p>
          Julia compiles code just-in-time, so cold-start cost can only be measured in a fresh
          process. The harness runs every scenario in <strong>3 separate Julia processes</strong>.
          Each process measures:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>time to first inference (package loading + compilation + first run),</li>
          <li>cold run (first complete inference in the process),</li>
          <li>warm runs via BenchmarkTools.jl — minimum/median time, <strong>allocation counts</strong>, bytes, GC time,</li>
          <li>per-phase timings from the benchmark callbacks.</li>
        </ul>
        <p>Three processes → three independent samples of every metric, so each number on this dashboard carries its variance.</p>
      </DocSection>

      <DocSection title="3. Environment fingerprints">
        <p>
          Results are keyed by a <strong>fingerprint</strong>: a hash of the Julia version plus the
          full resolved dependency manifest (including the RxInfer version). If a new run happens
          in an unchanged environment, its samples are <em>pooled</em> into the existing entry —
          3 samples become 6, the estimate tightens. A new chart point appears exactly when the
          environment changes. That is why the x-axis of every chart reads as &quot;what changed,
          and when&quot; — and every point can show the exact dependency diff against its
          predecessor.
        </p>
      </DocSection>

      <DocSection title="4. Continuous benchmarking">
        <p>
          Every Monday, CI first runs the entire test suite — <strong>if any test fails, no
          benchmarks are recorded</strong>. Then, for each tracked Julia version, it updates the
          model environments to the latest released RxInfer, runs all scenarios, and commits the
          merged results into <code>data/results/&lt;hardware&gt;/&lt;julia&gt;/</code>. Different
          hardware targets (GitHub Actions today, self-hosted boards like Raspberry Pi later) run
          on their own schedules — the data format never assumes aligned timelines.
        </p>
      </DocSection>

      <DocSection title="5. This dashboard">
        <p>
          A fully static Next.js site on GitHub Pages. It fetches the JSON result files at runtime
          straight from the repository, so new benchmark data appears here without a redeploy.
          Every chart displays variance (shaded min–max bands, ± std), regressions are flagged
          against the previous environment, and the comparison views overlay hardware targets and
          Julia versions on their true, unaligned timelines.
        </p>
      </DocSection>
    </article>
  );
}
