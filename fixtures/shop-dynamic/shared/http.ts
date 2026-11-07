import type { Route } from "./routes";
export async function callApi<T>(route: Route, params: Record<string, string | number> = {}): Promise<T> {
  const url = "/api" + route.path.replace(/:(\w+)/g, (_m, k) => String(params[k]));
  const r = await fetch(url, { method: route.method });
  return r.json();
}
