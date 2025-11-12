import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

export default async function Dashboard() {
  const session = await getServerSession(authConfig);
  return <div>Welcome {session?.user?.name}</div>;
}
