export interface UserDTO { id: number; name: string; balance: number }
export function toUserDTO(u: { id: number; name: string; balance?: number }): UserDTO {
  return { id: u.id, name: u.name, balance: u.balance ?? 0 };
}
