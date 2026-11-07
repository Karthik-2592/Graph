import type { Item } from "../../../shared/DTOs";
export function applyDiscount(amount: number, pct: number): number {
  return amount - (amount * pct) / 100;
}
export function calculateTotal(items: Item[], discountPct = 0): number {
  const sum = items.reduce((acc, i) => acc + lineTotal(i), 0);
  return applyDiscount(sum, discountPct);
}
function lineTotal(i: Item) { return i.price * i.qty; }
