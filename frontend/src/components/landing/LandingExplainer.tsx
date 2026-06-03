import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { GitHubIcon } from "@/components/icons/GitHubIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LandingExplainer() {
  return (
    <section className="space-y-6">
      <div className="rounded-xl border p-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          How fast is RxInfer.jl — and is it getting faster?
        </h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          <a className="font-medium text-primary underline-offset-4 hover:underline" href="https://github.com/ReactiveBayes/RxInfer.jl" target="_blank" rel="noreferrer">
            RxInfer.jl
          </a>{" "}
          is a Julia package for fast Bayesian inference on factor graphs using reactive
          message passing. This dashboard tracks its performance over time — compilation,
          model creation, cold and warm inference, per-iteration cost, and memory
          allocations — across representative models, multiple Julia versions, and
          multiple hardware targets.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <a href="https://docs.rxinfer.com" target="_blank" rel="noreferrer">
              <BookOpen /> RxInfer documentation
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="https://github.com/ReactiveBayes/RxInfer.jl" target="_blank" rel="noreferrer">
              <GitHubIcon /> RxInfer on GitHub
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Honest cold starts</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Every scenario runs in fresh Julia processes — compilation and first-run
            cost are measured for real, with variance from repeated runs shown on
            every chart.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Environment fingerprints</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            A chart point appears exactly when the environment changes — a new Julia,
            RxInfer, or dependency version. Unchanged environments pool their samples
            instead of cluttering the timeline.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What changed?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Each point records the full dependency manifest, so a regression can be
            traced to the exact package versions that changed between two points.
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Button asChild variant="ghost" size="sm">
          <Link href="/docs/how-it-works/">
            How it works <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/docs/adding-a-model/">
            Add your own model <ArrowRight />
          </Link>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Pick a benchmark from the sidebar to see its full history, or scan the overview below.
      </p>
    </section>
  );
}
