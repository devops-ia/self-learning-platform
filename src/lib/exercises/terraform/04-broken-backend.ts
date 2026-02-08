import { Exercise } from "../types";

function handleInit(code: string) {
  const hasBackend = code.includes('backend "s3"') || code.includes("backend \"s3\"");
  const hasBucket = /bucket\s*=/.test(code);

  if (!hasBackend) {
    return {
      output: [
        "Initializing the backend...",
        "",
        "Terraform has been successfully initialized!",
        "(Using local backend)",
      ].join("\n"),
      exitCode: 0,
    };
  }

  if (!hasBucket) {
    return {
      output: [
        "Initializing the backend...",
        "",
        "\u2577",
        "\u2502 Error: Missing required argument",
        "\u2502",
        '\u2502   on main.tf line 3, in terraform:',
        '\u2502    3:   backend "s3" {',
        "\u2502",
        '\u2502 The argument "bucket" is required, but no definition was found.',
        "\u2575",
      ].join("\n"),
      exitCode: 1,
    };
  }

  return {
    output: [
      "Initializing the backend...",
      "",
      "Successfully configured the backend \"s3\"! Terraform will automatically",
      "use this backend unless the backend configuration changes.",
      "",
      "Terraform has been successfully initialized!",
    ].join("\n"),
    exitCode: 0,
  };
}

function handlePlan(code: string) {
  const hasBucket = /bucket\s*=/.test(code);
  if (!hasBucket) {
    return {
      output: [
        "\u2577",
        "\u2502 Error: Backend initialization required, please run \"terraform init\"",
        "\u2575",
      ].join("\n"),
      exitCode: 1,
    };
  }
  return {
    output: "No changes. Your infrastructure matches the configuration.",
    exitCode: 0,
  };
}

function validateBackendExists(code: string) {
  if (!code.includes("backend")) {
    return {
      passed: false,
      errorMessage: [
        "Error: No hay backend configurado",
        "",
        "Sin un backend, Terraform guarda el state en local. Necesitas un bloque backend dentro de terraform {}.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateBucketExists(code: string) {
  if (!/bucket\s*=/.test(code)) {
    return {
      passed: false,
      errorMessage: [
        'Error: Missing required argument "bucket"',
        "",
        "El backend S3 necesita saber en que bucket guardar el fichero de state. Anade bucket = \"mi-bucket-terraform\" dentro del bloque backend.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

export const brokenBackend: Exercise = {
  id: "tf-04-broken-backend",
  module: "terraform",
  title: "Backend S3 sin bucket",
  briefing:
    "El backend S3 necesita saber donde guardar el state. Falta un argumento obligatorio.",
  language: "hcl",
  initialCode: [
    "terraform {",
    "  required_providers {",
    "    aws = {",
    '      source  = "hashicorp/aws"',
    '      version = ">= 5.0"',
    "    }",
    "  }",
    "",
    '  backend "s3" {',
    '    key    = "terraform.tfstate"',
    '    region = "us-east-1"',
    "  }",
    "}",
    "",
    'provider "aws" {',
    '  region = "us-east-1"',
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
      errorMessage: "Debe haber un backend configurado.",
      check: validateBackendExists,
    },
    {
      type: "semantic",
      errorMessage: "El backend S3 requiere el argumento bucket.",
      check: validateBucketExists,
    },
  ],
  prerequisites: ["tf-03-missing-terraform-block"],
  hints: [
    "El error dice que falta un argumento obligatorio en el backend S3.",
    "El backend S3 necesita tres cosas: bucket, key y region. Revisa cual falta.",
    'Solucion: anade bucket = "mi-bucket-terraform" dentro del bloque backend "s3".',
  ],
  successMessage: [
    "Correcto! El backend S3 esta configurado.",
    "",
    "Lo que aprendiste:",
    "- El backend S3 necesita bucket, key y region como minimo",
    "- Sin backend remoto, el state se queda en local y no se puede compartir",
    "- terraform init es el comando que configura el backend",
  ].join("\n"),
};
