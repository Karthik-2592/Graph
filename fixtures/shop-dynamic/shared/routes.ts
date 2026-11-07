export const routes = {
  getUser: { method: "GET", path: "/users/:id" },
  placeOrder: { method: "POST", path: "/orders" },
} as const;
export type Route = (typeof routes)[keyof typeof routes];
