# Tavuel Backend

API backend para la plataforma de servicios del hogar Tavuel. Construido con NestJS + Fastify, PostgreSQL y Prisma.

## Stack

- **Runtime:** Node.js 20 LTS
- **Framework:** NestJS 10 + Fastify
- **Base de datos:** PostgreSQL 16 + PostGIS
- **ORM:** Prisma 5
- **Cache:** Redis 7
- **Auth:** JWT + Passport
- **Docs:** Swagger (OpenAPI 3.0)
- **Package manager:** pnpm

## Requisitos

- Node.js 20+
- pnpm 9+
- Docker Desktop

## Setup rápido

```bash
# 1. Levantar servicios (PostgreSQL, Redis, MinIO)
docker compose -f docker/docker-compose.yml up -d

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env

# 4. Ejecutar migraciones
pnpm prisma migrate dev

# 5. Seed de datos iniciales
pnpm prisma db seed

# 6. Iniciar en modo desarrollo
pnpm run start:dev
```

**API:** http://localhost:3000/v1
**Swagger:** http://localhost:3000/api/docs
**Prisma Studio:** `pnpm prisma studio` → http://localhost:5555

## Estructura del proyecto

```
├── docker/                 → Docker Compose para servicios locales
├── prisma/
│   ├── schema.prisma       → Schema de base de datos
│   └── seed.ts             → Datos iniciales
├── src/
│   ├── main.ts             → Entry point
│   ├── app.module.ts       → Root module
│   ├── common/             → Decorators, guards, pipes, filters
│   ├── config/             → Configuración de la app
│   ├── database/           → Prisma service
│   └── modules/
│       ├── auth/           → Autenticación (JWT, Google, OTP)
│       ├── users/          → Gestión de usuarios
│       ├── providers/      → Gestión de proveedores
│       ├── verification/   → Verificación de documentos
│       ├── services/       → Catálogo de servicios
│       ├── bookings/       → Ciclo de vida de reservas
│       ├── payments/       → Integración MercadoPago
│       ├── reviews/        → Calificaciones
│       ├── pqrs/           → Sistema PQRS
│       ├── notifications/  → Push notifications (FCM)
│       ├── media/          → Upload de archivos (S3)
│       ├── chat/           → Chat en tiempo real
│       └── admin/          → Endpoints administrativos
```

## Comandos

| Comando | Descripción |
|---------|-------------|
| `pnpm run start:dev` | Desarrollo con hot-reload |
| `pnpm run start:debug` | Debug mode |
| `pnpm run build` | Build de producción |
| `pnpm run test` | Unit tests |
| `pnpm run test:e2e` | End-to-end tests |
| `pnpm run lint` | Linting |
| `pnpm prisma migrate dev` | Crear/aplicar migración |
| `pnpm prisma studio` | UI visual de la DB |
| `pnpm prisma generate` | Regenerar Prisma Client |
| `pnpm prisma db seed` | Ejecutar seed |

## Servicios Docker

| Servicio | Puerto | Credenciales |
|----------|--------|-------------|
| PostgreSQL (PostGIS) | 5432 | tavuel / tavuel_dev |
| Redis | 6379 | — |
| MinIO (S3) | 9000 / 9001 | minioadmin / minioadmin |

## Documentación

- [Arquitectura](https://github.com/Alvisor/Tavuel-Architecture)
- [API Guidelines](https://github.com/Alvisor/Tavuel-Architecture/blob/main/api/api-design-guidelines.md)
- [Error Codes](https://github.com/Alvisor/Tavuel-Architecture/blob/main/api/error-codes.md)
- [Database Schema](https://github.com/Alvisor/Tavuel-Architecture/blob/main/database/schema-overview.md)
