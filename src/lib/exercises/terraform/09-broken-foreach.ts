import { Exercise } from "../types";

function handleInit() {
  return {
    output: [
      "Initializing the backend...",
      "",
      "Initializing provider plugins...",
      "- Finding hashicorp/aws versions matching \">= 5.0\"...",
      "- Installing hashicorp/aws v5.31.0...",
      "- Installed hashicorp/aws v5.31.0 (signed by HashiCorp)",
      "",
      "Terraform has been successfully initialized!",
    ].join("\n"),
    exitCode: 0,
  };
}

function handlePlan(code: string) {
  const hasNumberForEach = /for_each\s*=\s*\d+/.test(code);
  const hasStringForEach = /for_each\s*=\s*"/.test(code);

  if (hasNumberForEach) {
    return {
      output: [
        "\u2577",
        "\u2502 Error: Invalid for_each argument",
        "\u2502",
        "  on main.tf line 14, in resource \"aws_iam_user\" \"users\":",
        "  14:   for_each = 3",
        "\u2502",
        "\u2502 The given \"for_each\" argument value is unsuitable: the \"for_each\"",
        "\u2502 argument must be a map, or set of strings, and you have provided a",
        "\u2502 value of type number.",
        "\u2575",
      ].join("\n"),
      exitCode: 1,
    };
  }

  if (hasStringForEach) {
    return {
      output: [
        "\u2577",
        "\u2502 Error: Invalid for_each argument",
        "\u2502",
        "\u2502 The given \"for_each\" argument value is unsuitable: the \"for_each\"",
        "\u2502 argument must be a map, or set of strings, and you have provided a",
        "\u2502 value of type string.",
        "\u2575",
      ].join("\n"),
      exitCode: 1,
    };
  }

  const hasToset = code.includes("toset(");
  const hasMap = /\{[^}]*=/.test(code) && /for_each/.test(code);

  if (!hasToset && !hasMap && !/for_each\s*=\s*\[/.test(code)) {
    return {
      output: [
        "\u2577",
        "\u2502 Error: Invalid for_each argument",
        "\u2502",
        "\u2502 The given \"for_each\" argument value is unsuitable.",
        "\u2575",
      ].join("\n"),
      exitCode: 1,
    };
  }

  return {
    output: [
      "Terraform used the selected providers to generate the following execution",
      "plan. Resource actions are indicated with the following symbols:",
      "  + create",
      "",
      "Terraform will perform the following actions:",
      "",
      "  # aws_iam_user.users[\"alice\"] will be created",
      '  + resource "aws_iam_user" "users" {',
      '      + name = "alice"',
      "    }",
      "",
      "  # aws_iam_user.users[\"bob\"] will be created",
      '  + resource "aws_iam_user" "users" {',
      '      + name = "bob"',
      "    }",
      "",
      "  # aws_iam_user.users[\"carol\"] will be created",
      '  + resource "aws_iam_user" "users" {',
      '      + name = "carol"',
      "    }",
      "",
      "Plan: 3 to add, 0 to change, 0 to destroy.",
    ].join("\n"),
    exitCode: 0,
  };
}

function validateNotNumber(code: string) {
  if (/for_each\s*=\s*\d+/.test(code)) {
    return {
      passed: false,
      errorMessage: [
        "Error: for_each no acepta números",
        "",
        "for_each = 3 no es válido. A diferencia de count, for_each necesita",
        "un map o un set de strings para saber qué instancias crear.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateIsMapOrSet(code: string) {
  const hasToset = code.includes("toset(");
  const hasMap = /for_each\s*=\s*\{/.test(code);
  const hasBracketSet = /for_each\s*=\s*toset/.test(code);
  const hasVariable = /for_each\s*=\s*var\./.test(code);

  if (!hasToset && !hasMap && !hasBracketSet && !hasVariable) {
    return {
      passed: false,
      errorMessage: [
        "Error: for_each necesita un map o un set",
        "",
        "for_each acepta:",
        "- Un map: for_each = { alice = {...}, bob = {...} }",
        "- Un set: for_each = toset([\"alice\", \"bob\", \"carol\"])",
        "- Una variable de tipo map o set",
        "",
        "Cada elemento se convierte en una instancia del recurso con su propia clave.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateUsesEach(code: string) {
  const hasForEachFixed = !/for_each\s*=\s*\d+/.test(code);
  if (hasForEachFixed && !code.includes("each.")) {
    return {
      passed: false,
      errorMessage: [
        "Warning: No usas each.key ni each.value",
        "",
        "Con for_each, cada instancia tiene acceso a each.key y each.value.",
        "Para que cada recurso sea distinto, usa each.key o each.value en los atributos.",
        "Por ejemplo: name = each.key o name = each.value.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

export const brokenForeach: Exercise = {
  id: "tf-09-broken-foreach",
  module: "terraform",
  title: "for_each inválido",
  briefing:
    "for_each = 3 no es válido. A diferencia de count, for_each necesita un map o set. Corrige el argumento.",
  language: "hcl",
  initialCode: [
    "terraform {",
    "  required_providers {",
    "    aws = {",
    '      source  = "hashicorp/aws"',
    '      version = ">= 5.0"',
    "    }",
    "  }",
    "}",
    "",
    'provider "aws" {',
    '  region = "us-east-1"',
    "}",
    "",
    'resource "aws_iam_user" "users" {',
    "  for_each = 3",
    "",
    '  name = "user-${each.key}"',
    "}",
    "",
  ].join("\n"),
  terminalCommands: {
    "terraform init": handleInit,
    "terraform plan": handlePlan,
  },
  validations: [
    {
      type: "syntax",
      errorMessage: "for_each no acepta valores numéricos.",
      check: validateNotNumber,
    },
    {
      type: "semantic",
      errorMessage: "for_each debe ser un map o set de strings.",
      check: validateIsMapOrSet,
    },
    {
      type: "intention",
      errorMessage: "Usa each.key o each.value en los atributos del recurso.",
      check: validateUsesEach,
    },
  ],
  prerequisites: ["tf-08-invalid-count"],
  hints: [
    "El error dice que for_each necesita un map o set de strings, no un número. ¿Qué estructura de datos puedes usar?",
    "Puedes usar toset([\"alice\", \"bob\", \"carol\"]) para crear un set de strings, o un map con llaves descriptivas.",
    "Solución: cambia for_each = 3 por for_each = toset([\"alice\", \"bob\", \"carol\"]) y usa name = each.key.",
  ],
  successMessage: [
    "¡Correcto! for_each ahora usa un set válido.",
    "",
    "Lo que aprendiste:",
    "- for_each acepta maps y sets, nunca números ni listas directas",
    "- toset() convierte una lista en un set, que for_each sí acepta",
    "- each.key es la clave del elemento actual; each.value es el valor",
    "- for_each es más flexible que count porque cada instancia tiene una clave estable",
    "- Si eliminas un elemento del set, solo se destruye esa instancia (con count se reindexaría todo)",
  ].join("\n"),
};
