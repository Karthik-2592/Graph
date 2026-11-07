import { UserService } from "../backend/src/services/userService";
import type { UserRepository } from "../backend/src/repositories/userRepository";
declare const it: any;
it("renames", () => { new UserService({} as UserRepository); });
