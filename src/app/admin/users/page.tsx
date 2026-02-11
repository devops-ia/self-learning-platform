"use client";

import { useT } from "@/lib/i18n/context";
import UserTable from "@/components/admin/UserTable";

export default function AdminUsersPage() {
  const { t } = useT();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">{t.adminPanel.users}</h1>
      <UserTable />
    </div>
  );
}
