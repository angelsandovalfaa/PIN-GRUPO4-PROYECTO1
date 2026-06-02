variable "project_name" {
  description = "Prefijo para nombrar recursos"
  type        = string
  default     = "pin"
}

variable "aws_region" {
  description = "Region de AWS"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "Tipo de instancia EC2"
  type        = string
  default     = "t3.small"
}

variable "availability_zone" {
  description = "Availability Zone para la subnet/instancia (opcional). Si esta vacia, se elige automaticamente una zona compatible con instance_type."
  type        = string
  default     = ""
}

variable "key_name" {
  description = "Nombre de key pair para SSH"
  type        = string
}

variable "app_image" {
  description = "Imagen Docker de la app"
  type        = string
  default     = "nginx:alpine"
}

variable "app_external_port" {
  description = "Puerto publico de la app"
  type        = number
  default     = 80
}

variable "prometheus_external_port" {
  description = "Puerto publico de Prometheus"
  type        = number
  default     = 9090
}

variable "grafana_external_port" {
  description = "Puerto publico de Grafana"
  type        = number
  default     = 3000
}

variable "grafana_admin_user" {
  description = "Usuario admin de Grafana"
  type        = string
  default     = "admin"
}

variable "grafana_admin_password" {
  description = "Password admin de Grafana"
  type        = string
  sensitive   = true
}

variable "ghcr_username" {
  description = "Usuario para autenticacion en GHCR (opcional)"
  type        = string
  default     = ""
}

variable "ghcr_token" {
  description = "Token para autenticacion en GHCR (opcional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "cache_ttl" {
  description = "TTL en segundos de la cache Redis del proxy de clima"
  type        = number
  default     = 300
}
