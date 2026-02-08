import { Exercise, TerminalResponse } from "../types";
import * as yaml from "js-yaml";

function parseDeployment(code: string) {
  try {
    const parsed = yaml.load(code) as Record<string, unknown>;
    return parsed;
  } catch (_e) {
    return null;
  }
}

function getContainer(parsed: Record<string, unknown> | null) {
  if (!parsed) return null;
  const spec = parsed.spec as Record<string, unknown> | undefined;
  const template = spec?.template as Record<string, unknown> | undefined;
  const templateSpec = template?.spec as Record<string, unknown> | undefined;
  const containers = templateSpec?.containers as Record<string, unknown>[] | undefined;
  return containers?.[0] ?? null;
}

function hasBadCommand(container: Record<string, unknown> | null): boolean {
  if (!container?.command) return false;
  const cmd = container.command as string[];
  if (Array.isArray(cmd)) {
    return cmd.some((c) => c.includes("start-server"));
  }
  return String(cmd).includes("start-server");
}

function getProbePort(container: Record<string, unknown> | null): number | null {
  const probe = container?.livenessProbe as Record<string, unknown> | undefined;
  const httpGet = probe?.httpGet as Record<string, unknown> | undefined;
  return (httpGet?.port as number) ?? null;
}

function getContainerPort(container: Record<string, unknown> | null): number | null {
  const ports = container?.ports as Record<string, unknown>[] | undefined;
  return (ports?.[0]?.containerPort as number) ?? null;
}

function handleApply(code: string): TerminalResponse {
  const parsed = parseDeployment(code);
  if (!parsed) {
    return {
      output: "error: error parsing deployment.yaml: error converting YAML to JSON",
      exitCode: 1,
    };
  }
  const container = getContainer(parsed);
  if (parsed.kind === "Deployment" && container) {
    return { output: "deployment.apps/web-app created", exitCode: 0 };
  }
  return {
    output: 'error: error validating "deployment.yaml": error validating data',
    exitCode: 1,
  };
}

function handleGetPods(code: string): TerminalResponse {
  const parsed = parseDeployment(code);
  const container = getContainer(parsed);
  if (!container) {
    return { output: "No resources found in default namespace.", exitCode: 0 };
  }

  if (hasBadCommand(container)) {
    return {
      output:
        "NAME                       READY   STATUS             RESTARTS      AGE\nweb-app-7d4f8b6c9-x2k4p   0/1     CrashLoopBackOff   4 (12s ago)   2m",
      exitCode: 0,
    };
  }

  const probePort = getProbePort(container);
  const containerPort = getContainerPort(container);
  if (probePort && containerPort && probePort !== containerPort) {
    return {
      output:
        "NAME                       READY   STATUS    RESTARTS      AGE\nweb-app-7d4f8b6c9-x2k4p   0/1     Running   3 (5s ago)    1m",
      exitCode: 0,
    };
  }

  return {
    output:
      "NAME                       READY   STATUS    RESTARTS   AGE\nweb-app-7d4f8b6c9-x2k4p   1/1     Running   0          30s",
    exitCode: 0,
  };
}

function handleLogs(code: string): TerminalResponse {
  const parsed = parseDeployment(code);
  const container = getContainer(parsed);

  if (hasBadCommand(container)) {
    return {
      output:
        '/docker-entrypoint.sh: error: /bin/start-server: No such file or directory\n/docker-entrypoint.sh: error: can not execute: Is a directory or not found',
      exitCode: 1,
    };
  }

  return {
    output: [
      "/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration",
      "/docker-entrypoint.sh: Looking for shell scripts in /docker-entrypoint.d/",
      "/docker-entrypoint.sh: Configuration complete; ready for start up",
      "2025/01/01 00:00:00 [notice] 1#1: using the \"epoll\" event method",
      "2025/01/01 00:00:00 [notice] 1#1: nginx/1.25.0",
      "2025/01/01 00:00:00 [notice] 1#1: start worker processes",
    ].join("\n"),
    exitCode: 0,
  };
}

