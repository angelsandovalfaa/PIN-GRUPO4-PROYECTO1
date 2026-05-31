output "app_url" {
  description = "URL de la aplicacion local"
  value       = "http://localhost:${var.app_external_port}"
}

output "prometheus_url" {
  description = "URL de Prometheus local"
  value       = "http://localhost:${var.prometheus_external_port}"
}

output "grafana_url" {
  description = "URL de Grafana local"
  value       = "http://localhost:${var.grafana_external_port}"
}
