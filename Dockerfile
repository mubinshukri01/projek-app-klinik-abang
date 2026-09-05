# syntax=docker/dockerfile:1

# ── Kebergantungan ───────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Binaan ───────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Klien Prisma dijana sebagai sumber TypeScript, jadi ia mesti wujud
# sebelum Next mengkompil.
RUN npx prisma generate
# DATABASE_URL tidak diperlukan untuk membina; halaman dihidangkan atas permintaan.
RUN npm run build

# ── Pelari migrasi ───────────────────────────────────────────────
# Imej berasingan yang mengekalkan CLI Prisma. Ia dijalankan sekali semasa
# permulaan, jadi imej aplikasi tidak perlu membawa CLI dan kebergantungannya.
FROM node:22-alpine AS migrator
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json prisma7.config.ts ./
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src/generated ./src/generated
CMD ["npx", "prisma", "migrate", "deploy"]

# ── Pelayan ──────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Jangan jalankan sebagai root.
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs klinik

COPY --from=builder --chown=klinik:nodejs /app/.next/standalone ./
COPY --from=builder --chown=klinik:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=klinik:nodejs /app/public ./public

USER klinik
EXPOSE 3000
CMD ["node", "server.js"]
