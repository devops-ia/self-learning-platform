import { Exercise } from "../types";

function handleInit(code: string) {
  const hasTerraformBlock = /terraform\s*\{/.test(code);
  if (!hasTerraformBlock) {
    return {
      output: [
        "Initializing the backend...",
        "",
        "\u2577",
        "\u2502 Error: Missing terraform block",
        "\u2502",
        "\u2502 A terraform block is required. Add a terraform {} block.",
        "\u2575",
      ].join("\n"),
      exitCode: 1,
    };
  }
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
  const hasType = /type\s*=/.test(code);
  const hasDefault = /default\s*=/.test(code);

  if (!hasType && hasDefault) {
    return {
      output: [
        "\u2577",
        "\u2502 Warning: Variable type not explicitly set",
        "\u2502",
        "\u2502 The variable \"instance_count\" has a default value of \"2\" (string)",
        "\u2502 but is used in a context that expects a number. Terraform will attempt",
        "\u2502 implicit type conversion which may produce unexpected results.",
        "\u2575",
        "",
        "Plan: 2 to add, 0 to change, 0 to destroy.",
      ].join("\n"),
      exitCode: 0,
    };
  }

  return {
    output: [
      "Terraform used the selected providers to generate the following execution",
      "plan. Resource actions are indicated with the following symbols:",
      "  + create",
      "",
      "Plan: 2 to add, 0 to change, 0 to destroy.",
    ].join("\n"),
    exitCode: 0,
  };
}

function handleValidate(code: string) {
  const hasType = /type\s*=/.test(code);
  if (!hasType) {
    return {
      output: [
        "\u2577",
        "\u2502 Warning: Missing variable type constraint",
        "\u2502",
        "\u2502   on main.tf line 1, in variable \"instance_count\":",
        "\u2502    1: variable \"instance_count\" {",
        "\u2502",
        "\u2502 It is recommended to set an explicit type for all variables to prevent",
        "\u2502 unintended type coercion.",
        "\u2575",
        "",
        "Success! The configuration is valid, but there were some warnings.",
      ].join("\n"),
      exitCode: 0,
    };
  }
  return {
    output: "Success! The configuration is valid.",
    exitCode: 0,
  };
}

function validateHasType(code: string) {
  if (!/type\s*=/.test(code)) {
    return {
      passed: false,
      errorMessage: [
        "Error: Variable sin tipo explícito",
        "",
        "La variable \"instance_count\" tiene default = \"2\" (un string), pero se usa como número.",
        "Sin un tipo explícito, Terraform hace coerción implícita que puede causar errores sutiles.",
        "Añade type = number para que Terraform valide el tipo correctamente.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateTypeIsNumber(code: string) {
  if (!/type\s*=\s*number/.test(code)) {
    return {
      passed: false,
      errorMessage: [
        "Error: El tipo de la variable debería ser number",
        "",
        "La variable instance_count se usa con count, que requiere un número.",
        "Usa type = number para que el default también sea numérico.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateDefaultIsNumber(code: string) {
  if (/default\s*=\s*"/.test(code) && /type\s*=\s*number/.test(code)) {
    return {
      passed: false,
      errorMessage: [
        "Error: Conflicto entre tipo y valor por defecto",
        "",
        "Has definido type = number pero el default sigue siendo un string (\"2\").",
        "Cambia default = \"2\" a default = 2 (sin comillas) para que coincida con el tipo.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

export const variableNoType: Exercise = {
  id: "tf-05-variable-no-type",
  module: "terraform",
  title: "Variable sin tipo",
  briefing:
    "Esta variable tiene default = \"2\" pero se usa con count. Sin tipo explícito, Terraform hará coerción implícita. Corrige la definición para que sea segura.",
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
    'variable "instance_count" {',
    '  default = "2"',
    "}",
    "",
    'resource "aws_instance" "web" {',
    "  count         = var.instance_count",
    '  ami           = "ami-0c55b159cbfafe1f0"',
    '  instance_type = "t2.micro"',
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
      errorMessage: "La variable debe tener un tipo explícito.",
      check: validateHasType,
    },
    {
      type: "semantic",
      errorMessage: "El tipo de la variable debe ser number.",
      check: validateTypeIsNumber,
    },
    {
      type: "intention",
      errorMessage: "El default debe coincidir con el tipo declarado.",
      check: validateDefaultIsNumber,
    },
  ],
  prerequisites: ["tf-04-broken-backend"],
  hints: [
    "La variable tiene default = \"2\" (entre comillas, es un string). Pero count necesita un número. ¿Qué falta en la definición de la variable?",
    "Añade type = number a la variable. Esto obliga a que el valor sea numérico y evita coerciones implícitas.",
    "Solución: cambia la variable a: variable \"instance_count\" { type = number  default = 2 }",
  ],
  successMessage: [
    "¡Correcto! La variable ahora tiene tipo explícito.",
    "",
    "Lo que aprendiste:",
    "- Siempre define type en tus variables para evitar coerciones implícitas",
    "- default = \"2\" es un string; default = 2 es un número",
    "- count requiere un valor numérico, no un string",
    "- Los tipos básicos en Terraform son: string, number, bool, list, map, object",
  ].join("\n"),
};
