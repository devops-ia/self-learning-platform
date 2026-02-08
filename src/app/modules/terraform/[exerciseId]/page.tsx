"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import LabLayout from "@/components/lab/LabLayout";

// Exercise data (client-side copy of the essential info)
const exerciseData: Record<
  string,
  {
    title: string;
    briefing: string;
    initialCode: string;
    language: "hcl" | "yaml";
  }
> = {
  "tf-01-broken-provider": {
    title: "El provider roto",
    briefing:
      "Este código tiene un provider de AWS mal configurado. terraform init va a fallar. Encuentra y corrige el error.",
    language: "hcl",
    initialCode: [
      'provider "aws" {',
      '  zones  = "us-east-1"',
      '  profile = "default"',
      "}",
      "",
      'resource "aws_instance" "web" {',
      '  ami           = "ami-0c55b159cbfafe1f0"',
      '  instance_type = "t2.micro"',
      "}",
      "",
    ].join("\n"),
  },
  "tf-02-variables-outputs": {
    title: "Variables sin declarar",
    briefing:
      "Este recurso usa variables que no existen. terraform plan va a explotar. Decláralas correctamente.",
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
      "  ami           = var.ami_id",
      "  instance_type = var.instance_type",
      "",
      "  tags = {",
      '    Name = "web-server"',
      "  }",
      "}",
      "",
    ].join("\n"),
  },
  "tf-03-missing-terraform-block": {
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
  },
  "tf-04-broken-backend": {
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
  },
  "tf-05-variable-no-type": {
    title: "Variable sin tipo",
    briefing:
      'Esta variable tiene default = "2" pero se usa con count. Sin tipo explícito, Terraform hará coerción implícita. Corrige la definición para que sea segura.',
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
  },
  "tf-06-broken-output": {
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
  },
  "tf-07-no-provider": {
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
  },
  "tf-08-invalid-count": {
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
  },
  "tf-09-broken-foreach": {
    title: "for_each inválido",
    briefing:
      "for_each = 3 no es válido. A diferencia de count, for_each necesita un map o set. Corrige el argumento.",
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
      'resource "aws_iam_user" "users" {',
      "  for_each = 3",
      "",
      '  name = "user-${each.key}"',
      "}",
      "",
    ].join("\n"),
  },
  "tf-10-missing-depends": {
    title: "Dependencia no declarada",
    briefing:
      "La instancia necesita que la base de datos esté lista antes de arrancar, pero Terraform no detecta esta dependencia automáticamente. Declárala explícitamente.",
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
      'resource "aws_db_instance" "database" {',
      '  engine         = "mysql"',
      '  instance_class = "db.t3.micro"',
      "  allocated_storage = 20",
      '  username       = "admin"',
      '  password       = "supersecret"',
      "}",
      "",
      'resource "aws_instance" "app" {',
      '  ami           = "ami-0c55b159cbfafe1f0"',
      '  instance_type = "t2.micro"',
      "",
      "  user_data = <<-EOF",
      "    #!/bin/bash",
      '    echo "DB_HOST=${aws_db_instance.database.endpoint}" > /etc/app.env',
      "    systemctl start app",
      "  EOF",
      "}",
      "",
    ].join("\n"),
  },
  "tf-11-broken-lifecycle": {
    title: "Lifecycle incorrecto",
    briefing:
      'La base de datos de producción tiene prevent_destroy = "true" (un string). Terraform necesita un booleano. Corrige el tipo para proteger el recurso.',
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
  },
  "tf-12-local-state": {
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
  },
};

export default function TerraformExercisePage() {
  const params = useParams();
  const router = useRouter();
  const exerciseId = params.exerciseId as string;
  const exercise = exerciseData[exerciseId];
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!exercise) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-57px)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Ejercicio no encontrado</h1>
          <Link href="/modules/terraform" className="text-[var(--accent)]">
            Volver a Terraform
          </Link>
        </div>
      </div>
    );
  }

  if (!ready) return null;

  return (
    <LabLayout
      exerciseId={exerciseId}
      title={exercise.title}
      briefing={exercise.briefing}
      initialCode={exercise.initialCode}
      language={exercise.language}
      onComplete={() => {
        // Small delay to let the user see the success message
        setTimeout(() => {
          router.push("/modules/terraform");
          router.refresh();
        }, 3000);
      }}
    />
  );
}
