import { notFound } from "next/navigation";
import { ProfileClient } from "@/components/profile/ProfileClient";
import { MOCK_USERS } from "@/lib/data";

type Props = { params: Promise<{ id: string }> };

export default async function ProfilePage({ params }: Props) {
  const { id } = await params;
  const user = Object.values(MOCK_USERS).find((u) => u.id === id);
  if (!user) notFound();
  return <ProfileClient user={user} />;
}
