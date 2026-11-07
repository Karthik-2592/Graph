import { bus } from "./events";
function sendReceipt(e: { total: number }) { console.log(e.total); }
function audit(e: { id: number }) { console.log(e.id); }
bus.on("orderPlaced", sendReceipt);
bus.on("userRenamed", audit);
