import { createRoot } from "react-dom/client";
import { lazy } from "react";
import UserPage from "./pages/UserPage";
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
createRoot(document.getElementById("root")!).render(<><UserPage id={1} /><OrdersPage /></>);
