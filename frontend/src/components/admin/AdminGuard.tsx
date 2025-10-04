import React from "react";
import { getSessionUser } from "@lib/action";
import { redirect } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

export default async function AdminGuard({ children }: Props): Promise<React.ReactNode> {
  const session = await getSessionUser();

  if (!session?.user?.isLoggedIn) {
    redirect("/admin/login");
  }

  if (session.user?.role?.toLowerCase() !== "admin") {
    redirect("/");
  }
  

  return <>{children}</>;
}
