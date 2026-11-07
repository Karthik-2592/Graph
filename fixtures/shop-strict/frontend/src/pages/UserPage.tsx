import { useUser } from "../hooks/useUser";
import { UserCard } from "../components/UserCard";
export default function UserPage({ id }: { id: number }) {
  const u = useUser(id);
  return u ? <UserCard user={u} /> : <p>loading</p>;
}
