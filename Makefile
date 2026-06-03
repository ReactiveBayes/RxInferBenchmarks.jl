# RxInferBenchmarks.jl — run `make help` for an overview.

JULIA   ?= julia --startup-file=no
MODELS  := $(notdir $(wildcard models/*))
HARNESS := benchmarks/harness
NPM     := npm --prefix frontend

.DEFAULT_GOAL := help

# ---------------------------------------------------------------- help

.PHONY: help
help: ## Show this help
	@echo "RxInferBenchmarks.jl"
	@echo
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-24s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "Variables: MODEL=<name> (one of: $(MODELS))"

# ---------------------------------------------------------------- setup

.PHONY: instantiate
instantiate: ## Pkg.instantiate() for harness + all model projects
	$(JULIA) --project=$(HARNESS) -e 'using Pkg; Pkg.instantiate()'
	@for m in $(MODELS); do \
		echo "==> models/$$m"; \
		$(JULIA) --project=models/$$m -e 'using Pkg; Pkg.instantiate()' || exit 1; \
	done

.PHONY: frontend-install
frontend-install: ## npm ci in frontend/
	$(NPM) ci

# ---------------------------------------------------------------- tests

.PHONY: test
test: test-harness test-models test-frontend ## Run ALL tests (harness + models + frontend)

.PHONY: test-harness
test-harness: ## Harness unit tests (fast, no RxInfer)
	$(JULIA) --project=$(HARNESS) -e 'using Pkg; Pkg.test()'

.PHONY: test-models
test-models: ## Every model's correctness tests
	@for m in $(MODELS); do \
		echo "==> testing models/$$m"; \
		$(JULIA) --project=models/$$m -e 'using Pkg; Pkg.test()' || exit 1; \
	done

.PHONY: test-model
test-model: ## One model's tests, e.g. make test-model MODEL=coin_toss
	@test -n "$(MODEL)" || { echo "usage: make test-model MODEL=<name>"; exit 1; }
	$(JULIA) --project=models/$(MODEL) -e 'using Pkg; Pkg.test()'

.PHONY: test-frontend
test-frontend: ## Frontend lint + typecheck + vitest suite
	$(NPM) run lint
	$(NPM) run typecheck
	$(NPM) run test

# ---------------------------------------------------------------- benchmarks

.PHONY: bench
bench: ## Full local benchmark run — FAKE seed data into data/seed/ (never the public dataset)
	$(JULIA) --project=$(HARNESS) $(HARNESS)/bin/run_benchmarks.jl
	$(MAKE) seed-index

.PHONY: bench-smoke
bench-smoke: ## Tiny end-to-end benchmark run into a temp dir (~seconds)
	RXBENCH_SMOKE=1 $(JULIA) --project=$(HARNESS) $(HARNESS)/bin/run_benchmarks.jl

.PHONY: bench-quick
bench-quick: ## Real scenarios, minimal sampling — fast local UI seed data into data/seed/ (~minutes)
	RXBENCH_QUICK=1 $(JULIA) --project=$(HARNESS) $(HARNESS)/bin/run_benchmarks.jl
	$(MAKE) seed-index

.PHONY: bench-model
bench-model: ## Benchmark a single model into data/seed/, e.g. make bench-model MODEL=coin_toss
	@test -n "$(MODEL)" || { echo "usage: make bench-model MODEL=<name>"; exit 1; }
	$(JULIA) --project=$(HARNESS) $(HARNESS)/bin/run_benchmarks.jl --model $(MODEL)
	$(MAKE) seed-index

.PHONY: index
index: ## Refresh data/*.json mirrors + rebuild the seed tree (leaves the CI-owned data/results/index.json untouched)
	$(JULIA) --project=$(HARNESS) $(HARNESS)/bin/build_index.jl --mirrors-only
	$(MAKE) seed-index

.PHONY: seed-index
seed-index: ## Rebuild the FAKE seed tree under data/seed/ (mirrors + results index)
	$(JULIA) --project=$(HARNESS) $(HARNESS)/bin/build_index.jl --out data/seed

# ---------------------------------------------------------------- frontend

.PHONY: frontend-dev
frontend-dev: ## Dashboard dev server against the FAKE seed data in data/seed/ (http://localhost:3000)
	$(NPM) run dev

.PHONY: frontend-build
frontend-build: ## Static export build into frontend/out/
	$(NPM) run build

.PHONY: frontend-check-static
frontend-check-static: ## Verify the build is fully static (no dynamic pages)
	$(NPM) run check-static

.PHONY: frontend-preview
frontend-preview: ## Serve the static export locally
	$(NPM) run preview

# ---------------------------------------------------------------- misc

.PHONY: clean
clean: ## Remove build artifacts
	rm -rf frontend/out frontend/.next
