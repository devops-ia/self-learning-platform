"use client";

import ProgressTracker from "@/components/progress/ProgressTracker";
import { Terminal } from "lucide-react";

const exercises = [
  {
    id: "tf-01-broken-provider",
    title: "El provider roto",
    status: "available" as const,
    prerequisites: [],
  },
  {
    id: "tf-02-variables-outputs",
    title: "Variables sin declarar",
    status: "locked" as const,
    prerequisites: ["tf-01-broken-provider"],
  },
  {
    id: "tf-03-missing-terraform-block",
    title: "Bloque terraform ausente",
    status: "locked" as const,
    prerequisites: ["tf-02-variables-outputs"],
  },
  {
    id: "tf-04-broken-backend",
    title: "Backend S3 sin bucket",
    status: "locked" as const,
    prerequisites: ["tf-03-missing-terraform-block"],
  },
  {
    id: "tf-05-variable-no-type",
    title: "Variable sin tipo",
    status: "locked" as const,
    prerequisites: ["tf-04-broken-backend"],
  },
  {
    id: "tf-06-broken-output",
    title: "Output inválido",
    status: "locked" as const,
    prerequisites: ["tf-05-variable-no-type"],
  },
  {
    id: "tf-07-no-provider",
    title: "Recurso sin provider",
    status: "locked" as const,
    prerequisites: ["tf-06-broken-output"],
  },
  {
    id: "tf-08-invalid-count",
    title: "Count inválido",
    status: "locked" as const,
    prerequisites: ["tf-07-no-provider"],
  },
  {
    id: "tf-09-broken-foreach",
    title: "for_each inválido",
    status: "locked" as const,
    prerequisites: ["tf-08-invalid-count"],
  },
  {
    id: "tf-10-missing-depends",
    title: "Dependencia no declarada",
    status: "locked" as const,
    prerequisites: ["tf-09-broken-foreach"],
  },
  {
    id: "tf-11-broken-lifecycle",
    title: "Lifecycle incorrecto",
    status: "locked" as const,
    prerequisites: ["tf-10-missing-depends"],
  },
  {
    id: "tf-12-local-state",
    title: "State local en producción",
    status: "locked" as const,
    prerequisites: ["tf-11-broken-lifecycle"],
  },
];

export default function TerraformModulePage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <div className="flex items-center gap-3 mb-2">
        <Terminal className="w-8 h-8 text-[var(--accent)]" />
        <h1 className="text-3xl font-bold">Terraform</h1>
      </div>
      <p className="text-[var(--muted)] mb-8">
        Aprende a configurar infraestructura como código corrigiendo errores reales de Terraform.
      </p>

      <h2 className="text-lg font-semibold mb-4">Ejercicios</h2>
      <ProgressTracker module="terraform" exercises={exercises} />
    </div>
  );
}
