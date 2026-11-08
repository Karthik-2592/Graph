export interface Gateway { charge(amount: number): void }
export class StripeGateway implements Gateway { charge(amount: number) { console.log(amount); } }
export class PaypalGateway implements Gateway { charge(amount: number) { console.log(amount); } }
export function checkout(g: Gateway) { g.charge(10); }
