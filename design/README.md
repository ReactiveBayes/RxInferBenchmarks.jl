# Design Documents

> **These are living documents.** They describe the *current* design of the repository, not a
> frozen specification. They are expected to change as the project evolves. When you change a
> design decision in code, update the corresponding document **in the same PR**. If a document
> contradicts the code, the document is wrong — fix it.

A condensed summary of everything here lives in [`../IDEA.md`](../IDEA.md).

| Document                             | Covers                                                       |
| ------------------------------------ | ------------------------------------------------------------ |
| [architecture.md](architecture.md)   | Big picture: repository layout, data flow, CI topology       |
| [benchmarks.md](benchmarks.md)       | Harness design, model contract, measurement methodology      |
| [data.md](data.md)                   | Data schemas: results JSON, fingerprints, pooling, YAML files |
| [frontend.md](frontend.md)           | Dashboard: stack, routing, theme, views, chart inventory     |
| [testing.md](testing.md)             | TDD rules for Julia and TypeScript                           |

## Conventions for these documents

- Each document starts with the same "living document" banner as above.
- Describe *what* and *why*; keep *how* (exact code) in the code itself.
- When a decision is consciously deferred or uncertain, mark it with **⚠️ Open question**.
- Decisions overturned later should be briefly noted ("previously X, changed to Y because Z")
  when the history aids understanding; otherwise just rewrite.
