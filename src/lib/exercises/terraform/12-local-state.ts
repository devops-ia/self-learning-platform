import { Exercise } from "../types";

function handleInit(code: string) {
  const hasBackend = code.includes("backend");
  if (!hasBackend) {
    return {
      output: [
        "Initializing the backend...",
        "",
        "Terraform has been successfully initialized!",
        "(Using local backend — state stored in terraform.tfstate)",
      ].join("\n"),
      exitCode: 0,
    };
  }

  const hasBucket = /bucket\s*=/.test(code);
  if (!hasBucket) {
    return {
      output: [
        "Initializing the backend...",
        "",
        "\u2577",
        "\u2502 Error: Missing required argument",
        "\u2502",
        '\u2502 The argument "bucket" is required for the S3 backend.',
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
  const hasBackend = code.includes("backend");
  if (!hasBackend) {
    return {
      output: [
        "Terraform used the selected providers to generate the following execution",
        "plan. Resource actions are indicated with the following symbols:",
        "  + create",
        "",
        "Plan: 3 to add, 0 to change, 0 to destroy.",
        "",
        "Warning: State is stored locally in terraform.tfstate.",
        "This is not recommended for team environments. If multiple",
        "people run terraform at the same time, state corruption may occur.",
        "Consider configuring a remote backend (S3, GCS, Azure Blob, etc.).",
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
      "Plan: 3 to add, 0 to change, 0 to destroy.",
    ].join("\n"),
    exitCode: 0,
  };
}

function handleStateList(code: string) {
  const hasBackend = code.includes("backend");
  if (!hasBackend) {
    return {
      output: [
        "(Reading state from local file: terraform.tfstate)",
        "",
        "Warning: Local state detected. In a shared environment, this",
        "can lead to state file conflicts and data loss.",
      ].join("\n"),
      exitCode: 0,
    };
  }
  return {
    output: "(Reading state from remote backend)",
    exitCode: 0,
  };
}

function validateBackendExists(code: string) {
  if (!code.includes("backend")) {
    return {
      passed: false,
      errorMessage: [
        "Error: El state se guarda en local",
        "",
        "Sin un backend remoto, el fichero terraform.tfstate se guarda en el disco local.",
        "Esto es peligroso en entornos compartidos:",
        "- No se puede compartir el state entre miembros del equipo",
        "- No hay locking: dos personas pueden ejecutar terraform a la vez y corromper el state",
        "- Si pierdes el fichero, pierdes todo el conocimiento de Terraform sobre tu infra",
        "",
        "Configura un backend remoto (S3, GCS, Azure Blob) dentro del bloque terraform {}.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateBackendHasBucket(code: string) {
  if (code.includes("backend") && !/bucket\s*=/.test(code)) {
    return {
      passed: false,
      errorMessage: [
        "Error: El backend necesita un bucket",
        "",
        "El backend S3 requiere al menos bucket, key y region para funcionar.",
        "Añade estos argumentos dentro del bloque backend \"s3\" {}.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateBackendHasKey(code: string) {
  if (code.includes("backend") && !/key\s*=/.test(code)) {
    return {
      passed: false,
      errorMessage: [
        "Error: El backend necesita una key",
        "",
        "La key define la ruta del fichero de state dentro del bucket.",
        "Por ejemplo: key = \"prod/terraform.tfstate\".",
      ].join("\n"),
    };
  }
  return { passed: true };
}

export const localState: Exercise = {
  id: "tf-12-local-state",
  module: "terraform",
  title: "State local en producción",
  briefing:
    "Esta configuración guarda el state en local. En un equipo, esto causa conflictos y pérdida de datos. Configura un backend remoto.",
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
    '  ami           = "ami-0c55b159cbfafe1f0"',
    '  instance_type = "t2.micro"',
    "}",
    "",
    'resource "aws_s3_bucket" "logs" {',
    '  bucket = "my-app-logs"',
    "}",
    "",
    'resource "aws_security_group" "web" {',
    '  name = "web-sg"',
    "",
    "  ingress {",
    "    from_port   = 80",
    "    to_port     = 80",
    '    protocol    = "tcp"',
    '    cidr_blocks = ["0.0.0.0/0"]',
    "  }",
    "}",
    "",
  ].join("\n"),
  terminalCommands: {
    "terraform init": handleInit,
    "terraform plan": handlePlan,
    "terraform state list": handleStateList,
  },
  validations: [
    {
      type: "semantic",
      errorMessage: "Falta un backend remoto.",
      check: validateBackendExists,
    },
    {
      type: "intention",
      errorMessage: "El backend S3 necesita un bucket.",
      check: validateBackendHasBucket,
    },
    {
      type: "intention",
      errorMessage: "El backend S3 necesita una key.",
      check: validateBackendHasKey,
    },
  ],
  prerequisites: ["tf-11-broken-lifecycle"],
  hints: [
    "Ejecuta terraform init y observa que dice \"Using local backend\". El state se guarda en un fichero local.",
    "Necesitas añadir un bloque backend dentro de terraform {}. El más común con AWS es backend \"s3\" {}.",
    "Solución: añade backend \"s3\" { bucket = \"mi-bucket-terraform\" key = \"prod/terraform.tfstate\" region = \"us-east-1\" } dentro del bloque terraform {}.",
  ],
  successMessage: [
    "¡Correcto! El state ahora se guardará en un backend remoto.",
    "",
    "Lo que aprendiste:",
    "- Sin backend remoto, el state se guarda en terraform.tfstate (local)",
    "- El state local no se puede compartir ni tiene locking",
    "- El backend S3 necesita: bucket, key y region",
    "- Con S3, puedes activar locking con DynamoDB para evitar ejecuciones concurrentes",
    "- terraform init -migrate-state migra el state local al nuevo backend",
    "- Nunca guardes el state local en git (añade terraform.tfstate a .gitignore)",
  ].join("\n"),
};
