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

variable "cadvisor_external_port" {
  description = "Puerto publico de cAdvisor"
  type        = number
  default     = 8081
}

variable "node_exporter_external_port" {
  description = "Puerto publico de node-exporter"
  type        = number
  default     = 9100
}

variable "cache_ttl" {
  description = "TTL en segundos de la cache Redis del proxy de clima"
  type        = number
  default     = 300
}
