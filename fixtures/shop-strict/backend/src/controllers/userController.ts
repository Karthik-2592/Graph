import type { Request, Response } from "express";
import { UserService } from "../services/userService";
import { toUserDTO } from "../../../shared/DTOs";
export class UserController {
  constructor(private svc: UserService) {}
  get = (req: Request, res: Response) => {
    res.json(toUserDTO(this.svc.findById(Number(req.params.id))));
  };
  rename(req: Request, res: Response) {
    res.json(toUserDTO(this.svc.rename(Number(req.params.id), req.body.name)));
  }
}
