import React from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata = {
  title: "Developer Portal | Likha Apps",
  description: "Manage your submitted progressive web apps on Likha Apps.",
};

export default function DeveloperDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell role="developer">{children}</DashboardShell>;
}

