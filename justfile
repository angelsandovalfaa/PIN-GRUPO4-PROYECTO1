# Recetas del proyecto. Requiere `just` (https://github.com/casey/just).
# Ver recetas:  just --list
set shell := ["bash", "-c"]

compose := "docker compose -f monitoring/docker-compose.yml"
compose_dev := "docker compose -f monitoring/docker-compose.yml -f monitoring/docker-compose.dev.yml"

# Lista las recetas disponibles
default:
    @just --list

# --- Desarrollo local (app con hot-reload + stack completo) ---

# Levanta el entorno de dev (foreground, Ctrl-C para cortar)
dev:
    {{compose_dev}} up

# Igual que dev pero en background
dev-up:
    {{compose_dev}} up -d

# Baja el entorno de dev (conserva volumenes)
dev-down:
    {{compose_dev}} down

# Logs de la app en dev
dev-logs:
    {{compose_dev}} logs -f pin-app

# --- Stack local prod-like (imagen buildeada, sin hot-reload) ---

# Buildea la imagen pin-app:local y levanta el stack
up:
    docker build -t pin-app:local ./app
    {{compose}} up -d

# Baja el stack local
down:
    {{compose}} down

# --- App (en el host) ---

# Tests con cobertura
test:
    cd app && npm run test:coverage

# Lint
lint:
    cd app && npm run lint
