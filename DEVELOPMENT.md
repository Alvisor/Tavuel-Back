# Guia de Desarrollo - Tavuel Backend

> Convenciones, patrones y reglas para desarrollar en el backend de Tavuel.
> Este documento es la referencia principal para cualquier persona que contribuya al proyecto.

---

## Tabla de Contenidos

1. [Arquitectura: Monolito Modular](#1-arquitectura-monolito-modular)
2. [Estructura de un Modulo](#2-estructura-de-un-modulo)
3. [Reglas de Comunicacion entre Modulos](#3-reglas-de-comunicacion-entre-modulos)
4. [Convenciones de Codigo](#4-convenciones-de-codigo)
5. [DTOs y Validacion](#5-dtos-y-validacion)
6. [Prisma y Base de Datos](#6-prisma-y-base-de-datos)
7. [Autenticacion y Autorizacion](#7-autenticacion-y-autorizacion)
8. [Manejo de Errores](#8-manejo-de-errores)
9. [File Upload](#9-file-upload)
10. [Testing](#10-testing)
11. [API Design](#11-api-design)
12. [Variables de Entorno](#12-variables-de-entorno)
13. [Comandos Utiles](#13-comandos-utiles)
14. [Checklist de Code Review](#14-checklist-de-code-review)

---

## 1. Arquitectura: Monolito Modular

### Que es y por que lo usamos

Tavuel usa una arquitectura de **monolito modular**: un solo proceso desplegable, pero internamente organizado en modulos independientes con limites claros. Cada modulo encapsula una funcionalidad de negocio completa (controladores, servicios, DTOs).

**Ventajas:**
- **Simplicidad operacional**: un solo deploy, un solo proceso, un solo repositorio.
- **Escalabilidad futura**: si un modulo necesita escalar independientemente, se puede extraer a un microservicio con cambios minimos porque ya tiene limites bien definidos.
- **Velocidad de desarrollo**: no hay overhead de comunicacion entre servicios (HTTP, colas, etc.) durante la fase temprana del producto.
- **Facilidad de debugging**: todo el stack trace esta en un solo proceso.

### Principio clave

> Cada modulo debe poder ser extraido a un microservicio sin reescribir su logica interna.
> La comunicacion entre modulos debe ser a traves de interfaces bien definidas (exports de NestJS modules).

### Estructura general

```
src/
  main.ts                 -- Entry point (Fastify, ValidationPipe, Swagger, CORS)
  app.module.ts           -- Root module: importa todos los modulos
  common/                 -- Codigo compartido transversal
    decorators/
      current-user.decorator.ts   -- @CurrentUser() para extraer usuario del JWT
      roles.decorator.ts          -- @Roles('ADMIN', 'PROVIDER')
    guards/
      jwt-auth.guard.ts           -- Guard de autenticacion JWT
      roles.guard.ts              -- Guard de autorizacion por roles
    pipes/
      parse-uuid.pipe.ts          -- Validacion de UUID en parametros
    filters/
      http-exception.filter.ts    -- Formato estandar de errores
  config/
    app.config.ts                 -- Configuracion registrada con registerAs()
  database/
    database.module.ts            -- Modulo global de Prisma
    prisma.service.ts             -- PrismaClient como servicio inyectable
  modules/
    auth/               -- Autenticacion (JWT, Google OAuth, reset password)
    users/              -- Gestion de usuarios y perfiles
    providers/          -- Registro y perfil de proveedores de servicios
    verification/       -- Verificacion de documentos de proveedores
    services/           -- Catalogo de categorias y servicios
    bookings/           -- Ciclo de vida de reservas (solicitud -> completado)
    payments/           -- Integracion MercadoPago, comisiones
    reviews/            -- Calificaciones y resenas de proveedores
    pqrs/               -- Sistema PQRS (Peticiones, Quejas, Reclamos, Sugerencias)
    notifications/      -- Notificaciones push (FCM) y en-app
    media/              -- Upload y gestion de archivos (local/S3)
    chat/               -- Chat en tiempo real entre cliente y proveedor
    admin/              -- Endpoints administrativos
```

### Dependencias actuales entre modulos

```
auth        --> (usa PrismaService directamente, exporta AuthService/JwtModule/PassportModule)
users       --> (independiente)
providers   --> media (para upload de documentos)
verification--> (independiente)
services    --> (independiente)
bookings    --> (independiente)
payments    --> (independiente)
reviews     --> (independiente)
pqrs        --> (independiente)
notifications-> (independiente)
media       --> (independiente, exporta MediaService)
chat        --> (independiente)
admin       --> (independiente)
```

`DatabaseModule` es `@Global()`, por lo que `PrismaService` esta disponible en todos los modulos sin importarlo explicitamente.

---

## 2. Estructura de un Modulo

Cada modulo sigue esta estructura estandar:

```
modules/<nombre>/
  <nombre>.module.ts          -- Modulo NestJS (imports, providers, controllers, exports)
  <nombre>.service.ts         -- Logica de negocio principal
  <nombre>.controller.ts      -- Endpoints REST (solo delegacion, sin logica)
  dto/
    create-<nombre>.dto.ts    -- DTO de creacion con class-validator
    update-<nombre>.dto.ts    -- DTO de actualizacion (parcial)
    <nombre>-query.dto.ts     -- DTO para filtros y paginacion
  interfaces/                 -- Tipos e interfaces del modulo (opcional)
  strategies/                 -- Estrategias de Passport (solo en auth)
```

### Ejemplo: modulo de reviews

```typescript
// reviews.module.ts
@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],   // Solo si otro modulo lo necesita
})
export class ReviewsModule {}
```

### Reglas para el archivo .module.ts

- **imports**: solo los modulos que este modulo necesita (no importar modulos innecesarios).
- **providers**: el service principal y cualquier helper interno.
- **controllers**: los controllers REST del modulo.
- **exports**: solo los services que otros modulos necesitan consumir. No exportar todo por defecto.

---

## 3. Reglas de Comunicacion entre Modulos

### Lo que SI se debe hacer

1. **Importar el Module completo**, no el Service directamente:

```typescript
// providers.module.ts -- CORRECTO
@Module({
  imports: [MediaModule],  // Importar el modulo completo
  controllers: [ProvidersController],
  providers: [ProvidersService],
})
export class ProvidersModule {}
```

2. **Exportar solo lo necesario** desde cada modulo:

```typescript
// media.module.ts -- CORRECTO
@Module({
  providers: [MediaService],
  exports: [MediaService],  // Solo lo que otros necesitan
})
export class MediaModule {}
```

3. **Inyectar el service exportado** en el constructor del consumer:

```typescript
// providers.controller.ts -- CORRECTO
constructor(
  private readonly providersService: ProvidersService,
  private readonly mediaService: MediaService,  // Viene de MediaModule
) {}
```

### Lo que NUNCA se debe hacer

```typescript
// INCORRECTO: importar un service directamente de otro modulo sin importar su module
import { MediaService } from '../media/media.service';

@Module({
  // Falta: imports: [MediaModule]
  providers: [ProvidersService, MediaService],  // MAL: registrando service ajeno
})
export class ProvidersModule {}
```

### Comunicacion asincrona (futuro)

Cuando necesitemos desacoplar modulos (ej: al crear una review, notificar al proveedor), usaremos el patron EventEmitter de NestJS:

```typescript
// Futuro: EventEmitter2 pattern
this.eventEmitter.emit('review.created', { providerId, reviewId, rating });
```

Esto permitira migrar a colas de mensajes (RabbitMQ, SQS) cuando escalemos a microservicios.

### Shared Kernel

Tipos, interfaces y utilidades compartidas entre multiples modulos van en `src/common/`:

```
src/common/
  decorators/     -- @CurrentUser(), @Roles(), @Public()
  guards/         -- JwtAuthGuard, RolesGuard
  pipes/          -- ParseUuidPipe
  filters/        -- HttpExceptionFilter
  interfaces/     -- Tipos compartidos (ej: PaginationMeta)
  utils/          -- Funciones utilitarias comunes
```

---

## 4. Convenciones de Codigo

### Idioma

| Que                    | Idioma   | Ejemplo                                    |
|------------------------|----------|--------------------------------------------|
| Nombres de variables   | Ingles   | `firstName`, `bookingStatus`               |
| Nombres de clases      | Ingles   | `ProvidersService`, `CreateBookingDto`      |
| Nombres de archivos    | Ingles   | `providers.service.ts`, `create-review.dto.ts` |
| Comentarios en codigo  | Espanol  | `// Validar que la reserva pertenezca al cliente` |
| Documentacion          | Espanol  | Este archivo, README, etc.                 |
| Mensajes de error API  | Ingles   | `"Booking not found"` (se traducen en el cliente) |
| Swagger summaries      | Ingles   | `@ApiOperation({ summary: 'Create provider profile' })` |

### Controllers: solo delegacion

El controller NO debe contener logica de negocio. Su responsabilidad es:
1. Recibir y validar la entrada (via DTOs y pipes).
2. Extraer datos del request (usuario autenticado, parametros).
3. Delegar al service.
4. Retornar la respuesta.

```typescript
// CORRECTO: controller delega todo al service
@Post()
async createReview(
  @CurrentUser('id') userId: string,
  @Body() dto: CreateReviewDto,
) {
  return this.reviewsService.create(userId, dto);
}
```

```typescript
// INCORRECTO: logica de negocio en el controller
@Post()
async createReview(
  @CurrentUser('id') userId: string,
  @Body() dto: CreateReviewDto,
) {
  // MAL: esto deberia estar en el service
  const booking = await this.prisma.booking.findUnique({
    where: { id: dto.bookingId },
  });
  if (booking.clientId !== userId) {
    throw new BadRequestException('Not your booking');
  }
  // ...mas logica...
}
```

**Excepcion aceptable**: validacion ligera de archivos multipart en el controller (como en `providers.controller.ts`) porque la extraccion del archivo del request es responsabilidad del controller.

### Services: toda la logica

El service contiene:
- Validaciones de negocio.
- Consultas a la base de datos via Prisma.
- Transformaciones de datos.
- Orquestacion de operaciones.

### Naming conventions

| Tipo                  | Convencion                         | Ejemplo                          |
|-----------------------|------------------------------------|----------------------------------|
| Archivos              | kebab-case                         | `create-provider.dto.ts`         |
| Clases                | PascalCase                         | `ProvidersService`               |
| Metodos               | camelCase                          | `findByUserId()`                 |
| Variables             | camelCase                          | `const accessToken = ...`        |
| Constantes            | UPPER_SNAKE_CASE                   | `const ROLES_KEY = 'roles'`      |
| Enums (Prisma)        | PascalCase con valores UPPER_SNAKE | `BookingStatus.REQUESTED`        |
| Tablas (Prisma @@map) | snake_case plural                  | `@@map("provider_services")`     |

### Imports

Ordenar imports en este orden:
1. NestJS / framework (`@nestjs/common`, `@nestjs/config`, etc.)
2. Librerias externas (`bcrypt`, `@prisma/client`, etc.)
3. Modulos internos (`../../database/prisma.service`, etc.)
4. DTOs y tipos del modulo actual (`./dto/create-review.dto`)

---

## 5. DTOs y Validacion

### Reglas obligatorias

1. **SIEMPRE** usar decoradores de `class-validator` en cada campo del DTO.
2. **SIEMPRE** usar `@ApiProperty()` o `@ApiPropertyOptional()` para Swagger.
3. Para campos de query params numericos, usar `@Type(() => Number)` de `class-transformer`.

### ValidationPipe global (ya configurado en main.ts)

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // Elimina campos no declarados en el DTO
    forbidNonWhitelisted: true,   // Lanza error si se envian campos extra
    transform: true,              // Transforma al tipo del DTO automaticamente
    transformOptions: {
      enableImplicitConversion: true,  // Convierte strings a numeros, booleans, etc.
    },
  }),
);
```

### Ejemplo de DTO de creacion

```typescript
import { IsEmail, IsString, MinLength, MaxLength, Matches, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'usuario@email.com' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @ApiProperty({ example: 'MiPassword123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(64)
  password: string;

  @ApiProperty({ example: '+573001234567' })
  @IsString()
  @Matches(/^\+57[0-9]{10}$/, {
    message: 'Phone must be a valid Colombian number (+57XXXXXXXXXX)',
  })
  phone: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  wantsToBeProvider?: boolean;
}
```

### Ejemplo de DTO de paginacion/query

```typescript
import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)  // Necesario para query params (llegan como string)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;
}
```

### Nota sobre mensajes de validacion

El `ValidationPipe` de NestJS devuelve el campo `message` como un **Array<string>** cuando hay errores de validacion, no como un string simple. El `HttpExceptionFilter` ya maneja esto, pero los clientes (Flutter app, admin panel) deben estar preparados para recibir ambos formatos:

```json
{
  "error": {
    "code": 400,
    "message": [
      "Email must be a valid email address",
      "Password must be at least 8 characters"
    ],
    "details": null
  }
}
```

### Tipos de Prisma en DTOs de respuesta

Cuidado con los tipos `Decimal` y `DateTime` de Prisma:
- `Decimal` se serializa como string (`"4.50"`). Si el cliente necesita un numero, convertir explicitamente: `Number(provider.rating)`.
- `DateTime` se serializa como ISO string (`"2026-02-17T10:30:00.000Z"`).

---

## 6. Prisma y Base de Datos

### Schema

El schema de la base de datos esta en `prisma/schema.prisma`. Contiene los modelos, enums y relaciones del sistema completo.

### PrismaService

`PrismaService` extiende `PrismaClient` y se registra como servicio global via `DatabaseModule`:

```typescript
// database/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

```typescript
// database/database.module.ts
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

Al ser `@Global()`, **NO es necesario** importar `DatabaseModule` en cada modulo. `PrismaService` esta disponible automaticamente via inyeccion de dependencias.

### Migraciones

```bash
# Crear una nueva migracion (despues de modificar schema.prisma)
npx prisma migrate dev --name descripcion-en-kebab-case

# Ejemplos de nombres:
npx prisma migrate dev --name add-provider-availability
npx prisma migrate dev --name rename-booking-status-field
npx prisma migrate dev --name add-pqrs-tables

# Aplicar migraciones pendientes (en CI/CD o produccion)
npx prisma migrate deploy

# Regenerar el Prisma Client (despues de modificar schema)
npx prisma generate

# Ver la DB con interfaz visual
npx prisma studio
```

### Seeds

Los datos iniciales se cargan con `prisma/seed.ts`:

```bash
npx prisma db seed
```

### Buenas practicas con Prisma

#### Usar `select` o `include` para limitar campos

```typescript
// CORRECTO: solo traer los campos necesarios
const user = await this.prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    // No incluir passwordHash ni datos sensibles
  },
});
```

```typescript
// CORRECTO: incluir relaciones especificas
const provider = await this.prisma.provider.findUnique({
  where: { id },
  include: {
    user: {
      select: { firstName: true, lastName: true, avatarUrl: true },
    },
    services: {
      include: { service: { include: { category: true } } },
    },
  },
});
```

#### Usar transacciones para operaciones multi-tabla

```typescript
// CORRECTO: operacion atomica
const result = await this.prisma.$transaction(async (tx) => {
  const review = await tx.review.create({
    data: { bookingId, clientId, providerId, rating, comment },
  });

  // Recalcular rating del proveedor
  const aggregation = await tx.review.aggregate({
    where: { providerId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await tx.provider.update({
    where: { id: providerId },
    data: {
      rating: aggregation._avg.rating || 0,
      totalReviews: aggregation._count.rating,
    },
  });

  return review;
});
```

#### Evitar N+1 queries

```typescript
// INCORRECTO: N+1 -- una query por cada booking
const bookings = await this.prisma.booking.findMany({ where: { clientId } });
for (const booking of bookings) {
  booking.service = await this.prisma.service.findUnique({ where: { id: booking.serviceId } });
}

// CORRECTO: una sola query con include
const bookings = await this.prisma.booking.findMany({
  where: { clientId },
  include: {
    service: { select: { id: true, name: true } },
    provider: {
      include: { user: { select: { firstName: true, lastName: true } } },
    },
  },
});
```

#### No usar repository pattern extra

Con Prisma, el `PrismaService` ya actua como un repositorio tipado y seguro. **No es necesario** crear una capa de repositorio adicional. El service del modulo consulta Prisma directamente:

```typescript
@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProvider(providerId: string) {
    return this.prisma.review.findMany({
      where: { providerId },
      include: { client: { select: { firstName: true } } },
    });
  }
}
```

---

## 7. Autenticacion y Autorizacion

### JWT: Access + Refresh Token

| Token         | Expiracion | Proposito                    |
|---------------|------------|------------------------------|
| Access Token  | 15 minutos | Autenticacion de requests    |
| Refresh Token | 7 dias     | Obtener nuevo access token   |

El payload del JWT contiene:

```typescript
interface JwtPayload {
  sub: string;    // userId (UUID)
  email: string;
  role: string;   // 'CLIENT' | 'PROVIDER' | 'ADMIN'
  type: string;   // 'access' | 'refresh' | 'reset'
}
```

### Guards

#### JwtAuthGuard

Guard basado en Passport que valida el JWT y carga el usuario en `request.user`:

```typescript
@UseGuards(JwtAuthGuard)
```

El `JwtStrategy` (en `auth/strategies/jwt.strategy.ts`) se encarga de:
1. Extraer el token del header `Authorization: Bearer <token>`.
2. Verificar que sea de tipo `access`.
3. Buscar el usuario en la DB y verificar que este `ACTIVE`.
4. Poblar `request.user` con: `{ id, email, role, firstName, lastName }`.

#### RolesGuard

Guard que valida el rol del usuario contra los roles requeridos:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
```

**Importante**: `RolesGuard` debe ir siempre DESPUES de `JwtAuthGuard` porque necesita `request.user`.

### Decoradores

#### @CurrentUser()

Extrae datos del usuario autenticado:

```typescript
@Get('me')
async getMe(@CurrentUser() user: any) {
  // user = { id, email, role, firstName, lastName }
}

@Get('me')
async getMe(@CurrentUser('id') userId: string) {
  // userId = 'uuid-del-usuario'
}
```

#### @Roles()

Define los roles permitidos para un endpoint:

```typescript
@Roles('ADMIN', 'PROVIDER')  // Solo ADMIN o PROVIDER pueden acceder
```

Si no se aplica `@Roles()`, el `RolesGuard` permite el acceso a cualquier rol autenticado.

### Patron tipico de un endpoint protegido

```typescript
@Get('me')
@ApiBearerAuth()           // Swagger: mostrar campo de token
@UseGuards(JwtAuthGuard)   // Requiere autenticacion
@ApiOperation({ summary: 'Get my profile' })
async getMe(@CurrentUser('id') userId: string) {
  return this.usersService.findOne(userId);
}
```

### Endpoints publicos

Actualmente no hay un decorator `@Public()` global. Los endpoints sin `@UseGuards(JwtAuthGuard)` son publicos:

```typescript
// Publico: sin guard
@Get(':id')
@ApiOperation({ summary: 'Get provider public profile' })
async findOne(@Param('id', ParseUuidPipe) id: string) {
  return this.providersService.findPublicProfile(id);
}
```

---

## 8. Manejo de Errores

### HttpExceptionFilter

El filtro global (`src/common/filters/http-exception.filter.ts`) formatea todas las excepciones HTTP con un formato estandar:

```json
{
  "error": {
    "code": 404,
    "message": "Provider not found",
    "details": null
  }
}
```

### Excepciones de NestJS a usar

| Excepcion                    | HTTP Code | Cuando usarla                           |
|------------------------------|-----------|----------------------------------------|
| `BadRequestException`       | 400       | Datos invalidos, reglas de negocio      |
| `UnauthorizedException`     | 401       | Token invalido, credenciales incorrectas|
| `ForbiddenException`        | 403       | Sin permisos para esta accion           |
| `NotFoundException`          | 404       | Recurso no encontrado                   |
| `ConflictException`         | 409       | Duplicado (email ya existe, etc.)       |
| `InternalServerErrorException` | 500    | Error inesperado del servidor           |

### Ejemplo de uso en services

```typescript
// Recurso no encontrado
const booking = await this.prisma.booking.findUnique({ where: { id } });
if (!booking) {
  throw new NotFoundException('Booking not found');
}

// Validacion de negocio
if (booking.status !== 'COMPLETED') {
  throw new BadRequestException('Can only review completed bookings');
}

// Conflicto de unicidad
const existing = await this.prisma.review.findUnique({ where: { bookingId } });
if (existing) {
  throw new ConflictException('Review already exists for this booking');
}

// Permisos
if (booking.clientId !== userId) {
  throw new ForbiddenException('You can only review your own bookings');
}
```

### Mensajes de error

Los mensajes de error de la API se escriben en **ingles** porque la traduccion se maneja en el lado del cliente (Flutter app). Esto permite:
- Un solo backend que sirve a multiples idiomas potencialmente.
- El cliente mapea codigos/mensajes a traducciones locales.

---

## 9. File Upload

### Stack: @fastify/multipart

Tavuel corre sobre **Fastify**, NO sobre Express. Esto significa:
- **NO usar** `multer` ni `@nestjs/platform-express/multer`.
- **USAR** `@fastify/multipart` (ya configurado en `main.ts`).
- Limite: **10MB** por archivo.

### Tipos de archivo permitidos

```typescript
const allowedMimes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
```

### Como subir un archivo

El patron actual usa el `MediaService` para guardar archivos:

```typescript
// En el controller:
@Post('me/documents')
@ApiConsumes('multipart/form-data')
async uploadDocument(@CurrentUser('id') userId: string, @Req() req: any) {
  const file = await req.file();  // API de @fastify/multipart
  if (!file) {
    throw new BadRequestException('No file provided');
  }

  const buffer = await file.toBuffer();
  const { url } = await this.mediaService.uploadFile(
    buffer,
    file.filename,
    file.mimetype,
    'documents',  // carpeta destino
  );

  // Guardar la URL en la DB
  return this.service.saveDocument(url);
}
```

### Almacenamiento

| Entorno     | Destino                     | URL resultante                 |
|-------------|-----------------------------|---------------------------------|
| Desarrollo  | `./uploads/<folder>/`       | `/uploads/documents/uuid.jpg`  |
| Produccion  | AWS S3 / MinIO              | `https://s3.../bucket/key`     |

El `MediaModule` exporta `MediaService` para que otros modulos puedan usarlo:

```typescript
@Module({
  imports: [MediaModule],  // Importar para usar MediaService
  // ...
})
export class ProvidersModule {}
```

---

## 10. Testing

### Unit Tests

Para los services, mockear `PrismaService` con Jest:

```typescript
describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: PrismaService,
          useValue: {
            review: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
            },
            booking: {
              findUnique: jest.fn(),
            },
            provider: {
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get(ReviewsService);
    prisma = module.get(PrismaService);
  });

  it('should throw NotFoundException when booking does not exist', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.create('user-id', { bookingId: 'fake-id', rating: 5, comment: 'Great service!' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should create a review and update provider rating', async () => {
    const mockBooking = {
      id: 'booking-1',
      clientId: 'user-1',
      providerId: 'provider-1',
      status: 'COMPLETED',
    };

    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
    (prisma.review.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.review.create as jest.Mock).mockResolvedValue({ id: 'review-1', rating: 5 });
    (prisma.review.aggregate as jest.Mock).mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: { rating: 10 },
    });
    (prisma.provider.update as jest.Mock).mockResolvedValue({});

    const result = await service.create('user-1', {
      bookingId: 'booking-1',
      rating: 5,
      comment: 'Excelente servicio profesional',
    });

    expect(result).toBeDefined();
    expect(prisma.provider.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'provider-1' },
        data: { rating: 4.5, totalReviews: 10 },
      }),
    );
  });
});
```

### E2E Tests

Usar supertest con la app completa:

```typescript
describe('AuthController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/v1/auth/register (POST) should create a new user', () => {
    return app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        phone: '+573001234567',
      },
    }).then((result) => {
      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.payload);
      expect(body.user.email).toBe('test@example.com');
      expect(body.accessToken).toBeDefined();
    });
  });
});
```

### Naming

```
describe('ProvidersService')  -->  it('should create a provider profile')
describe('AuthController')    -->  it('should return 401 for invalid credentials')
describe('ReviewsService')    -->  it('should not allow reviewing unfinished bookings')
```

### Comandos

```bash
pnpm run test              # Unit tests
pnpm run test:watch        # Watch mode
pnpm run test:cov          # Coverage
pnpm run test:e2e          # End-to-end
```

---

## 11. API Design

### Versionado

Todas las rutas tienen el prefijo `/v1/` configurado globalmente en `main.ts`:

```
http://localhost:3000/v1/auth/login
http://localhost:3000/v1/users/me
http://localhost:3000/v1/providers/me/documents
```

**Excepcion**: Swagger esta en `/api/docs` (sin prefijo de version).

### REST Conventions

| Accion            | Metodo  | Ruta                   | Ejemplo                          |
|-------------------|---------|------------------------|----------------------------------|
| Listar            | GET     | /resources             | GET /v1/users                    |
| Crear             | POST    | /resources             | POST /v1/bookings                |
| Obtener uno       | GET     | /resources/:id         | GET /v1/providers/uuid           |
| Actualizar        | PATCH   | /resources/:id         | PATCH /v1/users/uuid             |
| Eliminar          | DELETE  | /resources/:id         | DELETE /v1/users/uuid            |
| Recurso propio    | GET     | /resources/me          | GET /v1/users/me                 |
| Actualizar propio | PATCH   | /resources/me          | PATCH /v1/providers/me           |
| Sub-recurso       | GET     | /resources/:id/sub     | GET /v1/providers/uuid/reviews   |
| Accion especifica | POST    | /resources/:id/action  | POST /v1/providers/me/submit     |

### Endpoints "me"

Los endpoints `/me` permiten al usuario autenticado acceder a sus propios recursos sin conocer su ID. Siempre van **antes** del `:id` en la declaracion del controller (para evitar conflictos de rutas):

```typescript
@Get('me')        // Primero: ruta estatica
async getMe(...) {}

@Get(':id')       // Despues: ruta dinamica
async findOne(...) {}
```

### Paginacion

Formato estandar de respuesta paginada:

```json
{
  "data": [
    { "id": "uuid-1", "name": "..." },
    { "id": "uuid-2", "name": "..." }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

Implementacion en el service:

```typescript
async findAll(query: PaginationQueryDto) {
  const { page = 1, limit = 20, search } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    this.prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    this.prisma.user.count({ where }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### Swagger / OpenAPI

Swagger esta habilitado automaticamente en desarrollo:

```
http://localhost:3000/api/docs
```

Cada controller debe tener:
- `@ApiTags('NombreDelModulo')` a nivel de clase.
- `@ApiOperation({ summary: '...' })` en cada endpoint.
- `@ApiResponse({ status: xxx, description: '...' })` para cada codigo de respuesta posible.
- `@ApiBearerAuth()` en endpoints protegidos.

---

## 12. Variables de Entorno

### Archivo .env

Las variables de entorno se configuran en `.env` (copiado de `.env.example`). **NUNCA** commitear el archivo `.env`.

### Variables requeridas

| Variable                   | Descripcion                                    | Ejemplo                                          |
|---------------------------|------------------------------------------------|--------------------------------------------------|
| `DATABASE_URL`            | Connection string de PostgreSQL                | `postgresql://tavuel:tavuel_dev@localhost:5432/tavuel_db` |
| `JWT_SECRET`              | Clave secreta para firmar JWT                  | `tu-clave-super-secreta`                         |
| `JWT_ACCESS_EXPIRATION`   | Expiracion del access token                    | `15m`                                            |
| `JWT_REFRESH_EXPIRATION`  | Expiracion del refresh token                   | `7d`                                             |
| `PORT`                    | Puerto del servidor                            | `3000`                                           |
| `NODE_ENV`                | Entorno de ejecucion                           | `development`                                    |
| `API_PREFIX`              | Prefijo de las rutas API                       | `v1`                                             |

### Variables opcionales (segun features activas)

| Variable                   | Modulo          | Descripcion                        |
|---------------------------|------------------|------------------------------------|
| `REDIS_HOST`              | Cache            | Host de Redis                      |
| `REDIS_PORT`              | Cache            | Puerto de Redis                    |
| `MERCADOPAGO_ACCESS_TOKEN`| Payments         | Token de MercadoPago               |
| `MERCADOPAGO_PUBLIC_KEY`  | Payments         | Clave publica MercadoPago          |
| `MERCADOPAGO_WEBHOOK_SECRET` | Payments      | Secreto para webhooks              |
| `TAVUEL_COMMISSION_RATE`  | Payments         | Tasa de comision (ej: `0.15`)      |
| `S3_ENDPOINT`             | Media            | Endpoint de S3/MinIO               |
| `S3_ACCESS_KEY`           | Media            | Access key de S3                   |
| `S3_SECRET_KEY`           | Media            | Secret key de S3                   |
| `S3_BUCKET_EVIDENCE`      | Media            | Bucket para evidencias             |
| `S3_BUCKET_AVATARS`       | Media            | Bucket para avatares               |
| `S3_BUCKET_DOCUMENTS`     | Media            | Bucket para documentos             |
| `FIREBASE_PROJECT_ID`     | Notifications    | ID del proyecto Firebase           |
| `FIREBASE_PRIVATE_KEY`    | Notifications    | Clave privada de Firebase          |
| `FIREBASE_CLIENT_EMAIL`   | Notifications    | Email del service account          |
| `GOOGLE_CLIENT_ID`        | Auth (Google)    | Client ID de Google OAuth          |
| `GOOGLE_CLIENT_SECRET`    | Auth (Google)    | Client secret de Google OAuth      |
| `TWILIO_ACCOUNT_SID`      | Auth (OTP)       | Account SID de Twilio              |
| `TWILIO_AUTH_TOKEN`       | Auth (OTP)       | Auth token de Twilio               |
| `TWILIO_PHONE_NUMBER`     | Auth (OTP)       | Numero de telefono Twilio          |
| `FRONTEND_URL`            | CORS             | URL del admin panel                |
| `APP_URL`                 | CORS             | URL de la app movil                |

---

## 13. Comandos Utiles

### Desarrollo

```bash
# Iniciar en modo desarrollo con hot-reload
pnpm run start:dev

# Iniciar en modo debug
pnpm run start:debug

# Levantar servicios locales (PostgreSQL, Redis, MinIO)
docker compose -f docker/docker-compose.yml up -d

# Detener servicios locales
docker compose -f docker/docker-compose.yml down
```

### Prisma

```bash
# Crear migracion despues de modificar schema.prisma
npx prisma migrate dev --name nombre-de-la-migracion

# Aplicar migraciones pendientes
npx prisma migrate deploy

# Regenerar Prisma Client
npx prisma generate

# Seed de datos iniciales
npx prisma db seed

# Abrir Prisma Studio (UI visual de la DB)
npx prisma studio

# Reset completo de la DB (CUIDADO: borra todos los datos)
npx prisma migrate reset
```

### Calidad de codigo

```bash
# Linting
pnpm run lint

# Formateo
pnpm run format

# Tests unitarios
pnpm run test

# Tests e2e
pnpm run test:e2e

# Coverage
pnpm run test:cov
```

### Build

```bash
# Build de produccion
pnpm run build

# Ejecutar build de produccion
pnpm run start:prod
```

---

## 14. Checklist de Code Review

Usar esta lista al revisar o crear un PR:

### Estructura y organizacion
- [ ] El codigo nuevo esta dentro del modulo correcto
- [ ] La logica de negocio esta en el service, NO en el controller
- [ ] El modulo exporta solo lo que otros modulos necesitan
- [ ] El modulo importa los modulos de los que depende (no services sueltos)

### DTOs y validacion
- [ ] Cada campo del DTO tiene decoradores de `class-validator`
- [ ] Los campos opcionales tienen `@IsOptional()`
- [ ] Los query params numericos usan `@Type(() => Number)`
- [ ] Swagger tiene `@ApiProperty()` en cada campo

### Base de datos
- [ ] Se usa `select` o `include` para limitar campos (no traer todo)
- [ ] No hay N+1 queries (usar `include` o `Promise.all`)
- [ ] Operaciones multi-tabla usan `$transaction`
- [ ] Los campos sensibles (passwordHash) no se retornan en la respuesta

### Seguridad
- [ ] Endpoints protegidos con `@UseGuards(JwtAuthGuard)`
- [ ] Endpoints de admin con `@Roles('ADMIN')`
- [ ] Se valida la propiedad del recurso (el usuario solo accede a sus datos)
- [ ] No se exponen IDs internos innecesariamente

### Errores
- [ ] Se usan las excepciones correctas de NestJS (404, 400, 409, etc.)
- [ ] Los mensajes de error son descriptivos
- [ ] Los edge cases estan cubiertos (recurso no encontrado, duplicados, etc.)

### API
- [ ] Las rutas siguen las convenciones REST
- [ ] Endpoints paginados retornan `{ data, meta }` estandar
- [ ] Los endpoints `/me` van antes de `/:id` en el controller
- [ ] Swagger esta documentado (`@ApiOperation`, `@ApiResponse`, `@ApiTags`)

### Testing
- [ ] Unit tests cubren los happy paths del service
- [ ] Unit tests cubren los error paths (not found, forbidden, conflict)
- [ ] Los tests no dependen de la base de datos real (usar mocks)
