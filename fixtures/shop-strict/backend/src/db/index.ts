export interface UserRow { id: number; name: string; vip?: boolean; balance?: number }
export interface Store { users: Map<number, UserRow> }
export function connect(): Store {
  return { users: new Map() };
}
