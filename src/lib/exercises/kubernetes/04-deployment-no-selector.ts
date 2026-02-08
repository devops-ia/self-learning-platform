import { Exercise, TerminalResponse } from "../types";
import * as yaml from "js-yaml";

function parseManifest(code: string): Record<string, unknown> | null {
  try {
    return yaml.load(code) as Record<string, unknown>;
  } catch (_e) {
    return null;
  }
}

function getSelector(parsed: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!parsed) return null;
  const spec = parsed.spec as Record<string, unknown> | undefined;
  return (spec?.selector as Record<string, unknown>) ?? null;
}

function getTemplateLabels(parsed: Record<string, unknown> | null): Record<string, string> | null {
  if (!parsed) return null;
  const spec = parsed.spec as Record<string, unknown> | undefined;
  const template = spec?.template as Record<string, unknown> | undefined;
  const metadata = template?.metadata as Record<string, unknown> | undefined;
  return (metadata?.labels as Record<string, string>) ?? null;
}

function selectorMatchesLabels(parsed: Record<string, unknown> | null): boolean {
  const selector = getSelector(parsed);
  if (!selector) return false;
  const matchLabels = selector.matchLabels as Record<string, string> | undefined;
  if (!matchLabels) return false;
  const templateLabels = getTemplateLabels(parsed);
  if (!templateLabels) return false;
  for (const key of Object.keys(matchLabels)) {
    if (templateLabels[key] !== matchLabels[key]) return false;
  }
  return true;
}

function handleApply(code: string): TerminalResponse {
  const parsed = parseManifest(code);
  if (!parsed) {
    return {
      output: "error: error parsing deployment.yaml: error converting YAML to JSON",
      exitCode: 1,
    };
  }

  const selector = getSelector(parsed);
  if (!selector) {
    return {
      output: [
        'Error from server (Invalid): error when creating "deployment.yaml": Deployment.apps "frontend" is invalid:',
        "spec.selector: Required value",
      ].join("\n"),
      exitCode: 1,
    };
  }

  const matchLabels = selector.matchLabels as Record<string, string> | undefined;
  if (!matchLabels) {
    return {
      output: [
        'Error from server (Invalid): error when creating "deployment.yaml": Deployment.apps "frontend" is invalid:',
        'spec.selector: Invalid value: must specify "matchLabels" or "matchExpressions"',
      ].join("\n"),
      exitCode: 1,
    };
  }

  if (!selectorMatchesLabels(parsed)) {
    return {
      output: [
        'Error from server (Invalid): error when creating "deployment.yaml": Deployment.apps "frontend" is invalid:',
        "spec.template.metadata.labels: Invalid value: selector does not match template labels",
      ].join("\n"),
      exitCode: 1,
    };
  }

  return { output: "deployment.apps/frontend created", exitCode: 0 };
}

function handleGetDeployments(code: string): TerminalResponse {
  const parsed = parseManifest(code);
  if (!selectorMatchesLabels(parsed)) {
    return { output: "No resources found in default namespace.", exitCode: 0 };
  }

  const spec = parsed?.spec as Record<string, unknown> | undefined;
  const replicas = spec?.replicas ?? 1;
  return {
    output: [
      "NAME       READY   UP-TO-DATE   AVAILABLE   AGE",
      "frontend   " + replicas + "/" + replicas + "     " + replicas + "            " + replicas + "           10s",
    ].join("\n"),
    exitCode: 0,
  };
}

function handleGetPods(code: string): TerminalResponse {
  const parsed = parseManifest(code);
  if (!selectorMatchesLabels(parsed)) {
    return { output: "No resources found in default namespace.", exitCode: 0 };
  }

  const spec = parsed?.spec as Record<string, unknown> | undefined;
  const replicas = Number(spec?.replicas ?? 1);
  const lines = ["NAME                        READY   STATUS    RESTARTS   AGE"];
  for (let i = 0; i < replicas; i++) {
    lines.push("frontend-6b8d4f7c9a-" + String.fromCharCode(97 + i) + "x" + i + "r" + "   1/1     Running   0          10s");
  }
  return {
    output: lines.join("\n"),
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
      ].join("\n"),
    };
  }
}

function validateSelectorExists(code: string) {
  const parsed = parseManifest(code);
  if (!parsed) return { passed: true };
  const selector = getSelector(parsed);
  if (!selector) {
    return {
      passed: false,
      errorMessage: [
        'Error: spec.selector: Required value',
        "",
        "Un Deployment necesita un campo spec.selector para saber que Pods gestionar. Sin el, Kubernetes no puede asociar los Pods creados por el template con este Deployment.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateSelectorMatchesLabels(code: string) {
  const parsed = parseManifest(code);
  if (!parsed) return { passed: true };
  const selector = getSelector(parsed);
  if (!selector) return { passed: true };
  if (!selectorMatchesLabels(parsed)) {
    return {
      passed: false,
      errorMessage: [
        "Error: spec.selector no coincide con spec.template.metadata.labels",
        "",
        "El selector.matchLabels debe coincidir exactamente con las labels del template. Si no coinciden, el Deployment no puede gestionar los Pods que crea.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

export const deploymentNoSelector: Exercise = {
  id: "k8s-04-deployment-no-selector",
  module: "kubernetes",
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
  terminalCommands: {
    "kubectl apply -f deployment.yaml": handleApply,
    "kubectl get deployments": handleGetDeployments,
    "kubectl get pods": handleGetPods,
  },
  validations: [
    {
      type: "syntax",
      errorMessage: "El YAML debe ser valido.",
      check: validateYaml,
    },
    {
      type: "semantic",
      errorMessage: "Falta el campo spec.selector en el Deployment.",
      check: validateSelectorExists,
    },
    {
      type: "intention",
      errorMessage: "El selector debe coincidir con las labels del template.",
      check: validateSelectorMatchesLabels,
    },
  ],
  prerequisites: ["k8s-03-missing-apiversion"],
  hints: [
    "El error menciona spec.selector como campo requerido. Un Deployment necesita saber que Pods le pertenecen.",
    "El selector usa matchLabels para encontrar Pods. Las labels del selector deben coincidir con las labels del template.",
    'Solucion: anade un bloque selector debajo de spec, al mismo nivel que replicas:\n  selector:\n    matchLabels:\n      app: frontend',
  ],
  successMessage: [
    "¡Perfecto! El Deployment puede ahora gestionar sus Pods correctamente.",
    "",
    "Lo que aprendiste:",
    "- Un Deployment necesita spec.selector para identificar que Pods le pertenecen",
    "- El selector.matchLabels debe coincidir con spec.template.metadata.labels",
    "- Si el selector no coincide con las labels del template, el API server rechaza el manifiesto",
    "- Este mecanismo permite que un Deployment solo gestione los Pods que el ha creado",
  ].join("\n"),
};
