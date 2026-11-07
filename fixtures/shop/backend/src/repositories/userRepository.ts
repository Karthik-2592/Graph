import { connect, UserRow } from "../db";
export class UserRepository {
  private store = connect();
  find(id: number) { return this.store.users.get(id); }
  save(u: UserRow) { this.store.users.set(u.id, u); return u; }
}
