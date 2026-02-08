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
  const hasStringCount = /count\s*=\s*"/.test(code);

  if (hasStringCount) {
    return {
      output: [
        "\u2577",
        "\u2502 Error: Incorrect attribute value type",
        "\u2502",
        "  on main.tf line 14, in resource \"aws_instance\" \"web\":",
        '  14:   count = "2"',
        "\u2502",
        "\u2502 Inappropriate value for attribute \"count\": a number is required.",
        "\u2575",
      ].join("\n"),
      exitCode: 1,
    };
  }

  const countMatch = code.match(/count\s*=\s*(\d+)/);
  const count = countMatch ? parseInt(countMatch[1], 10) : 1;

  return {
    output: [
      "Terraform used the selected providers to generate the following execution",
      "plan. Resource actions are indicated with the following symbols:",
      "  + create",
      "",
      "Terraform will perform the following actions:",
      "",
      "  # aws_instance.web[0] will be created",
      '  + resource "aws_instance" "web" {',
      '      + ami           = "ami-0c55b159cbfafe1f0"',
      '      + instance_type = "t2.micro"',
      "    }",
      "",
      "Plan: " + count + " to add, 0 to change, 0 to destroy.",
    ].join("\n"),
    exitCode: 0,
  };
}

function handleValidate(code: string) {
  if (/count\s*=\s*"/.test(code)) {
    return {
      output: [
        "\u2577",
        "\u2502 Error: Incorrect attribute value type",
        "\u2502",
        "\u2502   on main.tf line 14:",
        "\u2502",
        "\u2502 Inappropriate value for attribute \"count\": a number is required.",
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

function validateCountNotString(code: string) {
  if (/count\s*=\s*"/.test(code)) {
    return {
      passed: false,
      errorMessage: [
        "Error: count debe ser un número, no un string",
        "",
        "count = \"2\" es un string. Terraform requiere que count sea un valor numérico.",
        "Quita las comillas para que sea un número: count = 2.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateCountIsNumber(code: string) {
  if (!/count\s*=\s*\d+/.test(code)) {
    return {
      passed: false,
      errorMessage: [
        "Error: count necesita un valor numérico",
        "",
        "El meta-argumento count determina cuántas instancias del recurso se crean.",
        "Debe ser un número entero: count = 2.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateCountPositive(code: string) {
  const match = code.match(/count\s*=\s*(\d+)/);
  if (match && parseInt(match[1], 10) === 0) {
    return {
      passed: false,
      errorMessage: [
        "Warning: count = 0 no creará ningún recurso",
        "",
        "Con count = 0, Terraform no creará ninguna instancia de este recurso.",
        "Si la intención es crear recursos, usa un valor mayor que 0.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

export const invalidCount: Exercise = {
  id: "tf-08-invalid-count",
  module: "terraform",
  title: "Count inválido",
  briefing:
    "El meta-argumento count tiene un valor entre comillas. Terraform espera un número, no un string. Corrige el tipo.",
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
    'resource "aws_instance" "web" {',
    '  count = "2"',
    "",
    '  ami           = "ami-0c55b159cbfafe1f0"',
    '  instance_type = "t2.micro"',
    "",
    "  tags = {",
    '    Name = "web-${count.index}"',
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
      errorMessage: "count no puede ser un string.",
      check: validateCountNotString,
    },
    {
      type: "semantic",
      errorMessage: "count debe ser un número entero.",
      check: validateCountIsNumber,
    },
    {
      type: "intention",
      errorMessage: "count debe ser mayor que 0 para crear recursos.",
      check: validateCountPositive,
    },
  ],
  prerequisites: ["tf-07-no-provider"],
  hints: [
    "El error dice \"Inappropriate value for attribute count: a number is required\". El valor está entre comillas.",
    "count = \"2\" es un string. count = 2 (sin comillas) es un número. Terraform necesita un número.",
    "Solución: cambia count = \"2\" por count = 2.",
  ],
  successMessage: [
    "¡Correcto! count ahora es un número.",
    "",
    "Lo que aprendiste:",
    "- count debe ser un número, nunca un string",
    "- En HCL, \"2\" es string y 2 es número — la diferencia importa",
    "- count.index da el índice (0, 1, 2...) de cada instancia",
    "- count = 0 es válido y significa \"no crear este recurso\" (útil en condicionales)",
  ].join("\n"),
};
