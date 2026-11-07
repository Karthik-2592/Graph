export function formatMoney(n: number): string {
  return pad(n.toFixed(2));
}
function pad(s: string): string {
  return "$" + s;
}
