import { Exercise, TerminalResponse } from "../types";
import * as yaml from "js-yaml";

const VALID_POLICIES = ["Always", "IfNotPresent", "Never"];

function parsePod(code: string): Record<string, unknown> | null {
  try {
    return yaml.load(code) as Record<string, unknown>;
  } catch (_e) {
    return null;
  }
}

function getContainer(parsed: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!parsed) return null;
  const spec = parsed.spec as Record<string, unknown> | undefined;
  const containers = spec?.containers as Record<string, unknown>[] | undefined;
  return containers?.[0] ?? null;
}

function getImagePullPolicy(parsed: Record<string, unknown> | null): string | null {
  const container = getContainer(parsed);
  if (!container) return null;
  return container.imagePullPolicy != null ? String(container.imagePullPolicy) : null;
}

function isPolicyValid(parsed: Record<string, unknown> | null): boolean {
  const policy = getImagePullPolicy(parsed);
  if (policy === null) return true;
  return VALID_POLICIES.indexOf(policy) !== -1;
}

function handleApply(code: string): TerminalResponse {
  const parsed = parsePod(code);
  if (!parsed) {
    return {
      output: 'error: error validating "pod.yaml": error converting YAML to JSON: yaml: invalid YAML',
      exitCode: 1,
    };
  }

  const policy = getImagePullPolicy(parsed);
  if (policy !== null && VALID_POLICIES.indexOf(policy) === -1) {
    return {
      output: [
        'Error from server (Invalid): error when creating "pod.yaml": Pod "nginx-app" is invalid:',
        'spec.containers[0].imagePullPolicy: Unsupported value: "' + policy + '": supported values: "Always", "IfNotPresent", "Never"',
      ].join("\n"),
      exitCode: 1,
    };
  }

  const metadata = parsed.metadata as Record<string, unknown> | undefined;
  const name = metadata?.name || "nginx-app";
  return { output: "pod/" + name + " created", exitCode: 0 };
}

function handleGetPods(code: string): TerminalResponse {
  const parsed = parsePod(code);
  if (!parsed || !isPolicyValid(parsed)) {
    return { output: "No resources found in default namespace.", exitCode: 0 };
  }

  const metadata = parsed.metadata as Record<string, unknown> | undefined;
  const name = metadata?.name || "nginx-app";
  return {
    output: [
      "NAME         READY   STATUS    RESTARTS   AGE",
      name + "   1/1     Running   0          5s",
    ].join("\n"),
    exitCode: 0,
  };
}

function handleDescribe(code: string): TerminalResponse {
  const parsed = parsePod(code);
  if (!parsed || !isPolicyValid(parsed)) {
    return {
      output: 'Error from server (NotFound): pods "nginx-app" not found',
      exitCode: 1,
    };
  }

  const container = getContainer(parsed);
  const policy = getImagePullPolicy(parsed) || "Always";

  return {
    output: [
      "Name:         nginx-app",
      "Namespace:    default",
      "Status:       Running",
      "IP:           10.244.0.9",
      "Containers:",
      "  nginx:",
      "    Image:           " + (container?.image || "nginx:1.25"),
      "    Image Pull Policy: " + policy,
      "    Port:            80/TCP",
      "    State:           Running",
      "    Ready:           True",
      "Events:",
      "  Type    Reason     Age   From               Message",
      "  ----    ------     ----  ----               -------",
      "  Normal  Scheduled  10s   default-scheduler  Successfully assigned default/nginx-app",
      "  Normal  Pulled     9s    kubelet            Container image already present",
      "  Normal  Created    9s    kubelet            Created container nginx",
      "  Normal  Started    8s    kubelet            Started container nginx",
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
      ].join("\n"),
    };
  }
}

function validatePolicyExists(code: string) {
  const parsed = parsePod(code);
  if (!parsed) return { passed: true };
  const container = getContainer(parsed);
  if (!container) return { passed: true };
  if (!("imagePullPolicy" in container)) {
    return {
      passed: false,
      errorMessage: [
        "Warning: imagePullPolicy no esta definido",
        "",
        "Sin imagePullPolicy, Kubernetes usa un valor por defecto segun el tag de la imagen. Es buena practica definirlo explicitamente.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validatePolicyValue(code: string) {
  const parsed = parsePod(code);
  if (!parsed) return { passed: true };
  const policy = getImagePullPolicy(parsed);
  if (policy === null) return { passed: true };
  if (VALID_POLICIES.indexOf(policy) === -1) {
    return {
      passed: false,
      errorMessage: [
        'Error: imagePullPolicy "' + policy + '" no es un valor valido',
        "",
        "Los valores aceptados son:",
        "- Always: siempre descarga la imagen del registro",
        "- IfNotPresent: solo descarga si no esta en cache local",
        "- Never: nunca descarga, solo usa la imagen local",
        "",
        "Los valores son case-sensitive. Asegurate de escribirlo exactamente.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

export const invalidImagepullpolicy: Exercise = {
  id: "k8s-06-invalid-imagepullpolicy",
  module: "kubernetes",
  title: "imagePullPolicy invalido",
  briefing:
    "El valor de imagePullPolicy no es valido. El API server lo rechaza. Corrige el valor para que el Pod pueda crearse.",
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
  terminalCommands: {
    "kubectl apply -f pod.yaml": handleApply,
    "kubectl get pods": handleGetPods,
    "kubectl describe pod nginx-app": handleDescribe,
  },
  validations: [
    {
      type: "syntax",
      errorMessage: "El YAML debe ser valido.",
      check: validateYaml,
    },
    {
      type: "semantic",
      errorMessage: "El campo imagePullPolicy debe estar definido.",
      check: validatePolicyExists,
    },
    {
      type: "intention",
      errorMessage: "El valor de imagePullPolicy debe ser Always, IfNotPresent o Never.",
      check: validatePolicyValue,
    },
  ],
  prerequisites: ["k8s-05-service-wrong-port"],
  hints: [
    'El error dice que "Sometimes" no es un valor soportado. Solo hay tres valores validos para imagePullPolicy.',
    "Los tres valores posibles son: Always, IfNotPresent y Never. Para una imagen con tag especifico como nginx:1.25, IfNotPresent es lo mas habitual.",
    'Solucion: cambia imagePullPolicy: Sometimes por imagePullPolicy: IfNotPresent (o Always, o Never).',
  ],
  successMessage: [
    "¡Correcto! El Pod ahora tiene un imagePullPolicy valido.",
    "",
    "Lo que aprendiste:",
    "- imagePullPolicy solo acepta tres valores: Always, IfNotPresent, Never",
    "- Always: cada vez que se crea un Pod, Kubernetes descarga la imagen",
    "- IfNotPresent: solo descarga si la imagen no esta en el nodo",
    "- Never: nunca descarga, falla si la imagen no esta en el nodo",
    "- Los valores son case-sensitive — hay que escribirlos exactamente",
    "- Si usas el tag :latest, Kubernetes usa Always por defecto",
  ].join("\n"),
};
