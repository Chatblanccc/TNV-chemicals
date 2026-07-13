export type GovernedContentRow = { id: string; slug: string; status: string; verificationStatus: string };
export type LifecycleEvent = { entityType: string; entityId: string; action: string };

export function mergeGovernedBySlug<T extends { slug: string }>(seed: T[], rows: GovernedContentRow[], overrides: T[], events: LifecycleEvent[], entityType: string) {
  const lifecycleIds = new Set(events.filter(event => event.entityType === entityType).map(event => event.entityId));
  const publicSlugs = new Set(overrides.map(item => item.slug));
  const suppressedSeedSlugs = new Set(rows
    .filter(row => !publicSlugs.has(row.slug) && (row.status === "archived" || lifecycleIds.has(row.id)))
    .map(row => row.slug));
  const merged = new Map(seed.filter(item => !suppressedSeedSlugs.has(item.slug)).map(item => [item.slug, item]));
  for (const item of overrides) merged.set(item.slug, item);
  return Array.from(merged.values());
}
