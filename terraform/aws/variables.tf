variable "project_name" {
  description = "Prefijo para nombrar recursos"
  type        = string
  default     = "pin"

  validation {
    condition     = can(regex("^[a-z][a-z0-9_-]{0,31}$", var.project_name))
    error_message = "project_name: minusculas, numeros, guion o guion bajo, empieza con letra, hasta 32 chars (se usa en nombres de recursos)."
  }
}

variable "aws_region" {
  description = "Region de AWS"
  type        = string
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]+$", var.aws_region))
    error_message = "aws_region debe tener formato de region AWS, ej: us-east-1."
  }
}

variable "instance_type" {
  description = "Tipo de instancia EC2"
  type        = string
  default     = "t3.small"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*\\.[a-z0-9]+$", var.instance_type))
    error_message = "instance_type debe ser un tipo de instancia EC2 valido, por ejemplo t3.small."
  }
}

variable "availability_zone" {
  description = "Availability Zone para la subnet/instancia (opcional). Si esta vacia, se elige automaticamente una zona compatible con instance_type."
  type        = string
  default     = ""
}

variable "ami_id" {
  description = "AMI a usar (opcional). Vacia = ultima AL2023 (most_recent). Setearla pina la imagen para un deploy reproducible."
  type        = string
  default     = ""
}

variable "key_name" {
  # Opcional: con SSM Session Manager (ver docs/decisions/0002) no hace falta un
  # key pair para acceder a la instancia. Vacio = sin key pair. Por eso no lleva
  # validacion de no-vacio: el deploy pasa key_name="" a proposito.
  description = "Nombre de key pair para SSH (opcional; vacio = sin key pair, acceso por SSM)"
  type        = string
  default     = ""
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

  validation {
    condition     = var.app_external_port > 0 && var.app_external_port <= 65535
    error_message = "app_external_port debe estar entre 1 y 65535."
  }
}

variable "prometheus_external_port" {
  description = "Puerto publico de Prometheus"
  type        = number
  default     = 9090

  validation {
    condition     = var.prometheus_external_port > 0 && var.prometheus_external_port <= 65535
    error_message = "prometheus_external_port debe estar entre 1 y 65535."
  }
}

variable "grafana_external_port" {
  description = "Puerto publico de Grafana"
  type        = number
  default     = 3000

  validation {
    condition     = var.grafana_external_port > 0 && var.grafana_external_port <= 65535
    error_message = "grafana_external_port debe estar entre 1 y 65535."
  }
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

  validation {
    condition     = length(var.grafana_admin_password) > 0
    error_message = "grafana_admin_password no puede estar vacio."
  }
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

  validation {
    condition     = var.cache_ttl > 0
    error_message = "cache_ttl debe ser mayor a 0."
  }
}
