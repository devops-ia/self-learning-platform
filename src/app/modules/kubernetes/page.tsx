"use client";

import ProgressTracker from "@/components/progress/ProgressTracker";
import { Box } from "lucide-react";

const exercises = [
  {
    id: "k8s-01-invalid-pod",
    title: "Pod YAML inválido",
    status: "available" as const,
    prerequisites: [],
  },
  {
    id: "k8s-02-crashloop-debug",
    title: "CrashLoopBackOff",
    status: "locked" as const,
    prerequisites: ["k8s-01-invalid-pod"],
  },
  {
    id: "k8s-03-missing-apiversion",
    title: "Pod sin apiVersion",
    status: "locked" as const,
    prerequisites: ["k8s-02-crashloop-debug"],
  },
  {
    id: "k8s-04-deployment-no-selector",
    title: "Deployment sin selector",
    status: "locked" as const,
    prerequisites: ["k8s-03-missing-apiversion"],
  },
  {
    id: "k8s-05-service-wrong-port",
    title: "Service sin targetPort",
    status: "locked" as const,
    prerequisites: ["k8s-04-deployment-no-selector"],
  },
  {
    id: "k8s-06-invalid-imagepullpolicy",
    title: "imagePullPolicy inválido",
    status: "locked" as const,
    prerequisites: ["k8s-05-service-wrong-port"],
  },
  {
    id: "k8s-07-configmap-wrong-ref",
    title: "ConfigMap mal referenciado",
    status: "locked" as const,
    prerequisites: ["k8s-06-invalid-imagepullpolicy"],
  },
  {
    id: "k8s-08-secret-plaintext",
    title: "Secret en texto plano",
    status: "locked" as const,
    prerequisites: ["k8s-07-configmap-wrong-ref"],
  },
  {
    id: "k8s-09-wrong-namespace",
    title: "Namespace inexistente",
    status: "locked" as const,
    prerequisites: ["k8s-08-secret-plaintext"],
  },
  {
    id: "k8s-10-broken-liveness",
    title: "LivenessProbe inválida",
    status: "locked" as const,
    prerequisites: ["k8s-09-wrong-namespace"],
  },
  {
    id: "k8s-11-rbac-no-verbs",
    title: "Role sin permisos",
    status: "locked" as const,
    prerequisites: ["k8s-10-broken-liveness"],
  },
  {
    id: "k8s-12-volume-mismatch",
    title: "Volume no definido",
    status: "locked" as const,
    prerequisites: ["k8s-11-rbac-no-verbs"],
  },
];

export default function KubernetesModulePage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <div className="flex items-center gap-3 mb-2">
        <Box className="w-8 h-8 text-[var(--accent)]" />
        <h1 className="text-3xl font-bold">Kubernetes</h1>
      </div>
      <p className="text-[var(--muted)] mb-8">
        Aprende a diagnosticar y corregir problemas comunes en manifiestos de Kubernetes.
      </p>

      <h2 className="text-lg font-semibold mb-4">Ejercicios</h2>
      <ProgressTracker module="kubernetes" exercises={exercises} />
    </div>
  );
}
