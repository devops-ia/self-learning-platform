import { Exercise } from "../types";

export const variablesOutputs: Exercise = {
  id: "tf-02-variables-outputs",
  module: "terraform",
  title: "Variables sin declarar",
  briefing:
    "Este recurso usa variables que no existen. terraform plan va a explotar. Decláralas correctamente.",
  language: "hcl",
  initialCode: `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  tags = {
    Name = "web-server"
  }
}
`,
  terminalCommands: {
    "terraform init": () => ({
      output: `Initializing the backend...

Initializing provider plugins...
- Finding hashicorp/aws versions matching ">= 5.0"...
- Installing hashicorp/aws v5.31.0...
- Installed hashicorp/aws v5.31.0 (signed by HashiCorp)

Terraform has been successfully initialized!`,
      exitCode: 0,
    }),
    "terraform plan": (code) => {
      const hasAmiVar =
        /variable\s+"ami_id"/.test(code) ||
        /variable\s+"ami_id"\s*\{/.test(code);
      const hasInstanceTypeVar =
        /variable\s+"instance_type"/.test(code) ||
        /variable\s+"instance_type"\s*\{/.test(code);

      if (!hasAmiVar && !hasInstanceTypeVar) {
        return {
          output: `╷
│ Error: Reference to undeclared input variable
│
│   on main.tf line 16, in resource "aws_instance" "web":
│   16:   ami           = var.ami_id
│
│ An input variable with the name "ami_id" has not been declared. This
│ variable can be declared with a variable "ami_id" {} block.
╵
╷
│ Error: Reference to undeclared input variable
│
│   on main.tf line 17, in resource "aws_instance" "web":
│   17:   instance_type = var.instance_type
│
│ An input variable with the name "instance_type" has not been declared.
│ This variable can be declared with a variable "instance_type" {} block.
╵`,
          exitCode: 1,
        };
      }

      if (!hasAmiVar) {
        return {
          output: `╷
│ Error: Reference to undeclared input variable
│
│   on main.tf line 16, in resource "aws_instance" "web":
│   16:   ami           = var.ami_id
│
│ An input variable with the name "ami_id" has not been declared.
╵`,
          exitCode: 1,
        };
      }

      if (!hasInstanceTypeVar) {
        return {
          output: `╷
│ Error: Reference to undeclared input variable
│
│   on main.tf line 17, in resource "aws_instance" "web":
│   17:   instance_type = var.instance_type
│
│ An input variable with the name "instance_type" has not been declared.
╵`,
          exitCode: 1,
        };
      }

      // Check if types are specified
      const amiTypeMatch = code.match(
        /variable\s+"ami_id"\s*\{[^}]*type\s*=\s*(\w+)/s
      );
      const instanceTypeMatch = code.match(
        /variable\s+"instance_type"\s*\{[^}]*type\s*=\s*(\w+)/s
      );

      if (
        amiTypeMatch &&
        amiTypeMatch[1] === "string" &&
        instanceTypeMatch &&
        instanceTypeMatch[1] === "string"
      ) {
        // Check for defaults
        const amiDefault = /variable\s+"ami_id"\s*\{[^}]*default\s*=/.test(
          code
        );
        const instanceDefault =
          /variable\s+"instance_type"\s*\{[^}]*default\s*=/.test(code);

        if (!amiDefault || !instanceDefault) {
          return {
            output: `var.ami_id
  Enter a value: ^C

╷
│ Error: No value for required variable
│
│ The variable requires a value but no default was set. Use -var or
│ -var-file to provide a value, or add a default in the variable block.
╵`,
            exitCode: 1,
          };
        }

        return {
          output: `Terraform used the selected providers to generate the following execution
plan. Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # aws_instance.web will be created
  + resource "aws_instance" "web" {
      + ami                          = "ami-0c55b159cbfafe1f0"
      + instance_type                = "t2.micro"
      + id                           = (known after apply)
      + arn                          = (known after apply)
      + tags                         = {
          + "Name" = "web-server"
        }
    }

Plan: 1 to add, 0 to change, 0 to destroy.`,
          exitCode: 0,
        };
      }

      return {
        output: `Terraform used the selected providers to generate the following execution
plan. Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # aws_instance.web will be created
  + resource "aws_instance" "web" {
      + ami                          = "ami-0c55b159cbfafe1f0"
      + instance_type                = "t2.micro"
      + id                           = (known after apply)
    }

Plan: 1 to add, 0 to change, 0 to destroy.`,
        exitCode: 0,
      };
    },
  },
  validations: [
    {
      type: "syntax",
      errorMessage: 'Variable "ami_id" no declarada.',
      check: (code) => {
        if (!/variable\s+"ami_id"\s*\{/.test(code)) {
          return {
            passed: false,
            errorMessage: `Error: Reference to undeclared input variable "ami_id"

Cuando usas var.ami_id en un recurso, Terraform busca un bloque variable "ami_id" { }. Si no lo encuentra, falla. Declara la variable con su tipo.`,
          };
        }
        return { passed: true };
      },
    },
    {
      type: "syntax",
      errorMessage: 'Variable "instance_type" no declarada.',
      check: (code) => {
        if (!/variable\s+"instance_type"\s*\{/.test(code)) {
          return {
            passed: false,
            errorMessage: `Error: Reference to undeclared input variable "instance_type"

Falta declarar variable "instance_type" { }. Cada var.X necesita su bloque de declaración correspondiente.`,
          };
        }
        return { passed: true };
      },
    },
    {
      type: "semantic",
      errorMessage: "Las variables deben tener tipo definido.",
      check: (code) => {
        const amiBlock = code.match(
          /variable\s+"ami_id"\s*\{([^}]*)\}/s
        );
        const instanceBlock = code.match(
          /variable\s+"instance_type"\s*\{([^}]*)\}/s
        );

        if (amiBlock && !/type\s*=/.test(amiBlock[1])) {
          return {
            passed: false,
            errorMessage: `Warning: Variable "ami_id" sin tipo definido

Aunque Terraform puede inferir el tipo, es buena práctica definirlo explícitamente con type = string. Esto mejora la documentación y previene errores.`,
          };
        }
        if (instanceBlock && !/type\s*=/.test(instanceBlock[1])) {
          return {
            passed: false,
            errorMessage: `Warning: Variable "instance_type" sin tipo definido

Añade type = string para documentar qué tipo de valor se espera.`,
          };
        }
        return { passed: true };
      },
    },
    {
      type: "intention",
      errorMessage: "Las variables deberían tener valores por defecto.",
      check: (code) => {
        const amiBlock = code.match(
          /variable\s+"ami_id"\s*\{([^}]*)\}/s
        );
        const instanceBlock = code.match(
          /variable\s+"instance_type"\s*\{([^}]*)\}/s
        );

        if (amiBlock && !/default\s*=/.test(amiBlock[1])) {
          return {
            passed: false,
            errorMessage: `Info: Variable "ami_id" sin valor default

Para que terraform plan funcione sin -var flags, las variables necesitan un default. Añade default = "ami-0c55b159cbfafe1f0" o similar.`,
          };
        }
        if (instanceBlock && !/default\s*=/.test(instanceBlock[1])) {
          return {
            passed: false,
            errorMessage: `Info: Variable "instance_type" sin valor default

Añade default = "t2.micro" para que el plan pueda ejecutarse sin parámetros adicionales.`,
          };
        }
        return { passed: true };
      },
    },
  ],
  prerequisites: ["tf-01-broken-provider"],
  hints: [
    'Cada var.X necesita un bloque variable "X" { } correspondiente.',
    'Las variables deben tener type = string para definir qué tipo de valor aceptan.',
    'Solución completa: declara variable "ami_id" y variable "instance_type" con type = string y un default razonable.',
  ],
  successMessage: `¡Bien hecho! Las variables están correctamente declaradas.

Lo que aprendiste:
- Cada var.X referenciado necesita su bloque variable "X" {} correspondiente
- type = string documenta y valida el tipo esperado
- default = ... permite ejecutar plan sin pasar -var en la CLI
- Sin declaración de variables, Terraform no puede resolver las referencias`,
};
