// Dependency diff between two environment fingerprints — answers "what changed?"
// on the dashboard (design/frontend.md).

export interface DependencyDiff {
  added: { name: string; version: string }[];
  removed: { name: string; version: string }[];
  changed: { name: string; from: string; to: string }[];
  unchangedCount: number;
  hasChanges: boolean;
}

export function diffDependencies(
  previous: Record<string, string> | undefined,
  current: Record<string, string>,
): DependencyDiff {
  const prev = previous ?? {};
  const added: DependencyDiff["added"] = [];
  const removed: DependencyDiff["removed"] = [];
  const changed: DependencyDiff["changed"] = [];
  let unchangedCount = 0;

  for (const name of Object.keys(current).sort()) {
    if (!(name in prev)) added.push({ name, version: current[name] });
    else if (prev[name] !== current[name]) changed.push({ name, from: prev[name], to: current[name] });
    else unchangedCount += 1;
  }
  for (const name of Object.keys(prev).sort()) {
    if (!(name in current)) removed.push({ name, version: prev[name] });
  }
  return {
    added,
    removed,
    changed,
    unchangedCount,
    hasChanges: added.length + removed.length + changed.length > 0,
  };
}
