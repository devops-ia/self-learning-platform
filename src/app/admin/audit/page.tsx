"use client";

import { useT } from "@/lib/i18n/context";
import AuditTable from "@/components/admin/AuditTable";

export default function AdminAuditPage() {
  const { t } = useT();

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">{t.adminPanel.auditLog}</h1>
      <AuditTable />
    </div>
  );
}