function handleDescribe(code: string): TerminalResponse {
  const parsed = parseDeployment(code);
  const container = getContainer(parsed);

  if (!container) {
    return {
      output: 'Error from server (NotFound): pods "web-app-7d4f8b6c9-x2k4p" not found',
      exitCode: 1,
    };
  }

  const probePort = getProbePort(container);
  const containerPort = getContainerPort(container);
  const cmdStr = container.command ? JSON.stringify(container.command) : "<none>";

  if (hasBadCommand(container)) {
    return {
      output: [
        "Name:         web-app-7d4f8b6c9-x2k4p",
        "Namespace:    default",
        "Status:       Running",
        "Containers:",
        "  web:",
        "    Image:         nginx:1.25",
        "    Command:       " + cmdStr,
        "    Port:          " + (containerPort || "<none>"),
        "    State:         Waiting",
        "      Reason:      CrashLoopBackOff",
        "    Last State:    Terminated",
        "      Reason:      Error",
        "      Exit Code:   127",
        "      Message:     /bin/start-server: not found",
        "    Ready:         False",
        "    Restart Count: 4",
        "Events:",
        "  Type     Reason     Age                From               Message",
        "  ----     ------     ----               ----               -------",
        "  Normal   Scheduled  2m                 default-scheduler  Successfully assigned",
        '  Normal   Pulled     90s (x4 over 2m)   kubelet            Container image "nginx:1.25" already present',
        "  Normal   Created    90s (x4 over 2m)   kubelet            Created container web",
        "  Warning  BackOff    10s (x8 over 90s)  kubelet            Back-off restarting failed container",
      ].join("\n"),
      exitCode: 0,
    };
  }

  if (probePort && containerPort && probePort !== containerPort) {
    return {
      output: [
        "Name:         web-app-7d4f8b6c9-x2k4p",
        "Namespace:    default",
        "Status:       Running",
        "Containers:",
        "  web:",
        "    Image:          nginx:1.25",
        "    Port:           " + containerPort,
        "    State:          Running",
        "    Ready:          False",
        "    Liveness:       http-get http://:" + probePort + "/healthz delay=5s timeout=1s period=10s",
        "Events:",
        "  Type     Reason     Age              From     Message",
        "  ----     ------     ----             ----     -------",
        "  Normal   Started    1m               kubelet  Started container web",
        "  Warning  Unhealthy  5s (x3 over 25s) kubelet  Liveness probe failed: Get \"http://10.244.0.5:" + probePort + "/healthz\": dial tcp 10.244.0.5:" + probePort + ": connect: connection refused",
      ].join("\n"),
      exitCode: 0,
    };
  }

  const port = containerPort || 80;
  const livePort = probePort || containerPort || 80;
  return {
    output: [
      "Name:         web-app-7d4f8b6c9-x2k4p",
      "Namespace:    default",
      "Status:       Running",
      "Containers:",
      "  web:",
      "    Image:          nginx:1.25",
      "    Port:           " + port,
      "    State:          Running",
      "    Ready:          True",
      "    Liveness:       http-get http://:" + livePort + "/healthz delay=5s timeout=1s period=10s",
      "Events:",
      "  Type    Reason   Age   From     Message",
      "  ----    ------   ----  ----     -------",
      "  Normal  Started  30s   kubelet  Started container web",
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
      errorMessage: "Error: YAML parse error\n\n" + (e instanceof Error ? e.message : "YAML inválido"),
    };
  }
}

function validateCommand(code: string) {
  const parsed = parseDeployment(code);
  const container = getContainer(parsed);
  if (hasBadCommand(container)) {
    return {
      passed: false,
      errorMessage: [
        'Error: container exited with code 127 — "/bin/start-server: not found"',
        "",
        "La imagen nginx:1.25 no tiene un binario llamado /bin/start-server. El entrypoint por defecto de nginx ya arranca el servidor. Puedes:",
        '1. Eliminar el campo "command" para usar el entrypoint por defecto de la imagen',
        '2. O usar un comando que exista, como ["nginx", "-g", "daemon off;"]',
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateProbePort(code: string) {
  const parsed = parseDeployment(code);
  const container = getContainer(parsed);
  const probePort = getProbePort(container);
  const containerPort = getContainerPort(container);

  if (probePort && containerPort && probePort !== containerPort) {
    return {
      passed: false,
      errorMessage: [
        "Warning: Liveness probe apunta al puerto " + probePort + ", pero el container escucha en " + containerPort,
        "",
        "El liveness probe hace un HTTP GET al puerto " + probePort + ", pero nginx escucha en el puerto " + containerPort + ". Kubernetes va a pensar que el container está muerto y lo va a reiniciar infinitamente. Cambia el puerto del probe para que coincida con el del container.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

export const crashloopDebug: Exercise = {
  id: "k8s-02-crashloop-debug",
  module: "kubernetes",
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
  terminalCommands: {
    "kubectl apply -f deployment.yaml": handleApply,
    "kubectl get pods": handleGetPods,
    "kubectl logs web-app-7d4f8b6c9-x2k4p": handleLogs,
    "kubectl describe pod web-app-7d4f8b6c9-x2k4p": handleDescribe,
  },
  validations: [
    {
      type: "syntax",
      errorMessage: "El YAML debe ser válido.",
      check: validateYaml,
    },
    {
      type: "semantic",
      errorMessage: "El comando del container no existe en la imagen nginx.",
      check: validateCommand,
    },
    {
      type: "intention",
      errorMessage: "El puerto del liveness probe no coincide con el del container.",
      check: validateProbePort,
    },
  ],
  prerequisites: ["k8s-01-invalid-pod"],
  hints: [
    'Revisa los logs: ¿qué dice sobre "/bin/start-server"? ¿Existe ese binario en la imagen nginx?',
    "Si nginx ya sabe cómo arrancar, ¿necesitas un command custom? Además, revisa que el liveness probe apunte al puerto correcto.",
    'Solución: 1) Elimina el campo "command" (nginx arranca solo), 2) Cambia el puerto del liveness probe de 8080 a 80.',
  ],
  successMessage: [
    "¡Muy bien! El Deployment está sano y el Pod no va a crashear.",
    "",
    "Lo que aprendiste:",
    "- CrashLoopBackOff generalmente significa que el container muere al arrancar → revisa los logs",
    '- Exit code 127 = "command not found" — la imagen no tiene ese binario',
    "- Las imágenes oficiales tienen entrypoints sensatos — no los sobreescribas sin razón",
    "- El liveness probe debe apuntar al mismo puerto donde el container escucha",
    "- Si el probe falla, Kubernetes reinicia el container → loop infinito",
  ].join("\n"),
};
