import { Exercise, TerminalResponse } from "../types";
import * as yaml from "js-yaml";

function parsePod(code: string): Record<string, unknown> | null {
  try {
    return yaml.load(code) as Record<string, unknown>;
  } catch (_e) {
    return null;
  }
}

function hasValidApiVersion(parsed: Record<string, unknown> | null): boolean {
  if (!parsed) return false;
  return parsed.apiVersion === "v1";
}

function hasApiVersionField(parsed: Record<string, unknown> | null): boolean {
  if (!parsed) return false;
  return "apiVersion" in parsed;
}

function handleApply(code: string): TerminalResponse {
  const parsed = parsePod(code);
  if (!parsed) {
    return {
      output: 'error: error validating "pod.yaml": error converting YAML to JSON: yaml: invalid YAML',
      exitCode: 1,
    };
  }

  if (!hasApiVersionField(parsed)) {
    return {
      output: [
        'error: error validating "pod.yaml": error validating data: apiVersion not set',
        "",
        "The Kubernetes API server requires every resource to specify an apiVersion.",
      ].join("\n"),
      exitCode: 1,
    };
  }

  if (!hasValidApiVersion(parsed)) {
    return {
      output:
        'error: unable to recognize "pod.yaml": no matches for kind "Pod" in version "' +
        String(parsed.apiVersion) +
        '"',
      exitCode: 1,
    };
  }

  const spec = parsed.spec as Record<string, unknown> | undefined;
  if (!spec || !spec.containers) {
    return {
      output:
        'Error from server (BadRequest): error when creating "pod.yaml": Pod in version "v1" cannot be handled as a Pod: strict decoding error: missing required field "spec.containers"',
      exitCode: 1,
    };
  }

  const metadata = parsed.metadata as Record<string, unknown> | undefined;
  const name = metadata?.name || "my-pod";
  return { output: "pod/" + name + " created", exitCode: 0 };
}

function handleGetPods(code: string): TerminalResponse {
  const parsed = parsePod(code);
  if (!parsed || !hasValidApiVersion(parsed)) {
    return { output: "No resources found in default namespace.", exitCode: 0 };
  }

  const metadata = parsed.metadata as Record<string, unknown> | undefined;
  const name = metadata?.name || "my-pod";
  return {
    output: [
      "NAME        READY   STATUS    RESTARTS   AGE",
      name + "   1/1     Running   0          5s",
    ].join("\n"),
    exitCode: 0,
  };
}

function handleDescribe(code: string): TerminalResponse {
  const parsed = parsePod(code);
  if (!parsed || !hasValidApiVersion(parsed)) {
    return {
      output: 'Error from server (NotFound): pods "my-pod" not found',
      exitCode: 1,
    };
  }

  const metadata = parsed.metadata as Record<string, unknown> | undefined;
  const name = metadata?.name || "my-pod";
  const spec = parsed.spec as Record<string, unknown> | undefined;
  const containers = spec?.containers as Record<string, unknown>[] | undefined;
  const container = containers?.[0];

  return {
    output: [
      "Name:         " + name,
      "Namespace:    default",
      "Status:       Running",
      "IP:           10.244.0.7",
      "Containers:",
      "  " + (container?.name || "app") + ":",
      "    Image:          " + (container?.image || "nginx:1.25"),
      "    Port:           80/TCP",
      "    State:          Running",
      "      Started:      Sun, 01 Jan 2025 00:00:00 +0000",
      "    Ready:          True",
      "Events:",
      "  Type    Reason     Age   From               Message",
      "  ----    ------     ----  ----               -------",
      "  Normal  Scheduled  10s   default-scheduler  Successfully assigned default/" + name,
      "  Normal  Pulled     9s    kubelet            Container image already present",
      "  Normal  Created    9s    kubelet            Created container " + (container?.name || "app"),
      "  Normal  Started    8s    kubelet            Started container " + (container?.name || "app"),
    ].join("\n"),
    exitCode: 0,
  };
}

function validateYaml(code: string) {
  try {
    yaml.load(code);
    return { passed: true };
  } catch (e) {
    return {
      passed: false,
      errorMessage: [
        "Error: YAML parse error",
        "",
        e instanceof Error ? e.message : "YAML invalido",
        "",
        "Revisa la indentacion y la sintaxis del YAML.",
      ].join("\n"),
    };
  }
}

function validateApiVersionExists(code: string) {
  const parsed = parsePod(code);
  if (!parsed) return { passed: true };
  if (!hasApiVersionField(parsed)) {
    return {
      passed: false,
      errorMessage: [
        'Error: falta el campo "apiVersion"',
        "",
        "Todo recurso de Kubernetes necesita un campo apiVersion en el nivel raiz del manifiesto. Este campo indica al API server que version del esquema usar para validar el recurso.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateApiVersionValue(code: string) {
  const parsed = parsePod(code);
  if (!parsed) return { passed: true };
  if (!hasApiVersionField(parsed)) return { passed: true };
  if (parsed.apiVersion !== "v1") {
    return {
      passed: false,
      errorMessage: [
        'Error: apiVersion "' + String(parsed.apiVersion) + '" no es valido para un Pod',
        "",
        'Los Pods pertenecen al core API group y usan apiVersion: v1. Otros recursos como Deployments usan "apps/v1".',
      ].join("\n"),
    };
  }
  return { passed: true };
}

export const missingApiversion: Exercise = {
  id: "k8s-03-missing-apiversion",
  module: "kubernetes",
  title: "Pod sin apiVersion",
  briefing:
    "El API server rechaza este manifiesto. Falta un campo obligatorio que todo recurso de Kubernetes necesita.",
  language: "yaml",
  initialCode: [
    "kind: Pod",
    "metadata:",
    "  name: my-pod",
    "  labels:",
    "    app: my-app",
    "spec:",
    "  containers:",
    "    - name: app",
    "      image: nginx:1.25",
    "      ports:",
    "        - containerPort: 80",
    "",
  ].join("\n"),
  terminalCommands: {
    "kubectl apply -f pod.yaml": handleApply,
    "kubectl get pods": handleGetPods,
    "kubectl describe pod my-pod": handleDescribe,
  },
  validations: [
    {
      type: "syntax",
      errorMessage: "El YAML debe ser valido.",
      check: validateYaml,
    },
    {
      type: "semantic",
      errorMessage: "Falta el campo apiVersion en el manifiesto.",
      check: validateApiVersionExists,
    },
    {
      type: "intention",
      errorMessage: "El apiVersion debe ser v1 para un Pod.",
      check: validateApiVersionValue,
    },
  ],
  prerequisites: ["k8s-02-crashloop-debug"],
  hints: [
    "El error dice que apiVersion no esta definido. Todo recurso de Kubernetes necesita tres campos raiz: apiVersion, kind y metadata.",
    "Para un Pod, el apiVersion correcto es v1. Los Pods son parte del core API group.",
    'Solucion: anade "apiVersion: v1" como primera linea del manifiesto, antes de "kind: Pod".',
  ],
  successMessage: [
    "¡Correcto! El Pod tiene ahora un apiVersion valido.",
    "",
    "Lo que aprendiste:",
    "- Todo recurso de Kubernetes necesita tres campos obligatorios: apiVersion, kind y metadata",
    '- Los Pods usan apiVersion: v1 (core API group)',
    '- Los Deployments y ReplicaSets usan apiVersion: apps/v1',
    "- El API server valida el esquema completo antes de crear cualquier recurso",
    "- Sin apiVersion, Kubernetes no sabe como interpretar el manifiesto",
  ].join("\n"),
};
