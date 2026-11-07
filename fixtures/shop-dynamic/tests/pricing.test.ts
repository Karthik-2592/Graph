import { calculateTotal } from "../backend/src/utils";
import { formatMoney } from "../shared/scripts/format";
declare const it: any, expect: any;
it("totals", () => { expect(formatMoney(calculateTotal([{ price: 2, qty: 3 }]))).toBe("$6.00"); });
