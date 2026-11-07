import type { UserDTO } from "../../../shared/DTOs";
import { routes } from "../../../shared/routes";
import { callApi } from "../../../shared/http";
export function getUserViaContract(id: number) { return callApi<UserDTO>(routes.getUser, { id }); }
