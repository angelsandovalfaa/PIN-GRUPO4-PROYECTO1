# Terraform - Ambientes

Esta carpeta esta modularizada por ambiente:

- `terraform/local`: entorno local con Docker provider para pruebas
- `terraform/aws`: infraestructura en AWS para entrega en nube

## Flujo recomendado

1. Probar primero en local:
   ```bash
   cd terraform/local
   cp terraform.tfvars.example terraform.tfvars
   terraform init
   terraform apply
   ```
2. Luego desplegar en AWS:
   ```bash
   cd terraform/aws
   cp terraform.tfvars.example terraform.tfvars
   terraform init
   terraform apply
   ```
