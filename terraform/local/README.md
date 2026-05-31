# Terraform Local

Levanta la misma arquitectura en tu maquina local usando Docker provider.

## Requisitos

- Terraform 1.5+
- Docker Engine activo

## Uso

```bash
cd terraform/local
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

## Endpoints

- App: `http://localhost:8080`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`

## Limpieza

```bash
terraform destroy
```
