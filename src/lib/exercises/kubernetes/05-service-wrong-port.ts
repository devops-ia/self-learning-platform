import { Exercise, TerminalResponse } from "../types";
import * as yaml from "js-yaml";

function parseService(code: string): Record<string, unknown> | null {
  try {
    return yaml.load(code) as Record<string, unknown>;
  } catch (_e) {
    return null;
  }
}

function getFirstPort(parsed: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!parsed) return null;
  const spec = parsed.spec as Record<string, unknown> | undefined;
  const ports = spec?.ports as Record<string, unknown>[] | undefined;
  return ports?.[0] ?? null;
}

function hasTargetPort(parsed: Record<string, unknown> | null): boolean {
  const port = getFirstPort(parsed);
  if (!port) return false;
  return "targetPort" in port;
}

function handleApply(code: string): TerminalResponse {
  const parsed = parseService(code);
  if (!parsed) {
    return {
      output: 'error: error validating "service.yaml": error converting YAML to JSON: yaml: invalid YAML',
      exitCode: 1,
    };
  }

  const spec = parsed.spec as Record<string, unknown> | undefined;
  if (!spec || !spec.ports) {
    return {
      output: [
        'Error from server (Invalid): error when creating "service.yaml": Service "web" is invalid:',
        "spec.ports: Required value",
      ].join("\n"),
      exitCode: 1,
    };
  }

  const metadata = parsed.metadata as Record<string, unknown> | undefined;
  const name = metadata?.name || "web";
  return { output: "service/" + name + " created", exitCode: 0 };
}

function handleGetSvc(code: string): TerminalResponse {
  const parsed = parseService(code);
  if (!parsed) {
    return { output: "No resources found in default namespace.", exitCode: 0 };
  }

  const metadata = parsed.metadata as Record<string, unknown> | undefined;
  const name = metadata?.name || "web";
  const port = getFirstPort(parsed);
  const portNum = port?.port ?? 80;
  const targetPort = port?.targetPort ?? portNum;

  return {
    output: [
      "NAME   TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE",
      name + "    ClusterIP   10.96.145.23    <none>        " + portNum + "/TCP    5s",
    ].join("\n"),
    exitCode: 0,
  };
}

function handleDescribeSvc(code: string): TerminalResponse {
  const parsed = parseService(code);
  if (!parsed) {
    return {
      output: 'Error from server (NotFound): services "web" not found',
      exitCode: 1,
    };
  }

  const metadata = parsed.metadata as Record<string, unknown> | undefined;
  const name = metadata?.name || "web";
  const spec = parsed.spec as Record<string, unknown> | undefined;
  const selector = spec?.selector as Record<string, string> | undefined;
  const port = getFirstPort(parsed);
  const portNum = port?.port ?? 80;
  const targetPort = port?.targetPort ?? portNum;

  const selectorStr = selector
    ? Object.entries(selector).map(function (entry) { return entry[0] + "=" + entry[1]; }).join(",")
    : "<none>";

  return {
    output: [
      "Name:              " + name,
      "Namespace:         default",
      "Labels:            <none>",
      "Selector:          " + selectorStr,
      "Type:              ClusterIP",
      "IP:                10.96.145.23",
      "Port:              <unset>  " + portNum + "/TCP",
      "TargetPort:        " + targetPort + "/TCP",
      "Endpoints:         " + (hasTargetPort(parsed) ? "10.244.0.5:80" : "<none>"),
      "Session Affinity:  None",
      "Events:            <none>",
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

function validateTargetPortExists(code: string) {
  const parsed = parseService(code);
  if (!parsed) return { passed: true };
  if (!hasTargetPort(parsed)) {
    return {
      passed: false,
      errorMessage: [
        "Warning: el Service no tiene targetPort definido",
        "",
        "Sin targetPort, el Service envia el trafico al mismo numero que port. Si el container escucha en un puerto diferente, el trafico no llegara. Es buena practica definir siempre targetPort de forma explicita para evitar confusiones.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateTargetPortValue(code: string) {
  const parsed = parseService(code);
  if (!parsed) return { passed: true };
  const port = getFirstPort(parsed);
  if (!port || !("targetPort" in port)) return { passed: true };
  const targetPort = Number(port.targetPort);
  if (isNaN(targetPort) || targetPort <= 0 || targetPort > 65535) {
    return {
      passed: false,
      errorMessage: [
        "Error: targetPort debe ser un numero de puerto valido (1-65535)",
        "",
        "El targetPort indica el puerto del container al que se envia el trafico. Debe ser un numero valido.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

export const serviceWrongPort: Exercise = {
  id: "k8s-05-service-wrong-port",
  module: "kubernetes",
  title: "Service sin targetPort",
  briefing:
    "El Service existe, pero no enruta trafico al container. Falta un campo importante en la definicion del puerto.",
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
  terminalCommands: {
    "kubectl apply -f service.yaml": handleApply,
    "kubectl get svc": handleGetSvc,
    "kubectl describe svc web": handleDescribeSvc,
  },
  validations: [
    {
      type: "syntax",
      errorMessage: "El YAML debe ser valido.",
      check: validateYaml,
    },
    {
      type: "semantic",
      errorMessage: "El Service necesita un targetPort explicito.",
      check: validateTargetPortExists,
    },
    {
      type: "intention",
      errorMessage: "El targetPort debe ser un puerto valido.",
      check: validateTargetPortValue,
    },
  ],
  prerequisites: ["k8s-04-deployment-no-selector"],
  hints: [
    "Ejecuta kubectl describe svc web y mira el campo Endpoints. Si dice <none>, el trafico no esta llegando al Pod.",
    "Un Service tiene port (el puerto en el que el Service escucha) y targetPort (el puerto del container). Si falta targetPort, se usa el mismo valor que port.",
    'Solucion: anade targetPort: 80 debajo de port: 8080, para que el Service redirija del puerto 8080 al 80 del container.',
  ],
  successMessage: [
    "¡Bien hecho! El Service ahora enruta trafico correctamente al container.",
    "",
    "Lo que aprendiste:",
    "- port es el puerto donde el Service escucha dentro del cluster",
    "- targetPort es el puerto del container al que se reenvia el trafico",
    "- Si omites targetPort, Kubernetes asume que es igual a port",
    "- Es buena practica definir siempre targetPort de forma explicita",
    "- kubectl describe svc muestra Endpoints para verificar la conectividad",
  ].join("\n"),
};
