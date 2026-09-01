import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata = {
  title: "Admin Moderation Portal | Likha Apps",
  description: "Review and publish submitted progressive web apps on Likha Apps.",
};

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell role="admin">{children}</DashboardShell>;
}

