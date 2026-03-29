/** Demo tenants for the take-home (matches backend seed users). */

export const DEMO_ACCOUNT_PASSWORD = "demo1234";

const A = "owner@store-a.test";
const B = "owner@store-b.test";

/** Returns the other seeded account email for one-click switching. */
export function otherDemoEmail(currentEmail: string | undefined): string {
  if (currentEmail === B) return A;
  return B;
}

export function demoLabel(storeId: string): string {
  if (storeId === "store_456") return "Demo store A";
  if (storeId === "store_789") return "Demo store B";
  return storeId;
}

/** Human label for the *other* seeded account (for switch button). */
export function otherDemoLabel(currentEmail: string | undefined): string {
  const next = otherDemoEmail(currentEmail);
  return next === B ? demoLabel("store_789") : demoLabel("store_456");
}
