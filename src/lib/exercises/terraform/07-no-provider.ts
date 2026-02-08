import { Exercise } from "../types";

function handleInit(code: string) {
  const hasProvider = /provider\s+"aws"/.test(code);
  const hasTerraformBlock = /terraform\s*\{/.test(code);

  if (!hasTerraformBlock) {
    return {
      output: [
        "Initializing the backend...",
        "",
        "\u2577",
        "\u2502 Error: Failed to query available provider packages",
        "\u2502",
        "\u2502 Could not retrieve the list of available versions for provider",
        "\u2502 hashicorp/aws. A terraform block with required_providers is needed.",
        "\u2575",
      ].join("\n"),
      exitCode: 1,
    };
  }

  if (!hasProvider) {
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
        "",
        "Note: Provider \"aws\" is not configured. Resources may fail to create.",
      ].join("\n"),
      exitCode: 0,
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
  const hasProvider = /provider\s+"aws"/.test(code);
  const hasRegion = /region\s*=/.test(code);

  if (!hasProvider) {
    return {
      output: [
        "\u2577",
        "\u2502 Error: No valid credential sources found",
        "\u2502",
        '\u2502   with provider "aws",',
        "\u2502",
        "\u2502 Please see https://registry.terraform.io/providers/hashicorp/aws",
        "\u2502 for more information about providing credentials.",
        "\u2502",
        "\u2502 The provider \"aws\" is not configured. Add a provider block to set",
        "\u2502 the region and authentication.",
        "\u2575",
      ].join("\n"),
      exitCode: 1,
    };
  }

  if (!hasRegion) {
    return {
      output: [
        "\u2577",
        "\u2502 Error: Missing required argument",
        "\u2502",
        '\u2502   with provider "aws",',
        "\u2502",
        '\u2502 The argument "region" is required, but was not set.',
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
      "  # aws_s3_bucket.data will be created",
      '  + resource "aws_s3_bucket" "data" {',
      '      + bucket = "my-data-bucket-12345"',
      "      + id     = (known after apply)",
      "      + arn    = (known after apply)",
      "    }",
      "",
      "Plan: 1 to add, 0 to change, 0 to destroy.",
    ].join("\n"),
    exitCode: 0,
  };
}

function validateProviderExists(code: string) {
  if (!/provider\s+"aws"/.test(code)) {
    return {
      passed: false,
      errorMessage: [
        "Error: Provider \"aws\" no está configurado",
        "",
        "Los recursos aws_* necesitan un bloque provider \"aws\" {} que configure",
        "la región y las credenciales. Sin él, Terraform no sabe a qué cuenta",
        "ni región de AWS conectarse.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateRegionSet(code: string) {
  const hasProvider = /provider\s+"aws"/.test(code);
  if (hasProvider && !/region\s*=/.test(code)) {
    return {
      passed: false,
      errorMessage: [
        "Error: Falta el argumento region en el provider",
        "",
        "El provider de AWS requiere al menos el argumento region para saber",
        "en qué región crear los recursos. Añade region = \"us-east-1\" (o tu región preferida).",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateTerraformBlock(code: string) {
  if (!/terraform\s*\{/.test(code)) {
    return {
      passed: false,
      errorMessage: [
        "Error: Falta el bloque terraform {}",
        "",
        "Necesitas un bloque terraform con required_providers para declarar el provider de AWS.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

export const noProvider: Exercise = {
  id: "tf-07-no-provider",
  module: "terraform",
  title: "Recurso sin provider",
  briefing:
    "Hay un recurso de AWS pero no se ha configurado el provider. Terraform no sabe a qué cuenta ni región conectarse.",
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
    'resource "aws_s3_bucket" "data" {',
    '  bucket = "my-data-bucket-12345"',
    "",
    "  tags = {",
    '    Environment = "production"',
    "  }",
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
      errorMessage: "Falta el bloque terraform {}.",
      check: validateTerraformBlock,
    },
    {
      type: "semantic",
      errorMessage: "Necesitas un bloque provider \"aws\" {}.",
      check: validateProviderExists,
    },
    {
      type: "intention",
      errorMessage: "El provider debe tener configurada la región.",
      check: validateRegionSet,
    },
  ],
  prerequisites: ["tf-06-broken-output"],
  hints: [
    "Ejecuta terraform plan. El error dice que el provider \"aws\" no está configurado. Necesitas añadir un bloque provider.",
    "Un bloque provider \"aws\" {} necesita al menos el argumento region para funcionar.",
    "Solución: añade provider \"aws\" { region = \"us-east-1\" } después del bloque terraform.",
  ],
  successMessage: [
    "¡Correcto! El provider de AWS está configurado.",
    "",
    "Lo que aprendiste:",
    "- Cada recurso necesita que su provider esté configurado",
    "- El bloque provider define la conexión con el servicio (región, credenciales)",
    "- required_providers declara qué providers se usan; provider los configura",
    "- Sin provider, terraform init instala el plugin pero plan falla al no tener configuración",
  ].join("\n"),
};
