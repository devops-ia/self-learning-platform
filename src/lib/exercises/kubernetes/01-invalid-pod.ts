import { Exercise, TerminalResponse } from "../types";
import * as yaml from "js-yaml";

interface Container {
  name?: string;
  image?: string;
  ports?: { containerPort?: number }[];
}

function parsePod(code: string): Record<string, unknown> | null {
  try {
    return yaml.load(code) as Record<string, unknown>;
  } catch (_e) {
    return null;
  }
}

function handleApply(code: string): TerminalResponse {
  const parsed = parsePod(code);
  if (!parsed) {
    return {
      output: 'error: error validating "pod.yaml": error validating data: invalid YAML',
      exitCode: 1,
    };
  }

  const spec = parsed.spec as Record<string, unknown> | undefined;
  if (!spec) {
    return {
      output:
        'Error from server (BadRequest): error when creating "pod.yaml": Pod in version "v1" cannot be handled as a Pod: strict decoding error: missing required field "spec"',
      exitCode: 1,
    };
  }

  if ((spec as Record<string, unknown>).container && !spec.containers) {
    return {
      output: [
        'Error from server (BadRequest): error when creating "pod.yaml": Pod in version "v1" cannot be handled as a Pod: strict decoding error: unknown field "spec.container"',
        "",
        'Hint: the field name is "containers" (plural), and it must be a list (array).',
      ].join("\n"),
      exitCode: 1,
    };
  }

  if (spec.containers && !Array.isArray(spec.containers)) {
    return {
      output: [
        'Error from server (BadRequest): error when creating "pod.yaml": Pod in version "v1" cannot be handled as a Pod: json: cannot unmarshal object into Go struct field PodSpec.spec.containers of type []v1.Container',
        "",
        'The "containers" field must be a YAML list (array), not a single object.',
      ].join("\n"),
      exitCode: 1,
    };
  }

  if (Array.isArray(spec.containers)) {
    for (const c of spec.containers as Container[]) {
      if (!c.image) {
        return {
          output:
            'Error from server (BadRequest): error when creating "pod.yaml": Pod in version "v1" cannot be handled as a Pod: strict decoding error: missing required field "image" in container "' +
            (c.name || "unknown") +
            '"',
          exitCode: 1,
        };
      }
      if (!c.name) {
        return {
          output:
            'Error from server (BadRequest): error when creating "pod.yaml": Pod in version "v1" cannot be handled as a Pod: strict decoding error: missing required field "name" in container',
          exitCode: 1,
        };
      }
    }
  }

  return { output: "pod/nginx-pod created", exitCode: 0 };
}

function handleGetPods(code: string): TerminalResponse {
  const parsed = parsePod(code);
  const spec = parsed?.spec as Record<string, unknown> | undefined;
  const isValid =
    spec?.containers &&
    Array.isArray(spec.containers) &&
    (spec.containers as Container[]).every((c) => c.name && c.image);

  if (isValid) {
    return {
      output:
        "NAME        READY   STATUS    RESTARTS   AGE\nnginx-pod   1/1     Running   0          5s",
      exitCode: 0,
    };
  }
  return { output: "No resources found in default namespace.", exitCode: 0 };
}

function handleDescribe(code: string): TerminalResponse {
  const parsed = parsePod(code);
  const spec = parsed?.spec as Record<string, unknown> | undefined;
  const isValid =
    spec?.containers &&
    Array.isArray(spec.containers) &&
    (spec.containers as Container[]).every((c) => c.name && c.image);

  if (!isValid) {
    return {
      output: 'Error from server (NotFound): pods "nginx-pod" not found',
      exitCode: 1,
    };
  }

  const container = (spec!.containers as Container[])[0];
  const port = container.ports?.[0]?.containerPort || "<none>";

  return {
    output: [
      "Name:         nginx-pod",
      "Namespace:    default",
      "Status:       Running",
      "IP:           10.244.0.5",
      "Containers:",
      "  " + container.name + ":",
      "    Image:          " + container.image,
      "    Port:           " + port,
      "    State:          Running",
      "      Started:      Sun, 01 Jan 2025 00:00:00 +0000",
      "    Ready:          True",
      "Events:",
      "  Type    Reason     Age   From               Message",
      "  ----    ------     ----  ----               -------",
      "  Normal  Scheduled  10s   default-scheduler  Successfully assigned default/nginx-pod",
      '  Normal  Pulled     9s    kubelet            Container image "' + container.image + '" already present',
      "  Normal  Created    9s    kubelet            Created container " + container.name,
      "  Normal  Started    8s    kubelet            Started container " + container.name,
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
        e instanceof Error ? e.message : "YAML inválido",
        "",
        "Revisa la indentación. En YAML, la indentación define la estructura. Cada nivel usa 2 espacios (no tabs).",
      ].join("\n"),
    };
  }
}

