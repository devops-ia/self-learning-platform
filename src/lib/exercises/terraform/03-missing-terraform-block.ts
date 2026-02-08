import { Exercise } from "../types";

function handleTerraformInit(code: string) {
  const hasTerraformBlock = /terraform\s*\{/.test(code);
  const hasRequiredProviders = code.includes("required_providers");

  if (!hasTerraformBlock) {
    return {
      output: [
        "Initializing the backend...",
        "",
        "Initializing provider plugins...",
        "",
        "\u2577",
        "\u2502 Error: Failed to query available provider packages",
        "\u2502",
        "\u2502 Could not retrieve the list of available versions for provider",
        "\u2502 hashicorp/aws: provider registry registry.terraform.io does not have a",
        "\u2502 provider named registry.terraform.io/hashicorp/aws",
        "\u2502",
        "\u2502 A terraform block with required_providers is needed to configure",
        "\u2502 provider installation.",
        "\u2575",
      ].join("\n"),
      exitCode: 1,
    };
  }

  if (!hasRequiredProviders) {
    return {
      output: [
        "Initializing the backend...",
        "",
        "Initializing provider plugins...",
        "",
        "\u2577",
        "\u2502 Error: Failed to query available provider packages",
        "\u2502",
        "\u2502 Could not retrieve the list of available versions for provider",
        '\u2502 hashicorp/aws: the terraform block does not contain a "required_providers"',
        "\u2502 block with an entry for this provider.",
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
      '- Finding hashicorp/aws versions matching ">= 5.0"...',
      "- Installing hashicorp/aws v5.31.0...",
      "- Installed hashicorp/aws v5.31.0 (signed by HashiCorp)",
      "",
      "Terraform has been successfully initialized!",
    ].join("\n"),
    exitCode: 0,
  };
}

function handleTerraformPlan(code: string) {
  const hasTerraformBlock = /terraform\s*\{/.test(code);
  const hasRequiredProviders = code.includes("required_providers");

  if (!hasTerraformBlock || !hasRequiredProviders) {
    return {
      output: [
        "\u2577",
        "\u2502 Error: Inconsistent dependency lock file",
        "\u2502",
        "\u2502 provider registry.terraform.io/hashicorp/aws: required by this",
        "\u2502 configuration but no version is selected",
        "\u2502",
        '\u2502 Run "terraform init" first.',
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
      "  # aws_instance.web will be created",
      '  + resource "aws_instance" "web" {',
      '      + ami                          = "ami-0c55b159cbfafe1f0"',
      '      + instance_type                = "t2.micro"',
      "      + id                           = (known after apply)",
      "      + arn                          = (known after apply)",
      "      + public_ip                    = (known after apply)",
      "    }",
      "",
      "Plan: 1 to add, 0 to change, 0 to destroy.",
    ].join("\n"),
    exitCode: 0,
  };
}

function handleTerraformApply() {
  return {
    output:
      'Error: This is a simulated environment. Use "terraform plan" to validate your configuration.',
    exitCode: 1,
  };
}

function checkTerraformBlockExists(code: string) {
  if (!/terraform\s*\{/.test(code)) {
    return {
      passed: false,
      errorMessage:
        "Error: Missing terraform block\n\nTerraform necesita un bloque terraform { } en la raíz de la configuración. Este bloque contiene la configuración del propio Terraform, como los providers requeridos y la versión mínima.",
    };
  }
  return { passed: true };
}

function checkRequiredProvidersExists(code: string) {
  if (!/required_providers\s*\{/.test(code)) {
    return {
      passed: false,
      errorMessage:
        'Error: Missing required_providers block\n\nDentro del bloque terraform { }, necesitas un bloque required_providers { } que declare los providers que usa tu configuración. Sin esto, terraform init no puede descargar los plugins necesarios.',
    };
  }
  return { passed: true };
}

function checkAwsProviderSource(code: string) {
  if (code.includes("required_providers") && !code.includes("hashicorp/aws")) {
    return {
      passed: false,
      errorMessage:
        'Error: Missing provider source\n\nEl bloque required_providers debe incluir la source del provider: source = "hashicorp/aws". Esto indica a Terraform de dónde descargar el plugin.',
    };
  }
  return { passed: true };
}

export const missingTerraformBlock: Exercise = {
  id: "tf-03-missing-terraform-block",
  module: "terraform",
  title: "Bloque terraform ausente",
  briefing:
    "terraform init no puede continuar sin el bloque terraform. Identifica qué falta y corrígelo para que la inicialización funcione.",
  language: "hcl",
  initialCode: [
    'provider "aws" {',
    '  region = "us-east-1"',
    "}",
    "",
    'resource "aws_instance" "web" {',
    '  ami           = "ami-0c55b159cbfafe1f0"',
    '  instance_type = "t2.micro"',
    "",
    "  tags = {",
    '    Name = "web-server"',
    "  }",
    "}",
    "",
  ].join("\n"),
  terminalCommands: {
    "terraform init": handleTerraformInit,
    "terraform plan": handleTerraformPlan,
    "terraform apply": handleTerraformApply,
  },
  validations: [
    {
      type: "syntax",
      errorMessage: "Falta el bloque terraform { }.",
      check: checkTerraformBlockExists,
    },
    {
      type: "semantic",
      errorMessage: "Falta el bloque required_providers dentro de terraform.",
      check: checkRequiredProvidersExists,
    },
    {
      type: "intention",
      errorMessage:
        "El required_providers debe especificar la source del provider de AWS.",
      check: checkAwsProviderSource,
    },
  ],
  prerequisites: ["tf-02-variables-outputs"],
  hints: [
    "Ejecuta terraform init y observa el error. Terraform te dice que necesita un bloque terraform con required_providers.",
    "El bloque terraform { } va al principio del archivo y dentro lleva required_providers { aws = { source = ... } }.",
    'Solución: añade un bloque terraform { required_providers { aws = { source = "hashicorp/aws" version = ">= 5.0" } } } antes del provider.',
  ],
  successMessage: [
    "¡Correcto! El bloque terraform está en su sitio.",
    "",
    "Lo que aprendiste:",
    "- El bloque terraform { } es obligatorio para configurar el propio Terraform",
    "- required_providers declara qué providers necesita tu configuración",
    '- Sin source = "hashicorp/aws", Terraform no sabe de dónde descargar el plugin',
    "- terraform init lee este bloque para descargar e instalar los providers",
  ].join("\n"),
};
