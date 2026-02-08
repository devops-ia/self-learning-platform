import { Exercise, TerminalResponse } from "../types";
import * as yaml from "js-yaml";

function parseSecret(code: string): Record<string, unknown> | null {
  try {
    return yaml.load(code) as Record<string, unknown>;
  } catch (_e) {
    return null;
  }
}

function usesStringData(parsed: Record<string, unknown> | null): boolean {
  if (!parsed) return false;
  return "stringData" in parsed;
}

function usesData(parsed: Record<string, unknown> | null): boolean {
  if (!parsed) return false;
  return "data" in parsed;
}

function isBase64(value: string): boolean {
  const pattern = /^[A-Za-z0-9+/]+=*$/;
  return pattern.test(value) && value.length > 0;
}

function dataValuesAreBase64(parsed: Record<string, unknown> | null): boolean {
  if (!parsed) return false;
  const data = parsed.data as Record<string, unknown> | undefined;
  if (!data) return false;
  for (const key of Object.keys(data)) {
    const value = String(data[key]);
    if (!isBase64(value)) return false;
  }
  return true;
}

function isSecretValid(parsed: Record<string, unknown> | null): boolean {
  if (!parsed) return false;
  if (usesStringData(parsed)) return true;
  if (usesData(parsed) && dataValuesAreBase64(parsed)) return true;
  return false;
}

function handleApply(code: string): TerminalResponse {
  const parsed = parseSecret(code);
  if (!parsed) {
    return {
      output: 'error: error validating "secret.yaml": error converting YAML to JSON: yaml: invalid YAML',
      exitCode: 1,
    };
  }

  if (usesData(parsed) && !dataValuesAreBase64(parsed)) {
    const data = parsed.data as Record<string, unknown>;
    const firstKey = Object.keys(data)[0];
    return {
      output: [
        'Error from server (Invalid): error when creating "secret.yaml": Secret "db-credentials" is invalid:',
        "data[" + firstKey + "]: Invalid value: illegal base64 data at input byte 2",
      ].join("\n"),
      exitCode: 1,
    };
  }

  return { output: "secret/db-credentials created", exitCode: 0 };
}

function handleGetSecrets(code: string): TerminalResponse {
  const parsed = parseSecret(code);
  if (!isSecretValid(parsed)) {
    return { output: "No resources found in default namespace.", exitCode: 0 };
  }

  return {
    output: [
      "NAME              TYPE     DATA   AGE",
      "db-credentials    Opaque   2      5s",
    ].join("\n"),
    exitCode: 0,
  };
}

function handleDescribeSecret(code: string): TerminalResponse {
  const parsed = parseSecret(code);
  if (!isSecretValid(parsed)) {
    return {
      output: 'Error from server (NotFound): secrets "db-credentials" not found',
      exitCode: 1,
    };
  }

  const data = (parsed?.stringData || parsed?.data) as Record<string, unknown> | undefined;
  const keys = data ? Object.keys(data) : [];
  const dataLines = keys.map(function (key) {
    return "  " + key + ":  " + String(data![key]).length + " bytes";
  });

  return {
    output: [
      "Name:         db-credentials",
      "Namespace:    default",
      "Labels:       <none>",
      "Annotations:  <none>",
      "",
      "Type:  Opaque",
      "",
      "Data",
      "====",
    ].concat(dataLines).join("\n"),
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

function validateSecretEncoding(code: string) {
  const parsed = parseSecret(code);
  if (!parsed) return { passed: true };

  if (usesData(parsed) && !dataValuesAreBase64(parsed) && !usesStringData(parsed)) {
    return {
      passed: false,
      errorMessage: [
        "Error: illegal base64 data",
        "",
        "Cuando usas el campo data en un Secret, los valores deben estar codificados en base64.",
        "Tienes dos opciones:",
        '1. Usar "stringData" en lugar de "data" — Kubernetes codifica los valores automaticamente',
        '2. Codificar los valores manualmente con: echo -n "mi-valor" | base64',
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateHasSecretData(code: string) {
  const parsed = parseSecret(code);
  if (!parsed) return { passed: true };
  if (!usesData(parsed) && !usesStringData(parsed)) {
    return {
      passed: false,
      errorMessage: [
        "Error: el Secret no tiene datos definidos",
        "",
        "Un Secret necesita al menos un campo data o stringData con los valores secretos.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

export const secretPlaintext: Exercise = {
  id: "k8s-08-secret-plaintext",
  module: "kubernetes",
  title: "Secret en texto plano",
  briefing:
    "Este Secret usa el campo data pero los valores no estan codificados en base64. El API server rechaza los datos. Corrige la codificacion o usa una alternativa.",
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
  terminalCommands: {
    "kubectl apply -f secret.yaml": handleApply,
    "kubectl get secrets": handleGetSecrets,
    "kubectl describe secret db-credentials": handleDescribeSecret,
  },
  validations: [
    {
      type: "syntax",
      errorMessage: "El YAML debe ser valido.",
      check: validateYaml,
    },
    {
      type: "semantic",
      errorMessage: "El Secret debe tener datos definidos (data o stringData).",
      check: validateHasSecretData,
    },
    {
      type: "intention",
      errorMessage: "Los valores en data deben estar en base64, o usa stringData para texto plano.",
      check: validateSecretEncoding,
    },
  ],
  prerequisites: ["k8s-07-configmap-wrong-ref"],
  hints: [
    "El error dice 'illegal base64 data'. El campo data espera valores codificados en base64, no texto plano.",
    "Tienes dos opciones: codificar los valores en base64 (echo -n 'admin' | base64 da YWRtaW4=), o usar stringData en lugar de data.",
    'Solucion mas sencilla: cambia "data:" por "stringData:" y deja los valores en texto plano. Kubernetes los codificara automaticamente.',
  ],
  successMessage: [
    "¡Bien! El Secret ahora se crea correctamente.",
    "",
    "Lo que aprendiste:",
    '- El campo "data" requiere valores codificados en base64',
    '- El campo "stringData" acepta valores en texto plano y Kubernetes los codifica',
    "- base64 NO es cifrado — es solo una codificacion. Los Secrets se almacenan en etcd",
    "- Para cifrado real, necesitas EncryptionConfiguration o herramientas como Sealed Secrets",
    '- Puedes codificar con: echo -n "valor" | base64',
    '- Y decodificar con: echo "dmFsb3I=" | base64 --decode',
  ].join("\n"),
};
