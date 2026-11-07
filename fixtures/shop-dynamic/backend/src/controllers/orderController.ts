import type { Request, Response } from "express";
import { OrderService } from "../services/orderService";
export class OrderController {
  constructor(private svc: OrderService) {}
  place(req: Request, res: Response) {
    res.json(this.svc.place(req.body.userId, req.body.items));
  }
}
