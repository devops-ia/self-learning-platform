import { Exercise, TerminalResponse } from "../types";
import * as yaml from "js-yaml";

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

function getProbePort(container: Record<string, unknown> | null): unknown {
  if (!container) return null;
  const probe = container.livenessProbe as Record<string, unknown> | undefined;
  const httpGet = probe?.httpGet as Record<string, unknown> | undefined;
  return httpGet?.port ?? null;
}

function isPortNumeric(port: unknown): boolean {
  if (port === null || port === undefined) return false;
  const num = Number(port);
  return !isNaN(num) && num > 0 && num <= 65535;
}

function handleApply(code: string): TerminalResponse {
  const parsed = parsePod(code);
  if (!parsed) {
    return {
      output: 'error: error validating "pod.yaml": error converting YAML to JSON: yaml: invalid YAML',
      exitCode: 1,
    };
  }

  const container = getContainer(parsed);
  const port = getProbePort(container);

  if (port !== null && !isPortNumeric(port)) {
    return {
      output: [
        'Error from server (Invalid): error when creating "pod.yaml": Pod "health-app" is invalid:',
        'spec.containers[0].livenessProbe.httpGet.port: Invalid value: "' + String(port) + '": must be a number or a valid port name (IANA_SVC_NAME)',
      ].join("\n"),
      exitCode: 1,
    };
  }

  const metadata = parsed.metadata as Record<string, unknown> | undefined;
  const name = metadata?.name || "health-app";
  return { output: "pod/" + name + " created", exitCode: 0 };
}

function handleGetPods(code: string): TerminalResponse {
  const parsed = parsePod(code);
  const container = getContainer(parsed);
  const port = getProbePort(container);

  if (!parsed || (port !== null && !isPortNumeric(port))) {
    return { output: "No resources found in default namespace.", exitCode: 0 };
  }

  const metadata = parsed.metadata as Record<string, unknown> | undefined;
  const name = metadata?.name || "health-app";
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
  if (!parsed) {
    return {
      output: 'Error from server (NotFound): pods "health-app" not found',
      exitCode: 1,
    };
  }

  const container = getContainer(parsed);
  const port = getProbePort(container);
  const containerPort = (container?.ports as Record<string, unknown>[] | undefined)?.[0]?.containerPort;
  const probe = container?.livenessProbe as Record<string, unknown> | undefined;
  const httpGet = probe?.httpGet as Record<string, unknown> | undefined;
  const path = httpGet?.path || "/healthz";

  if (port !== null && !isPortNumeric(port)) {
    return {
      output: [
        "Name:         health-app",
        "Namespace:    default",
        "Status:       Pending",
        "Containers:",
        "  app:",
        "    Image:          " + (container?.image || "nginx:1.25"),
        "    Port:           " + (containerPort || 8080) + "/TCP",
        "    Liveness:       http-get http://:" + String(port) + String(path) + " delay=5s timeout=1s period=10s",
        "Events:",
        "  Type     Reason            Age   From               Message",
        "  ----     ------            ----  ----               -------",
        '  Warning  FailedValidation  5s    kubelet            Error: invalid port "' + String(port) + '"',
      ].join("\n"),
      exitCode: 0,
    };
  }

  return {
    output: [
      "Name:         health-app",
      "Namespace:    default",
      "Status:       Running",
      "Containers:",
      "  app:",
      "    Image:          " + (container?.image || "nginx:1.25"),
      "    Port:           " + (containerPort || 8080) + "/TCP",
      "    Liveness:       http-get http://:" + String(port) + String(path) + " delay=5s timeout=1s period=10s",
      "    State:          Running",
      "    Ready:          True",
      "Events:",
      "  Type    Reason     Age   From               Message",
      "  ----    ------     ----  ----               -------",
      "  Normal  Scheduled  10s   default-scheduler  Successfully assigned default/health-app",
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

function validateProbeExists(code: string) {
  const parsed = parsePod(code);
  if (!parsed) return { passed: true };
  const container = getContainer(parsed);
  if (!container) return { passed: true };
  const probe = container.livenessProbe as Record<string, unknown> | undefined;
  if (!probe) {
    return {
      passed: false,
      errorMessage: [
        "Warning: el container no tiene livenessProbe definido",
        "",
        "Una livenessProbe permite a Kubernetes detectar si el container esta funcionando. Sin ella, Kubernetes solo sabe si el proceso principal ha terminado.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateProbePort(code: string) {
  const parsed = parsePod(code);
  if (!parsed) return { passed: true };
  const container = getContainer(parsed);
  const port = getProbePort(container);
  if (port === null) return { passed: true };

  if (!isPortNumeric(port)) {
    return {
      passed: false,
      errorMessage: [
        'Error: puerto del liveness probe "' + String(port) + '" no es valido',
        "",
        "El puerto del httpGet en el liveness probe debe ser un numero entero (1-65535) o un nombre de puerto IANA valido.",
        'El valor "' + String(port) + '" no es ni un numero ni un nombre de puerto registrado.',
        "Cambia el puerto a un valor numerico que coincida con el containerPort.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

export const brokenLiveness: Exercise = {
  id: "k8s-10-broken-liveness",
  module: "kubernetes",
  title: "LivenessProbe invalida",
  briefing:
    "El puerto del liveness probe no es valido. El Pod no puede pasar la validacion. Corrige el valor del puerto.",
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
  terminalCommands: {
    "kubectl apply -f pod.yaml": handleApply,
    "kubectl get pods": handleGetPods,
    "kubectl describe pod health-app": handleDescribe,
  },
  validations: [
    {
      type: "syntax",
      errorMessage: "El YAML debe ser valido.",
      check: validateYaml,
    },
    {
      type: "semantic",
      errorMessage: "El container debe tener un livenessProbe.",
      check: validateProbeExists,
    },
    {
      type: "intention",
      errorMessage: "El puerto del liveness probe debe ser numerico.",
      check: validateProbePort,
    },
  ],
  prerequisites: ["k8s-09-wrong-namespace"],
  hints: [
    'El error menciona un puerto invalido "eighty". Los puertos deben ser numericos o nombres IANA validos (como "http").',
    "El containerPort es 8080. El liveness probe debe apuntar al mismo puerto donde el container escucha.",
    'Solucion: cambia port: eighty por port: 8080 para que coincida con el containerPort del container.',
  ],
  successMessage: [
    "¡Perfecto! El liveness probe ahora apunta a un puerto valido.",
    "",
    "Lo que aprendiste:",
    "- Los puertos en livenessProbe.httpGet deben ser numericos o nombres IANA validos",
    '- Nombres como "http" (80) o "https" (443) son validos, pero strings arbitrarios no',
    "- El puerto del probe debe coincidir con el puerto donde la aplicacion escucha",
    "- livenessProbe detecta si el container esta vivo; si falla, Kubernetes lo reinicia",
    "- Tambien existen readinessProbe (para trafico) y startupProbe (para arranque lento)",
  ].join("\n"),
};
