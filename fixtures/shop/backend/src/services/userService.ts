import { UserRepository } from "../repositories/userRepository";
import { NotFound } from "../errors";
export class UserService {
  constructor(private repo: UserRepository) {}
  findById(id: number) {
    const u = this.repo.find(id);
    if (!u) throw new NotFound(id);
    return u;
  }
  rename(id: number, name: string) {
    const u = this.findById(id);
    return this.repo.save({ ...u, name: this.normalize(name) });
  }
  private normalize(n: string) { return n.trim(); }
}
