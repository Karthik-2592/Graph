import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { UserController } from "../controllers/userController";
import { OrderController } from "../controllers/orderController";
export function buildRouter(users: UserController, orders: OrderController) {
  const r = Router();
  r.get("/users/:id", requireAuth, users.get);
  r.put("/users/:id", requireAuth, (q, s) => users.rename(q, s));
  r.post("/orders", requireAuth, orders.place.bind(orders));
  return r;
}
