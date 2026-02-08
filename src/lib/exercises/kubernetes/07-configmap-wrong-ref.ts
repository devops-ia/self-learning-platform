import { Exercise, TerminalResponse } from "../types";
import * as yaml from "js-yaml";

function parsePod(code: string): Record<string, unknown> | null {
  try {
    return yaml.load(code) as Record<string, unknown>;
  } catch (_e) {
    return null;
  }
}

function getEnvVars(parsed: Record<string, unknown> | null): Record<string, unknown>[] | null {
  if (!parsed) return null;
  const spec = parsed.spec as Record<string, unknown> | undefined;
  const containers = spec?.containers as Record<string, unknown>[] | undefined;
  const container = containers?.[0];
  if (!container) return null;
  return (container.env as Record<string, unknown>[]) ?? null;
}

function hasConfigMapRef(envVars: Record<string, unknown>[] | null): boolean {
  if (!envVars) return false;
  return envVars.some(function (envVar) {
    const valueFrom = envVar.valueFrom as Record<string, unknown> | undefined;
    return valueFrom && "configMapRef" in valueFrom;
  });
}

function hasConfigMapKeyRef(envVars: Record<string, unknown>[] | null): boolean {
  if (!envVars) return false;
  return envVars.some(function (envVar) {
    const valueFrom = envVar.valueFrom as Record<string, unknown> | undefined;
    return valueFrom && "configMapKeyRef" in valueFrom;
  });
}

function hasKeyField(envVars: Record<string, unknown>[] | null): boolean {
  if (!envVars) return false;
  return envVars.every(function (envVar) {
    const valueFrom = envVar.valueFrom as Record<string, unknown> | undefined;
    if (!valueFrom) return true;
    const keyRef = valueFrom.configMapKeyRef as Record<string, unknown> | undefined;
    if (!keyRef) return true;
    return "key" in keyRef;
  });
}

function handleApply(code: string): TerminalResponse {
  const parsed = parsePod(code);
  if (!parsed) {
    return {
      output: 'error: error validating "pod.yaml": error converting YAML to JSON: yaml: invalid YAML',
      exitCode: 1,
    };
  }

  const envVars = getEnvVars(parsed);
  if (hasConfigMapRef(envVars)) {
    return {
      output: [
        'Error from server (BadRequest): error when creating "pod.yaml": Pod in version "v1" cannot be handled as a Pod:',
        'strict decoding error: unknown field "spec.containers[0].env[0].valueFrom.configMapRef"',
      ].join("\n"),
      exitCode: 1,
    };
  }

  if (hasConfigMapKeyRef(envVars) && !hasKeyField(envVars)) {
    return {
      output: [
        'Error from server (Invalid): error when creating "pod.yaml": Pod "config-app" is invalid:',
        'spec.containers[0].env[0].valueFrom.configMapKeyRef.key: Required value',
      ].join("\n"),
      exitCode: 1,
    };
  }

  const metadata = parsed.metadata as Record<string, unknown> | undefined;
  const name = metadata?.name || "config-app";
  return { output: "pod/" + name + " created", exitCode: 0 };
}

function handleGetPods(code: string): TerminalResponse {
  const parsed = parsePod(code);
  const envVars = getEnvVars(parsed);
  if (!parsed || hasConfigMapRef(envVars) || (hasConfigMapKeyRef(envVars) && !hasKeyField(envVars))) {
    return { output: "No resources found in default namespace.", exitCode: 0 };
  }

  const metadata = parsed.metadata as Record<string, unknown> | undefined;
  const name = metadata?.name || "config-app";
  return {
    output: [
      "NAME          READY   STATUS    RESTARTS   AGE",
      name + "   1/1     Running   0          5s",
    ].join("\n"),
    exitCode: 0,
  };
}