function validateContainersPlural(code: string) {
  const parsed = parsePod(code);
  if (!parsed) return { passed: true }; // syntax error handled by YAML check
  const spec = parsed.spec as Record<string, unknown> | undefined;
  if (spec && (spec as Record<string, unknown>).container && !spec.containers) {
    return {
      passed: false,
      errorMessage: [
        'Error: unknown field "spec.container"',
        "",
        'El API server de Kubernetes espera "containers" (plural), no "container". Es un error muy común. Un Pod puede tener múltiples containers (sidecar pattern), por eso el campo es una lista.',
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateContainersArray(code: string) {
  const parsed = parsePod(code);
  if (!parsed) return { passed: true };
  const spec = parsed.spec as Record<string, unknown> | undefined;
  if (spec?.containers && !Array.isArray(spec.containers)) {
    return {
      passed: false,
      errorMessage: [
        "Error: cannot unmarshal object into field PodSpec.spec.containers of type []v1.Container",
        "",
        '"containers" debe ser un array YAML (cada elemento empieza con "- "). Ejemplo:',
        "containers:",
        "  - name: nginx",
        "    image: nginx:1.25",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateContainerFields(code: string) {
  const parsed = parsePod(code);
  if (!parsed) return { passed: true };
  const spec = parsed.spec as Record<string, unknown> | undefined;
  const containers = spec?.containers;
  if (Array.isArray(containers)) {
    for (const c of containers as Container[]) {
      if (!c.name) {
        return {
          passed: false,
          errorMessage: [
            'Error: missing required field "name" in container',
            "",
            'Cada container en la lista necesita un campo "name" que lo identifique.',
          ].join("\n"),
        };
      }
      if (!c.image) {
        return {
          passed: false,
          errorMessage: [
            'Error: missing required field "image" in container "' + c.name + '"',
            "",
            'Cada container necesita un "image" que especifique qué imagen de Docker usar.',
          ].join("\n"),
        };
      }
    }
  }
  return { passed: true };
}

export const invalidPod: Exercise = {
  id: "k8s-01-invalid-pod",
  module: "kubernetes",
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
  terminalCommands: {
    "kubectl apply -f pod.yaml": handleApply,
    "kubectl get pods": handleGetPods,
    "kubectl describe pod nginx-pod": handleDescribe,
  },
  validations: [
    {
      type: "syntax",
      errorMessage: "El YAML debe ser válido.",
      check: validateYaml,
    },
    {
      type: "semantic",
      errorMessage: 'El campo correcto es "containers" (plural), no "container".',
      check: validateContainersPlural,
    },
    {
      type: "semantic",
      errorMessage: '"containers" debe ser una lista (array).',
      check: validateContainersArray,
    },
    {
      type: "intention",
      errorMessage: "Cada container debe tener name e image.",
      check: validateContainerFields,
    },
  ],
  prerequisites: [],
  hints: [
    '¿"container" o "containers"? Kubernetes usa el plural porque un Pod puede tener varios containers.',
    'En YAML, una lista se define con "-" al inicio de cada elemento. containers: debe tener items con "- name: ...".',
    'Solución: cambia "container:" por "containers:" y haz que sea una lista con "- name: nginx".',
  ],
  successMessage: [
    "¡Excelente! El Pod YAML es válido y el API server lo aceptaría.",
    "",
    "Lo que aprendiste:",
    '- "containers" es plural y es un array — un Pod puede tener múltiples containers',
    '- Cada container necesita "name" e "image" como mínimo',
    "- La indentación en YAML es crucial — define la estructura del documento",
    "- kubectl apply valida contra el schema de la API antes de crear el recurso",
  ].join("\n"),
};
