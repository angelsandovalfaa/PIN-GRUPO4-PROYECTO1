resource "docker_network" "pin" {
  name = "pin-network"
}

resource "docker_volume" "grafana_data" {
  name = "pin-grafana-data"
}

resource "docker_image" "app" {
  name = var.app_image
}

resource "docker_image" "redis" {
  name = "redis:7-alpine"
}

resource "docker_container" "redis" {
  name  = "pin-redis"
  image = docker_image.redis.image_id

  restart = "unless-stopped"
  command = ["redis-server", "--save", "", "--maxmemory", "64mb", "--maxmemory-policy", "allkeys-lru"]

  networks_advanced {
    name = docker_network.pin.name
  }
}

resource "docker_container" "app" {
  name  = "pin-app"
  image = docker_image.app.image_id

  restart = "unless-stopped"
  env = [
    "PORT=3000",
    "REDIS_URL=redis://pin-redis:6379",
    "REDIS_TTL=${var.cache_ttl}",
    "OPEN_METEO_URL=https://api.open-meteo.com"
  ]

  depends_on = [docker_container.redis]

  networks_advanced {
    name = docker_network.pin.name
  }

  ports {
    internal = 3000
    external = var.app_external_port
  }
}

resource "docker_container" "prometheus" {
  name  = "pin-prometheus"
  image = "prom/prometheus:latest"

  restart = "unless-stopped"

  networks_advanced {
    name = docker_network.pin.name
  }

  ports {
    internal = 9090
    external = var.prometheus_external_port
  }

  upload {
    content = templatefile("${path.module}/../../monitoring/templates/prometheus.yml.tftpl", {})
    file    = "/etc/prometheus/prometheus.yml"
  }
}

resource "docker_container" "grafana" {
  name  = "pin-grafana"
  image = "grafana/grafana:latest"

  restart = "unless-stopped"

  networks_advanced {
    name = docker_network.pin.name
  }

  ports {
    internal = 3000
    external = var.grafana_external_port
  }

  env = [
    "GF_SECURITY_ADMIN_USER=${var.grafana_admin_user}",
    "GF_SECURITY_ADMIN_PASSWORD=${var.grafana_admin_password}",
    # Dashboard publico de solo-lectura: anonimo con rol Viewer, admin
    # protegido por password, sin alta de usuarios. Ver docs/decisions/0002.
    "GF_AUTH_ANONYMOUS_ENABLED=true",
    "GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer",
    "GF_USERS_ALLOW_SIGN_UP=false"
  ]

  volumes {
    volume_name    = docker_volume.grafana_data.name
    container_path = "/var/lib/grafana"
  }
}

resource "docker_container" "cadvisor" {
  name  = "pin-cadvisor"
  image = "gcr.io/cadvisor/cadvisor:latest"

  restart = "unless-stopped"

  networks_advanced {
    name = docker_network.pin.name
  }

  ports {
    internal = 8080
    external = var.cadvisor_external_port
  }

  volumes {
    host_path      = "/"
    container_path = "/rootfs"
    read_only      = true
  }

  volumes {
    host_path      = "/var/run"
    container_path = "/var/run"
    read_only      = false
  }

  volumes {
    host_path      = "/sys"
    container_path = "/sys"
    read_only      = true
  }

  volumes {
    host_path      = "/var/lib/docker"
    container_path = "/var/lib/docker"
    read_only      = true
  }
}

resource "docker_container" "node_exporter" {
  name  = "pin-node-exporter"
  image = "prom/node-exporter:latest"

  restart = "unless-stopped"

  networks_advanced {
    name = docker_network.pin.name
  }

  ports {
    internal = 9100
    external = var.node_exporter_external_port
  }
}
