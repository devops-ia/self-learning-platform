import { Exercise } from "../types";

export const brokenProvider: Exercise = {
  id: "tf-01-broken-provider",
  module: "terraform",
  title: "El provider roto",
  briefing:
    "Este código tiene un provider de AWS mal configurado. terraform init va a fallar. Encuentra y corrige el error.",
  language: "hcl",
  initialCode: `provider "aws" {
  zones  = "us-east-1"
  profile = "default"
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
}
`,
  terminalCommands: {
    "terraform init": (code) => {
      const hasRequiredProviders = code.includes("required_providers");
      const hasRegion = /region\s*=/.test(code) && !/zones\s*=/.test(code);

      if (!hasRequiredProviders) {
        return {
          output: `Initializing the backend...

Initializing provider plugins...

╷
│ Error: Failed to query available provider packages
│
│ Could not retrieve the list of available versions for provider
│ hashicorp/aws: provider registry registry.terraform.io does not have a
│ provider named registry.terraform.io/hashicorp/aws
│
│ A terraform block with a required_providers block is required.
╵`,
          exitCode: 1,
        };
      }

      if (!hasRegion) {
        return {
          output: `Initializing the backend...

Initializing provider plugins...
- Finding hashicorp/aws versions matching ">= 5.0"...
- Installing hashicorp/aws v5.31.0...
- Installed hashicorp/aws v5.31.0 (signed by HashiCorp)

Terraform has been successfully initialized!`,
          exitCode: 0,
        };
      }

      return {
        output: `Initializing the backend...

Initializing provider plugins...
- Finding hashicorp/aws versions matching ">= 5.0"...
- Installing hashicorp/aws v5.31.0...
- Installed hashicorp/aws v5.31.0 (signed by HashiCorp)

Terraform has been successfully initialized!`,
        exitCode: 0,
      };
    },
    "terraform plan": (code) => {
      const hasRequiredProviders = code.includes("required_providers");
      const hasRegion = /region\s*=/.test(code);
      const hasZones = /zones\s*=/.test(code);

      if (!hasRequiredProviders) {
        return {
          output: `╷
│ Error: Inconsistent dependency lock file
│
│ provider registry.terraform.io/hashicorp/aws: required by this
│ configuration but no version is selected
│
│ Run "terraform init" first.
╵`,
          exitCode: 1,
        };
      }

      if (hasZones) {
        return {
          output: `╷
│ Error: Unsupported argument
│
│   on main.tf line 7, in provider "aws":
│    7:   zones  = "us-east-1"
│
│ An argument named "zones" is not expected here. Did you mean "region"?
╵`,
          exitCode: 1,
        };
      }

      if (!hasRegion) {
        return {
          output: `╷
│ Error: Missing required argument
│
│   on main.tf line 6, in provider "aws":
│    6: provider "aws" {
│
│ The argument "region" is required, but no definition was found.
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
      + availability_zone            = (known after apply)
      + public_ip                    = (known after apply)
    }

Plan: 1 to add, 0 to change, 0 to destroy.`,
        exitCode: 0,
      };
    },
    "terraform apply": () => ({
      output: `Error: This is a simulated environment. Use "terraform plan" to validate your configuration.`,
      exitCode: 1,
    }),
  },
  validations: [
    {
      type: "syntax",
      errorMessage: "El bloque terraform con required_providers es necesario.",
      check: (code) => {
        if (!code.includes("required_providers")) {
          return {
            passed: false,
            errorMessage: `Error: Failed to query available provider packages

Falta el bloque terraform { required_providers { ... } }. Sin esto, Terraform no sabe de dónde descargar el provider de AWS.`,
          };
        }
        return { passed: true };
      },
    },
    {
      type: "semantic",
      errorMessage: 'El atributo "zones" no existe en el provider de AWS.',
      check: (code) => {
        if (/zones\s*=/.test(code)) {
          return {
            passed: false,
            errorMessage: `Error: Unsupported argument "zones"

El provider de AWS no tiene un atributo "zones". El atributo correcto es "region". Las zonas de disponibilidad (como us-east-1a, us-east-1b) se configuran a nivel de recurso, no del provider.`,
          };
        }
        return { passed: true };
      },
    },
    {
      type: "semantic",
      errorMessage: 'El atributo "region" es obligatorio en el provider de AWS.',
      check: (code) => {
        if (!/region\s*=/.test(code)) {
          return {
            passed: false,
            errorMessage: `Error: Missing required argument "region"

El provider de AWS necesita saber en qué región operar. Añade region = "us-east-1" (o la región que prefieras).`,
          };
        }
        return { passed: true };
      },
    },
    {
      type: "intention",
      errorMessage: "El bloque required_providers debe especificar la source del provider.",
      check: (code) => {
        if (
          code.includes("required_providers") &&
          !code.includes("hashicorp/aws")
        ) {
          return {
            passed: false,
            errorMessage: `Error: Invalid provider source

Dentro de required_providers, necesitas especificar source = "hashicorp/aws" para que Terraform sepa exactamente qué provider descargar del registry.`,
          };
        }
        return { passed: true };
      },
    },
  ],
  prerequisites: [],
  hints: [
    "Fíjate en el nombre del atributo del provider: ¿\"zones\" es un atributo válido de AWS?",
    "Terraform necesita un bloque terraform { required_providers { } } para saber de dónde bajar los providers.",
    'La solución necesita: 1) bloque terraform con required_providers para aws con source "hashicorp/aws", 2) cambiar "zones" por "region".',
  ],
  successMessage: `¡Perfecto! El provider está configurado correctamente.

Lo que aprendiste:
- terraform init necesita saber de dónde descargar los providers → required_providers
- El provider de AWS usa "region", no "zones" — las AZ se manejan a nivel recurso
- Sin required_providers, Terraform no puede resolver dependencias`,
};
