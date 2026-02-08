import { Exercise, TerminalResponse } from "../types";
import * as yaml from "js-yaml";

function parseRole(code: string): Record<string, unknown> | null {
  try {
    return yaml.load(code) as Record<string, unknown>;
  } catch (_e) {
    return null;
  }
}

function getRules(parsed: Record<string, unknown> | null): Record<string, unknown>[] | null {
  if (!parsed) return null;
  const rules = parsed.rules as Record<string, unknown>[] | undefined;
  return rules ?? null;
}

function allRulesHaveVerbs(rules: Record<string, unknown>[] | null): boolean {
  if (!rules || rules.length === 0) return false;
  return rules.every(function (rule) {
    const verbs = rule.verbs;
    return Array.isArray(verbs) && verbs.length > 0;
  });
}

function allRulesHaveResources(rules: Record<string, unknown>[] | null): boolean {
  if (!rules || rules.length === 0) return false;
  return rules.every(function (rule) {
    const resources = rule.resources;
    return Array.isArray(resources) && resources.length > 0;
  });
}

function handleApply(code: string): TerminalResponse {
  const parsed = parseRole(code);
  if (!parsed) {
    return {
      output: 'error: error validating "role.yaml": error converting YAML to JSON: yaml: invalid YAML',
      exitCode: 1,
    };
  }

  const rules = getRules(parsed);
  if (!rules || rules.length === 0) {
    return {
      output: [
        'Error from server (Invalid): error when creating "role.yaml": Role.rbac.authorization.k8s.io "pod-reader" is invalid:',
        "rules: Required value: rules must have at least one entry",
      ].join("\n"),
      exitCode: 1,
    };
  }

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (!rule.verbs || !Array.isArray(rule.verbs) || rule.verbs.length === 0) {
      return {
        output: [
          'Error from server (Invalid): error when creating "role.yaml": Role.rbac.authorization.k8s.io "pod-reader" is invalid:',
          "rules[" + i + "].verbs: Required value: verbs must contain at least one value",
        ].join("\n"),
        exitCode: 1,
      };
    }
  }

  const metadata = parsed.metadata as Record<string, unknown> | undefined;
  const name = metadata?.name || "pod-reader";
  return { output: "role.rbac.authorization.k8s.io/" + name + " created", exitCode: 0 };
}

function handleGetRoles(code: string): TerminalResponse {
  const parsed = parseRole(code);
  const rules = getRules(parsed);
  if (!rules || !allRulesHaveVerbs(rules)) {
    return { output: "No resources found in default namespace.", exitCode: 0 };
  }

  const metadata = parsed!.metadata as Record<string, unknown> | undefined;
  const name = metadata?.name || "pod-reader";
  return {
    output: [
      "NAME          CREATED AT",
      name + "   2025-01-01T00:00:00Z",
    ].join("\n"),
    exitCode: 0,
  };
}

function handleDescribeRole(code: string): TerminalResponse {
  const parsed = parseRole(code);
  const rules = getRules(parsed);
  if (!parsed || !rules || !allRulesHaveVerbs(rules)) {
    return {
      output: 'Error from server (NotFound): roles.rbac.authorization.k8s.io "pod-reader" not found',
      exitCode: 1,
    };
  }

  const policyLines: string[] = [];
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const resources = (rule.resources as string[]) || [];
    const verbs = (rule.verbs as string[]) || [];
    const apiGroups = (rule.apiGroups as string[]) || [""];
    policyLines.push("  " + resources.join(", ") + "  []  [" + apiGroups.join(", ") + "]  [" + verbs.join(", ") + "]");
  }

  return {
    output: [
      "Name:         pod-reader",
      "Labels:       <none>",
      "Annotations:  <none>",
      "PolicyRule:",
      "  Resources  Non-Resource URLs  Resource Names  Verbs",
      "  ---------  -----------------  --------------  -----",
    ].concat(policyLines).join("\n"),
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

function validateVerbsExist(code: string) {
  const parsed = parseRole(code);
  if (!parsed) return { passed: true };
  const rules = getRules(parsed);
  if (!rules || rules.length === 0) return { passed: true };

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (!rule.verbs || !Array.isArray(rule.verbs) || rule.verbs.length === 0) {
      return {
        passed: false,
        errorMessage: [
          "Error: rules[" + i + "].verbs: Required value",
          "",
          "Cada regla de un Role necesita el campo verbs para especificar que acciones se permiten. Sin verbs, la regla no concede ningun permiso.",
        ].join("\n"),
      };
    }
  }
  return { passed: true };
}

