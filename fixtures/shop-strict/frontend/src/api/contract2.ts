import { routes } from "../../../shared/routes";
import { callApi } from "../../../shared/http";
import type { OrderDTO, Item } from "../../../shared/DTOs";
export function placeOrderViaContract(items: Item[]) { return callApi<OrderDTO>(routes.placeOrder, {}); }
