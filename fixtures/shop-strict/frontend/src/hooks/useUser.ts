import { useEffect, useState } from "react";
import type { UserDTO } from "../../../shared/DTOs";
import { getUser } from "../api/client";
export function useUser(id: number) {
  const [u, setU] = useState<UserDTO | null>(null);
  useEffect(() => { getUser(id).then(setU); }, [id]);
  return u;
}
