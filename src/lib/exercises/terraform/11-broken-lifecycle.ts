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
  const hasStringTrue = /prevent_destroy\s*=\s*"true"/.test(code);
  const hasStringFalse = /prevent_destroy\s*=\s*"false"/.test(code);

  if (hasStringTrue || hasStringFalse) {
    return {
      output: [
        "\u2577",
        "\u2502 Error: Incorrect attribute value type",
        "\u2502",
        "  on main.tf, in resource \"aws_db_instance\" \"production\":",
        "\u2502",
        "\u2502 Inappropriate value for attribute \"prevent_destroy\": a bool is",
        "\u2502 required.",
        "\u2575",
      ].join("\n"),
      exitCode: 1,
    };
  }

  const hasPreventDestroy = /prevent_destroy\s*=\s*true/.test(code);

  return {
    output: [
      "Terraform used the selected providers to generate the following execution",
      "plan. Resource actions are indicated with the following symbols:",
      "  + create",
      "",
      "Terraform will perform the following actions:",
      "",
      "  # aws_db_instance.production will be created",
      '  + resource "aws_db_instance" "production" {',
      '      + engine         = "postgres"',
      '      + instance_class = "db.r5.large"',
      "      + allocated_storage = 100",
      hasPreventDestroy ? "      + (lifecycle: prevent_destroy = true)" : "",
      "    }",
      "",
      "Plan: 1 to add, 0 to change, 0 to destroy.",
    ].filter(function (line) { return line !== ""; }).join("\n"),
    exitCode: 0,
  };
}

function handleValidate(code: string) {
  const hasStringBool = /prevent_destroy\s*=\s*"(true|false)"/.test(code);
  if (hasStringBool) {
    return {
      output: [
        "\u2577",
        "\u2502 Error: Incorrect attribute value type",
        "\u2502",
        "\u2502 Inappropriate value for attribute \"prevent_destroy\": a bool is required.",
        "\u2575",
      ].join("\n"),
      exitCode: 1,
    };
  }
  return {
    output: "Success! The configuration is valid.",
    exitCode: 0,
  };
}

function validateNotStringBool(code: string) {
  if (/prevent_destroy\s*=\s*"(true|false)"/.test(code)) {
    return {
      passed: false,
      errorMessage: [
        "Error: prevent_destroy es boolean, no string",
        "",
        "prevent_destroy = \"true\" es un string. Terraform necesita un valor booleano.",
        "En HCL, los booleanos se escriben sin comillas: true o false.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validatePreventDestroyIsBool(code: string) {
  if (!/prevent_destroy\s*=\s*(true|false)/.test(code)) {
    return {
      passed: false,
      errorMessage: [
        "Error: prevent_destroy necesita un valor booleano",
        "",
        "El atributo prevent_destroy dentro del bloque lifecycle debe ser true o false (sin comillas).",
        "true = impide que terraform destroy elimine el recurso.",
        "false = permite la eliminación normal.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateLifecycleBlock(code: string) {
  if (!code.includes("lifecycle")) {
    return {
      passed: false,
      errorMessage: [
        "Error: Falta el bloque lifecycle",
        "",
        "El bloque lifecycle {} va dentro del recurso y controla el comportamiento",
        "durante create, update y destroy. prevent_destroy es uno de sus atributos.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

export const brokenLifecycle: Exercise = {
  id: "tf-11-broken-lifecycle",
  module: "terraform",
  title: "Lifecycle incorrecto",
  briefing:
    "La base de datos de producción tiene prevent_destroy = \"true\" (un string). Terraform necesita un booleano. Corrige el tipo para proteger el recurso.",
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
    'resource "aws_db_instance" "production" {',
    '  engine         = "postgres"',
    '  instance_class = "db.r5.large"',
    "  allocated_storage = 100",
    '  username       = "admin"',
    '  password       = "production-secret"',
    "",
    "  lifecycle {",
    '    prevent_destroy = "true"',
    "  }",
    "}",
    "",
  ].join("\n"),
  terminalCommands: {
    "terraform init": handleInit,
    "terraform plan": handlePlan,
    "terraform validate": handleValidate,
  },
  validations: [
    {
      type: "syntax",
      errorMessage: "prevent_destroy no puede ser un string.",
      check: validateNotStringBool,
    },
    {
      type: "semantic",
      errorMessage: "prevent_destroy debe ser true o false.",
      check: validatePreventDestroyIsBool,
    },
    {
      type: "intention",
      errorMessage: "El recurso necesita un bloque lifecycle.",
      check: validateLifecycleBlock,
    },
  ],
  prerequisites: ["tf-10-missing-depends"],
  hints: [
    "El error dice \"a bool is required\". Busca el valor entre comillas que debería ser un booleano.",
    "En HCL, \"true\" es un string y true (sin comillas) es un booleano. prevent_destroy espera un booleano.",
    "Solución: cambia prevent_destroy = \"true\" por prevent_destroy = true.",
  ],
  successMessage: [
    "¡Correcto! prevent_destroy ahora es un booleano.",
    "",
    "Lo que aprendiste:",
    "- En HCL, true/false son booleanos; \"true\"/\"false\" son strings",
    "- prevent_destroy = true impide que terraform destroy elimine el recurso",
    "- El bloque lifecycle también soporta: create_before_destroy, ignore_changes, replace_triggered_by",
    "- Es buena práctica proteger recursos de producción críticos (bases de datos, buckets) con prevent_destroy",
  ].join("\n"),
};
