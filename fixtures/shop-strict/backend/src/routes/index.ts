import { Router } from "express";
import { routes } from "../../../shared/routes";
import { register } from "./contract";
import { requireAuth } from "../middleware/auth";
import { UserController } from "../controllers/userController";
import { OrderController } from "../controllers/orderController";
export function buildRouter(users: UserController, orders: OrderController) {
  const r = Router();
  register(r, routes.getUser, requireAuth, users.get);
  register(r, routes.placeOrder, requireAuth, orders.place.bind(orders));
  return r;
}
