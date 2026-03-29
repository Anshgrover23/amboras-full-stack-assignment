/**
 * Seeded events only include `product_id` (see backend seed) — there is no product catalog in scope.
 * For UI we map synthetic ids like `prod_a8` → a short label; raw id stays available via `title` / copy.
 */
export function formatProductLabel(productId: string): string {
  const m = /^prod_([ab])(\d+)$/i.exec(productId.trim());
  if (!m) return productId;
  return `Product ${m[1]!.toUpperCase()}${m[2]}`;
}
