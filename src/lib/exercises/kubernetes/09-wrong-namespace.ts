import { Exercise, TerminalResponse } from "../types";
import * as yaml from "js-yaml";

function parseAllDocs(code: string): Record<string, unknown>[] {
  try {
    const docs = yaml.loadAll(code) as Record<string, unknown>[];
    return docs.filter(function (d) { return d !== null && d !== undefined; });
  } catch (_e) {
    return [];
  }
}

function hasNamespaceResource(docs: Record<string, unknown>[]): boolean {
  return docs.some(function (doc) {
    if (doc.kind !== "Namespace") return false;
    const metadata = doc.metadata as Record<string, unknown> | undefined;
    return metadata?.name === "production";
  });
}

function getPodDoc(docs: Record<string, unknown>[]): Record<string, unknown> | null {
  return docs.find(function (doc) { return doc.kind === "Pod"; }) ?? null;
}

function getPodNamespace(pod: Record<string, unknown> | null): string | null {
  if (!pod) return null;
  const metadata = pod.metadata as Record<string, unknown> | undefined;
  return (metadata?.namespace as string) ?? null;
}

function handleApply(code: string): TerminalResponse {
  const docs = parseAllDocs(code);
  if (docs.length === 0) {
    return {
      output: 'error: error validating "pod.yaml": error converting YAML to JSON: yaml: invalid YAML',
      exitCode: 1,
    };
  }

  const pod = getPodDoc(docs);
  const podNamespace = getPodNamespace(pod);

  if (podNamespace === "production" && !hasNamespaceResource(docs)) {
    return {
      output: [
        'Error from server (NotFound): error when creating "pod.yaml": namespaces "production" not found',
      ].join("\n"),
      exitCode: 1,
    };
  }

  const outputs: string[] = [];
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const metadata = doc.metadata as Record<string, unknown> | undefined;
    const name = metadata?.name || "unknown";
    const kind = String(doc.kind).toLowerCase();
    if (doc.kind === "Namespace") {
      outputs.push("namespace/" + name + " created");
    } else if (doc.kind === "Pod") {
      outputs.push("pod/" + name + " created");
    } else {
      outputs.push(kind + "/" + name + " created");
    }
  }

  return { output: outputs.join("\n"), exitCode: 0 };
}

function handleGetNamespaces(_code: string): TerminalResponse {
  return {
    output: [
      "NAME              STATUS   AGE",
      "default           Active   30d",
      "kube-system       Active   30d",
      "kube-public       Active   30d",
      "kube-node-lease   Active   30d",
    ].join("\n"),
    exitCode: 0,
  };
}

function handleGetPods(code: string): TerminalResponse {
  const docs = parseAllDocs(code);
  const pod = getPodDoc(docs);
  const podNamespace = getPodNamespace(pod);

  if (!pod || (podNamespace === "production" && !hasNamespaceResource(docs))) {
    return { output: "No resources found in production namespace.", exitCode: 0 };
  }

  const metadata = pod.metadata as Record<string, unknown> | undefined;
  const name = metadata?.name || "api-server";
  return {
    output: [
      "NAME          READY   STATUS    RESTARTS   AGE",
      name + "   1/1     Running   0          5s",
    ].join("\n"),
    exitCode: 0,
  };
}

function validateYaml(code: string) {
  try {
    yaml.loadAll(code);
    return { passed: true };
  } catch (e) {
    return {
      passed: false,
      errorMessage: [
        "Error: YAML parse error",
        "",
        e instanceof Error ? e.message : "YAML invalido",
      ].join("\n"),
    };
  }
}

function validateHasPod(code: string) {
  const docs = parseAllDocs(code);
  const pod = getPodDoc(docs);
  if (!pod) {
    return {
      passed: false,
      errorMessage: [
        "Error: no se ha encontrado un recurso Pod en el manifiesto",
        "",
        "El manifiesto debe contener al menos un recurso de tipo Pod.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateNamespaceExists(code: string) {
  const docs = parseAllDocs(code);
  const pod = getPodDoc(docs);
  const podNamespace = getPodNamespace(pod);

  if (podNamespace === "production" && !hasNamespaceResource(docs)) {
    return {
      passed: false,
      errorMessage: [
        'Error: namespace "production" not found',
        "",
        "El Pod hace referencia al namespace production, pero este namespace no existe en el cluster. Necesitas crear el Namespace primero.",
        "",
        "Puedes incluir la definicion del Namespace en el mismo archivo YAML usando --- como separador de documentos.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

export const wrongNamespace: Exercise = {
  id: "k8s-09-wrong-namespace",
  module: "kubernetes",
  title: "Namespace inexistente",
  briefing:
    "El recurso se aplica en un namespace que no existe en el cluster. Revisa como crear el namespace o cambiar la referencia.",
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
  terminalCommands: {
    "kubectl apply -f pod.yaml": handleApply,
    "kubectl get namespaces": handleGetNamespaces,
    "kubectl get pods -n production": handleGetPods,
  },
  validations: [
    {
      type: "syntax",
      errorMessage: "El YAML debe ser valido.",
      check: validateYaml,
    },
    {
      type: "semantic",
      errorMessage: "El manifiesto debe contener un recurso Pod.",
      check: validateHasPod,
    },
    {
      type: "intention",
      errorMessage: 'El namespace "production" debe existir antes de crear el Pod.',
      check: validateNamespaceExists,
    },
  ],
  prerequisites: ["k8s-08-secret-plaintext"],
  hints: [
    'Ejecuta kubectl get namespaces. El namespace "production" no aparece en la lista. El Pod no puede crearse en un namespace que no existe.',
    "Puedes definir el Namespace en el mismo archivo YAML. Usa --- para separar multiples documentos YAML en un solo archivo.",
    'Solucion: anade un recurso Namespace al principio del archivo:\n---\napiVersion: v1\nkind: Namespace\nmetadata:\n  name: production\n---\n(seguido del Pod original)',
  ],
  successMessage: [
    "¡Correcto! El namespace y el Pod se crean juntos correctamente.",
    "",
    "Lo que aprendiste:",
    "- Un Pod no puede crearse en un namespace que no existe",
    "- kubectl get namespaces muestra los namespaces disponibles",
    "- Puedes incluir multiples recursos en un solo archivo YAML separados por ---",
    "- El orden importa: el Namespace debe definirse antes que los recursos que lo usan",
    "- Los namespaces permiten organizar y aislar recursos dentro de un cluster",
    "- Los namespaces por defecto son: default, kube-system, kube-public, kube-node-lease",
  ].join("\n"),
};
