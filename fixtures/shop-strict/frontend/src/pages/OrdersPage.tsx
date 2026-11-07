import { placeOrder } from "../api/client";
import { OrderList } from "../components/OrderList";
export default function OrdersPage() {
  const onPlace = () => placeOrder([{ price: 1, qty: 2 }]);
  return <div onClick={onPlace}><OrderList orders={[]} /></div>;
}
