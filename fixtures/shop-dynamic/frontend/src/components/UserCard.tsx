import type { UserDTO } from "../../../shared/DTOs";
import { formatMoney } from "../../../shared/scripts/format";
import { Button } from "./ui/Button";
export function UserCard({ user }: { user: UserDTO }) {
  return (
    <div>
      <h3>{user.name}</h3>
      <Button onClick={() => alert(formatMoney(user.balance))}>Balance</Button>
    </div>
  );
}
