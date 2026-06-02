# Etapa de dependencias: instala solo las de produccion con el lockfile, en una
# capa aparte para que el cache se reuse y la imagen final quede limpia.
FROM node:24-alpine AS deps
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Etapa de runtime.
FROM node:24-alpine AS runtime
WORKDIR /usr/src/app

ENV NODE_ENV=production
# Puerto no privilegiado: la app corre como usuario no-root (USER node), que no
# puede bindear puertos < 1024. El mapeo al puerto publico (80/8080) lo hace el
# compose/terraform del lado del host.
ENV PORT=3000

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public

# Corre como el usuario 'node' que ya trae la imagen, no como root.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
