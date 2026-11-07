import type { UserDTO, OrderDTO, Item } from "../../../shared/DTOs";
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  return r.json();
}
export function getUser(id: number) { return fetchJson<UserDTO>(`/api/users/${id}`); }
export function placeOrder(items: Item[]) { return fetchJson<OrderDTO>("/api/orders", { method: "POST", body: JSON.stringify(items) }); }
