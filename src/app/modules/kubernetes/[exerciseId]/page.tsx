"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import LabLayout from "@/components/lab/LabLayout";

const exerciseData: Record<
  string,
  {
    title: string;
    briefing: string;
    initialCode: string;
    language: "hcl" | "yaml";
  }
> = {
  "k8s-01-invalid-pod": {
    title: "Pod YAML inválido",
    briefing:
      "Este Pod no va a pasar la validación del API server. El YAML tiene errores estructurales. Corrígelo.",
    language: "yaml",
    initialCode: [
      "apiVersion: v1",
      "kind: Pod",
      "metadata:",
      "  name: nginx-pod",
      "spec:",
      "  container:",
      "    name: nginx",
      "    image: nginx:1.25",
      "    ports:",
      "    - containerPort: 80",
      "",
    ].join("\n"),
  },
  "k8s-02-crashloop-debug": {
    title: "CrashLoopBackOff",
    briefing:
      "El Pod arranca pero muere inmediatamente. kubectl logs te va a decir por qué.",
    language: "yaml",
    initialCode: [
      "apiVersion: apps/v1",
      "kind: Deployment",
      "metadata:",
      "  name: web-app",
      "spec:",
      "  replicas: 1",
      "  selector:",
      "    matchLabels:",
      "      app: web-app",
      "  template:",
      "    metadata:",
      "      labels:",
      "        app: web-app",
      "    spec:",
      "      containers:",
      "        - name: web",
      "          image: nginx:1.25",
      '          command: ["/bin/start-server"]',
      "          ports:",
      "            - containerPort: 80",
      "          livenessProbe:",
      "            httpGet:",
      "              path: /healthz",
      "              port: 8080",
      "            initialDelaySeconds: 5",
      "            periodSeconds: 10",
      "",
    ].join("\n"),
  },
  "k8s-03-missing-apiversion": {
    title: "Pod sin apiVersion",
    briefing:
      "El API server rechaza este manifiesto. Falta un campo obligatorio que todo recurso de Kubernetes necesita.",
    language: "yaml",
    initialCode: [
      "kind: Pod",
      "metadata:",
      "  name: nginx-pod",
      "  labels:",
      "    app: nginx",
      "spec:",
      "  containers:",
      "    - name: nginx",
      "      image: nginx:1.25",
      "      ports:",
      "        - containerPort: 80",
      "",
    ].join("\n"),
  },
  "k8s-04-deployment-no-selector": {
    title: "Deployment sin selector",
    briefing:
      "Este Deployment no puede gestionar Pods porque falta un campo clave. El API server rechaza el manifiesto.",
    language: "yaml",
    initialCode: [
      "apiVersion: apps/v1",
      "kind: Deployment",
      "metadata:",
      "  name: frontend",
      "spec:",
      "  replicas: 3",
      "  template:",
      "    metadata:",
      "      labels:",
      "        app: frontend",
      "    spec:",
      "      containers:",
      "        - name: web",
      "          image: nginx:1.25",
      "          ports:",
      "            - containerPort: 80",
      "",
    ].join("\n"),
  },
  "k8s-05-service-wrong-port": {
    title: "Service sin targetPort",
    briefing:
      "El Service existe, pero no enruta tráfico al container. Falta un campo importante en la definición del puerto.",
    language: "yaml",
    initialCode: [
      "apiVersion: v1",
      "kind: Service",
      "metadata:",
      "  name: web",
      "spec:",
      "  selector:",
      "    app: frontend",
      "  ports:",
      "    - protocol: TCP",
      "      port: 8080",
      "",
    ].join("\n"),
  },
  "k8s-06-invalid-imagepullpolicy": {
    title: "imagePullPolicy inválido",
    briefing:
      "El valor de imagePullPolicy no es válido. El API server lo rechaza. Corrige el valor para que el Pod pueda crearse.",
    language: "yaml",
    initialCode: [
      "apiVersion: v1",
      "kind: Pod",
      "metadata:",
      "  name: nginx-app",
      "  labels:",
      "    app: nginx",
      "spec:",
      "  containers:",
      "    - name: nginx",
      "      image: nginx:1.25",
      "      imagePullPolicy: Sometimes",
      "      ports:",
      "        - containerPort: 80",
      "",
    ].join("\n"),
  },
  "k8s-07-configmap-wrong-ref": {
    title: "ConfigMap mal referenciado",
    briefing:
      "El Pod intenta leer un ConfigMap para configurar una variable de entorno, pero la referencia tiene errores. Corrige la estructura del manifiesto.",
    language: "yaml",
    initialCode: [
      "apiVersion: v1",
      "kind: Pod",
      "metadata:",
      "  name: config-app",
      "spec:",
      "  containers:",
      "    - name: app",
      "      image: busybox:1.36",
      '      command: ["sh", "-c", "echo $DB_HOST && sleep 3600"]',
      "      env:",
      "        - name: DB_HOST",
      "          valueFrom:",
      "            configMapRef:",
      "              name: app-config",
      "",
    ].join("\n"),
  },
  "k8s-08-secret-plaintext": {
    title: "Secret en texto plano",
    briefing:
      "Este Secret usa el campo data pero los valores no están codificados en base64. El API server rechaza los datos. Corrige la codificación o usa una alternativa.",
    language: "yaml",
    initialCode: [
      "apiVersion: v1",
      "kind: Secret",
      "metadata:",
      "  name: db-credentials",
      "type: Opaque",
      "data:",
      "  username: admin",
      "  password: mypassword",
      "",
    ].join("\n"),
  },
  "k8s-09-wrong-namespace": {
    title: "Namespace inexistente",
    briefing:
      "El recurso se aplica en un namespace que no existe en el cluster. Revisa cómo crear el namespace o cambiar la referencia.",
    language: "yaml",
    initialCode: [
      "apiVersion: v1",
      "kind: Pod",
      "metadata:",
      "  name: api-server",
      "  namespace: production",
      "  labels:",
      "    app: api",
      "    env: production",
      "spec:",
      "  containers:",
      "    - name: api",
      "      image: node:20-alpine",
      '      command: ["node", "server.js"]',
      "      ports:",
      "        - containerPort: 3000",
      "",
    ].join("\n"),
  },
  "k8s-10-broken-liveness": {
    title: "LivenessProbe inválida",
    briefing:
      "El puerto del liveness probe no es válido. El Pod no puede pasar la validación. Corrige el valor del puerto.",
    language: "yaml",
    initialCode: [
      "apiVersion: v1",
      "kind: Pod",
      "metadata:",
      "  name: health-app",
      "  labels:",
      "    app: health",
      "spec:",
      "  containers:",
      "    - name: app",
      "      image: nginx:1.25",
      "      ports:",
      "        - containerPort: 8080",
      "      livenessProbe:",
      "        httpGet:",
      "          path: /healthz",
      "          port: eighty",
      "        initialDelaySeconds: 5",
      "        periodSeconds: 10",
      "",
    ].join("\n"),
  },
  "k8s-11-rbac-no-verbs": {
    title: "Role sin permisos",
    briefing:
      "Este Role define recursos pero no concede ninguna acción sobre ellos. Falta un campo obligatorio en las reglas.",
    language: "yaml",
    initialCode: [
      "apiVersion: rbac.authorization.k8s.io/v1",
      "kind: Role",
      "metadata:",
      "  name: pod-reader",
      "  namespace: default",
      "rules:",
      '  - apiGroups: [""]',
      '    resources: ["pods", "pods/log"]',
      "",
    ].join("\n"),
  },
  "k8s-12-volume-mismatch": {
    title: "Volume no definido",
    briefing:
      "El container monta un volumen que no está definido en la especificación del Pod. Añade la definición del volumen que falta.",
    language: "yaml",
    initialCode: [
      "apiVersion: v1",
      "kind: Pod",
      "metadata:",
      "  name: data-processor",
      "  labels:",
      "    app: processor",
      "spec:",
      "  containers:",
      "    - name: processor",
      "      image: python:3.12-slim",
      '      command: ["python", "process.py"]',
      "      volumeMounts:",
      "        - name: data",
      "          mountPath: /app/data",
      "",
    ].join("\n"),
  },
};

export default function KubernetesExercisePage() {
  const params = useParams();
  const router = useRouter();
  const exerciseId = params.exerciseId as string;
  const exercise = exerciseData[exerciseId];
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!exercise) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-57px)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Ejercicio no encontrado</h1>
          <Link href="/modules/kubernetes" className="text-[var(--accent)]">
            Volver a Kubernetes
          </Link>
        </div>
      </div>
    );
  }

  if (!ready) return null;

  return (
    <LabLayout
      exerciseId={exerciseId}
      title={exercise.title}
      briefing={exercise.briefing}
      initialCode={exercise.initialCode}
      language={exercise.language}
      onComplete={() => {
        setTimeout(() => {
          router.push("/modules/kubernetes");
          router.refresh();
        }, 3000);
      }}
    />
  );
}
