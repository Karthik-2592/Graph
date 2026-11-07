type Events = { orderPlaced: { total: number }; userRenamed: { id: number } };
type Handler<K extends keyof Events> = (e: Events[K]) => void;
class Bus {
  private subs: { [k: string]: Handler<any>[] } = {};
  on<K extends keyof Events>(k: K, f: Handler<K>) { (this.subs[k] ??= []).push(f); }
  emit<K extends keyof Events>(k: K, e: Events[K]) { for (const f of this.subs[k] ?? []) f(e); }
}
export const bus = new Bus();