function validateVerbsAreValid(code: string) {
  const parsed = parseRole(code);
  if (!parsed) return { passed: true };
  const rules = getRules(parsed);
  if (!rules) return { passed: true };

  const validVerbs = ["get", "list", "watch", "create", "update", "patch", "delete", "deletecollection", "*"];

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const verbs = rule.verbs as string[] | undefined;
    if (!verbs || !Array.isArray(verbs)) continue;
    for (let j = 0; j < verbs.length; j++) {
      if (validVerbs.indexOf(verbs[j]) === -1) {
        return {
          passed: false,
          errorMessage: [
            'Warning: verbo "' + verbs[j] + '" no es un verbo estandar de la API de Kubernetes',
            "",
            "Los verbos validos son: get, list, watch, create, update, patch, delete, deletecollection, *",
          ].join("\n"),
        };
      }
    }
  }
  return { passed: true };
}

export const rbacNoVerbs: Exercise = {
  id: "k8s-11-rbac-no-verbs",
  module: "kubernetes",
  title: "Role sin permisos",
  briefing:
    "Este Role define recursos pero no concede ninguna accion sobre ellos. Falta un campo obligatorio en las reglas.",
  language: "yaml",
  initialCode: [
    "apiVersion: rbac.authorization.k8s.io/v1",
    "kind: Role",
    "metadata:",
    "  name: pod-reader",
    "  namespace: default",
    "rules:",
    '  - apiGroups: [""]',
    '    resources: ["pods", "pods/log"]',
    "",
  ].join("\n"),
  terminalCommands: {
    "kubectl apply -f role.yaml": handleApply,
    "kubectl get roles": handleGetRoles,
    "kubectl describe role pod-reader": handleDescribeRole,
  },
  validations: [
    {
      type: "syntax",
      errorMessage: "El YAML debe ser valido.",
      check: validateYaml,
    },
    {
      type: "semantic",
      errorMessage: "Cada regla debe tener un campo verbs con al menos un valor.",
      check: validateVerbsExist,
    },
    {
      type: "intention",
      errorMessage: "Los verbos deben ser acciones validas de la API de Kubernetes.",
      check: validateVerbsAreValid,
    },
  ],
  prerequisites: ["k8s-10-broken-liveness"],
  hints: [
    "El error indica que verbs es un campo requerido. Una regla RBAC necesita indicar que acciones se permiten sobre los recursos.",
    'Los verbos mas comunes son: get, list, watch (lectura), create, update, patch, delete (escritura). Para un "reader" necesitas verbos de solo lectura.',
    'Solucion: anade verbs: ["get", "list", "watch"] a la regla para permitir solo lectura de Pods.',
  ],
  successMessage: [
    "¡Correcto! El Role ahora concede permisos de lectura sobre Pods.",
    "",
    "Lo que aprendiste:",
    "- Un Role RBAC necesita tres campos en cada regla: apiGroups, resources y verbs",
    "- Los verbos definen que acciones se permiten: get, list, watch, create, update, patch, delete",
    '- El apiGroup "" (vacio) se refiere al core API group (pods, services, etc.)',
    "- Un Role solo aplica dentro de un namespace; ClusterRole aplica a todo el cluster",
    "- Para vincular un Role a un usuario o ServiceAccount necesitas un RoleBinding",
  ].join("\n"),
};