function handleDescribe(code: string): TerminalResponse {
  const parsed = parsePod(code);
  const envVars = getEnvVars(parsed);
  if (!parsed || hasConfigMapRef(envVars)) {
    return {
      output: 'Error from server (NotFound): pods "config-app" not found',
      exitCode: 1,
    };
  }

  const spec = parsed.spec as Record<string, unknown> | undefined;
  const containers = spec?.containers as Record<string, unknown>[] | undefined;
  const container = containers?.[0];

  return {
    output: [
      "Name:         config-app",
      "Namespace:    default",
      "Status:       Running",
      "Containers:",
      "  app:",
      "    Image:          " + (container?.image || "busybox:1.36"),
      "    Environment:",
      "      DB_HOST:  <set to the key 'db_host' of config map 'app-config'>",
      "    State:          Running",
      "    Ready:          True",
      "Events:",
      "  Type    Reason     Age   From               Message",
      "  ----    ------     ----  ----               -------",
      "  Normal  Scheduled  10s   default-scheduler  Successfully assigned default/config-app",
      "  Normal  Pulled     9s    kubelet            Container image already present",
      "  Normal  Created    9s    kubelet            Created container app",
      "  Normal  Started    8s    kubelet            Started container app",
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

function validateUsesConfigMapKeyRef(code: string) {
  const parsed = parsePod(code);
  if (!parsed) return { passed: true };
  const envVars = getEnvVars(parsed);
  if (hasConfigMapRef(envVars)) {
    return {
      passed: false,
      errorMessage: [
        'Error: unknown field "valueFrom.configMapRef"',
        "",
        'El campo correcto es "configMapKeyRef", no "configMapRef". configMapKeyRef referencia una clave especifica dentro de un ConfigMap. configMapRef no existe como campo en la API de Kubernetes.',
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateHasKeyField(code: string) {
  const parsed = parsePod(code);
  if (!parsed) return { passed: true };
  const envVars = getEnvVars(parsed);
  if (!hasConfigMapKeyRef(envVars)) return { passed: true };
  if (!hasKeyField(envVars)) {
    return {
      passed: false,
      errorMessage: [
        "Error: configMapKeyRef.key: Required value",
        "",
        "configMapKeyRef necesita tres campos:",
        "- name: el nombre del ConfigMap",
        "- key: la clave dentro del ConfigMap de la que leer el valor",
        "- optional (opcional): si true, no falla cuando el ConfigMap no existe",
      ].join("\n"),
    };
  }
  return { passed: true };
}

export const configmapWrongRef: Exercise = {
  id: "k8s-07-configmap-wrong-ref",
  module: "kubernetes",
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
  terminalCommands: {
    "kubectl apply -f pod.yaml": handleApply,
    "kubectl get pods": handleGetPods,
    "kubectl describe pod config-app": handleDescribe,
  },
  validations: [
    {
      type: "syntax",
      errorMessage: "El YAML debe ser valido.",
      check: validateYaml,
    },
    {
      type: "semantic",
      errorMessage: 'Usa "configMapKeyRef" en lugar de "configMapRef".',
      check: validateUsesConfigMapKeyRef,
    },
    {
      type: "intention",
      errorMessage: "configMapKeyRef necesita el campo key.",
      check: validateHasKeyField,
    },
  ],
  prerequisites: ["k8s-06-invalid-imagepullpolicy"],
  hints: [
    'El error dice que "configMapRef" es un campo desconocido. Revisa la documentacion de envVar.valueFrom — el nombre del campo es ligeramente diferente.',
    'El campo correcto es "configMapKeyRef" (con Key en el nombre). Ademas, necesitas indicar que clave del ConfigMap quieres leer.',
    'Solucion: cambia "configMapRef" por "configMapKeyRef" y anade el campo key con el nombre de la clave, por ejemplo: key: db_host.',
  ],
  successMessage: [
    "¡Excelente! El Pod ahora puede leer correctamente la variable del ConfigMap.",
    "",
    "Lo que aprendiste:",
    '- Para leer una clave especifica de un ConfigMap se usa "configMapKeyRef", no "configMapRef"',
    "- configMapKeyRef necesita dos campos obligatorios: name (del ConfigMap) y key (la clave a leer)",
    "- Tambien existe envFrom.configMapRef para cargar todas las claves de un ConfigMap como variables de entorno",
    "- Para Secrets, el campo equivalente es secretKeyRef",
    "- Los errores de strict decoding te indican exactamente que campo es desconocido",
  ].join("\n"),
};
