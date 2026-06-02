terraform {
  required_version = ">= 1.5.0"

  # Sin backend: este modulo usa state LOCAL a proposito. Es el que crea el
  # backend remoto del modulo terraform/aws, asi que no puede guardar su propio
  # state en un bucket que todavia no existe (huevo y gallina).
  required_providers {
    aws = {
      source = "hashicorp/aws"
      # ~> 5.0 para alinear con terraform/aws (no introducir un segundo major).
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
