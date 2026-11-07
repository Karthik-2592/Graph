import { UserService } from "./userService";
import { calculateTotal, formatMoney } from "../utils";
import type { Item } from "../../../shared/DTOs";
export class OrderService {
  constructor(private users: UserService) {}
  place(userId: number, items: Item[]) {
    const u = this.users.findById(userId);
    const total = calculateTotal(items, u.vip ? 10 : 0);
    return { user: u.name, total, display: formatMoney(total) };
  }
}
