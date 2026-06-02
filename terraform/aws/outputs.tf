output "instance_public_ip" {
  description = "IP publica de la instancia"
  value       = aws_eip.pin.public_ip
}

output "app_url" {
  description = "URL de la aplicacion"
  value       = "http://${aws_eip.pin.public_ip}:${var.app_external_port}"
}

output "prometheus_url" {
  description = "URL de Prometheus"
  value       = "http://${aws_eip.pin.public_ip}:${var.prometheus_external_port}"
}

output "grafana_url" {
  description = "URL de Grafana"
  value       = "http://${aws_eip.pin.public_ip}:${var.grafana_external_port}"
}
