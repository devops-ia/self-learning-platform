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
  const hasWrongAttr = code.includes("public_ip_address");
  const hasCorrectAttr = /public_ip(?!_address)/.test(code);

  if (hasWrongAttr) {
    return {
      output: [
        "\u2577",
        "\u2502 Error: Unsupported attribute",
        "\u2502",
        "  on main.tf line 14, in output \"server_ip\":",
        '  14:   value = aws_instance.web.public_ip_address',
        "\u2502",
        "\u2502 This object has no argument, nested block, or exported attribute named",
        '\u2502 "public_ip_address". Did you mean "public_ip"?',
        "\u2575",
      ].join("\n"),
      exitCode: 1,
    };
  }

  if (hasCorrectAttr) {
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
        '      + ami           = "ami-0c55b159cbfafe1f0"',
        '      + instance_type = "t2.micro"',
        "      + public_ip     = (known after apply)",
        "    }",
        "",
        "Changes to Outputs:",
        "  + server_ip = (known after apply)",
        "",
        "Plan: 1 to add, 0 to change, 0 to destroy.",
      ].join("\n"),
      exitCode: 0,
    };
  }

  return {
    output: [
      "\u2577",
      "\u2502 Error: Missing output value",
      "\u2502",
      "\u2502 The output \"server_ip\" must have a value attribute.",
      "\u2575",
    ].join("\n"),
    exitCode: 1,
  };
}

function validateNotWrongAttribute(code: string) {
  if (code.includes("public_ip_address")) {
    return {
      passed: false,
      errorMessage: [
        "Error: Unsupported attribute \"public_ip_address\"",
        "",
        "El recurso aws_instance no tiene un atributo llamado public_ip_address.",
        "Revisa la documentación del recurso para encontrar el nombre correcto del atributo.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateHasPublicIp(code: string) {
  if (!/public_ip(?!_address)/.test(code)) {
    return {
      passed: false,
      errorMessage: [
        "Error: El output no referencia el atributo correcto",
        "",
        "El atributo de aws_instance para la IP pública se llama public_ip (no public_ip_address).",
        "Usa aws_instance.web.public_ip en el valor del output.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

function validateOutputHasValue(code: string) {
  if (code.includes("output") && !/value\s*=/.test(code)) {
    return {
      passed: false,
      errorMessage: [
        "Error: Output sin valor",
        "",
        "Cada bloque output necesita un atributo value que defina qué se muestra.",
      ].join("\n"),
    };
  }
  return { passed: true };
}

export const brokenOutput: Exercise = {
  id: "tf-06-broken-output",
  module: "terraform",
  title: "Output inválido",
  briefing:
    "El output referencia un atributo que no existe en el recurso. terraform plan falla con un error de atributo. Encuentra el nombre correcto.",
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
    'output "server_ip" {',
    "  value       = aws_instance.web.public_ip_address",
    '  description = "IP publica del servidor"',
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
      errorMessage: "El output debe tener un valor definido.",
      check: validateOutputHasValue,
    },
    {
      type: "semantic",
      errorMessage: "El atributo public_ip_address no existe.",
      check: validateNotWrongAttribute,
    },
    {
      type: "intention",
      errorMessage: "El output debe usar el atributo correcto public_ip.",
      check: validateHasPublicIp,
    },
  ],
  prerequisites: ["tf-05-variable-no-type"],
  hints: [
    "El error dice \"Unsupported attribute\" y sugiere un nombre alternativo. Léelo con atención.",
    "El atributo correcto de aws_instance para la IP pública es public_ip, no public_ip_address.",
    "Solución: cambia aws_instance.web.public_ip_address por aws_instance.web.public_ip.",
  ],
  successMessage: [
    "¡Correcto! El output ahora referencia el atributo correcto.",
    "",
    "Lo que aprendiste:",
    "- Los nombres de atributos en Terraform son específicos de cada recurso",
    "- Terraform sugiere nombres similares cuando te equivocas (\"Did you mean...\")",
    "- Los outputs permiten exportar valores para usar en otros módulos o ver tras apply",
    "- Siempre consulta la documentación del provider para los nombres exactos de atributos",
  ].join("\n"),
};
