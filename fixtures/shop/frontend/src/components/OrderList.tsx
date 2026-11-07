import type { OrderDTO } from "../../../shared/DTOs";
import { formatMoney } from "../../../shared/scripts/format";
function OrderRow({ order }: { order: OrderDTO }) {
  return <li>{order.user}: {formatMoney(order.total)}</li>;
}
export function OrderList({ orders }: { orders: OrderDTO[] }) {
  return <ul>{orders.map((o) => <OrderRow key={o.user} order={o} />)}</ul>;
}
