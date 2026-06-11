# GSDC IoT Monitor — Backend

API REST + WebSocket para monitoreo IoT en tiempo real.

## Arquitectura

```
┌──────────────────┐    MQTT/TLS     ┌──────────┐    IoT Rule     ┌──────────────┐
│ EC2 Simulador    │───────────────▶│ IoT Core │───────────────▶│   Lambda     │
│ (aws-iot-sdk)    │  (X.509 certs) │          │                │ (Node.js 20) │
└──────────────────┘                └──────────┘                └──────┬───────┘
                                                                       │
                            ┌──────────────────────────────────────────┼───────┐
                            │            ┌────────────────┐           │       │
                            │    HTTP    │ API Gateway    │◀─── HTTP          │
                            │◀───────────│ (REST)        │                   │
                            │            └────────────────┘                   │
                            ▼                                                 ▼
                   ┌────────────────┐                              ┌──────────────┐
                   │ CloudFront CDN │                              │  DynamoDB    │
                   │ (S3 origin)    │                              │ (GSIs + TTL) │
                   └────────────────┘                              └──────────────┘
```

## Estructura

```
Backend/src/
├── application/
│   ├── dtos/          # DTOs con class-validator
│   └── usecases/      # Casos de uso (lógica de negocio)
├── config/            # Env, Swagger
├── domain/
│   ├── entities/      # Entidades del dominio
│   ├── enums/         # Enumeraciones
│   └── repositories/  # Interfaces de repositorio
├── infrastructure/
│   ├── cache/         # KPI cache (node-cache)
│   ├── database/      # DynamoDB repositorios + init-db
│   ├── security/      # Bcrypt, JWT
│   └── websocket/     # Socket.IO server + emitters
├── presentation/
│   ├── controllers/   # Express controllers
│   ├── middleware/     # Auth, sanitize, validate, error handler
│   └── routes/        # Express routers
├── iot-simulator/     # Simulador de dispositivos IoT
├── scripts/           # init-db.ts
├── container.ts       # DI container
└── index.ts           # Entry point
```

## Stack

| Capa           | Tecnología                    |
|---------------|-------------------------------|
| Runtime       | Node.js 20+, TypeScript 6     |
| Framework     | Express 5                     |
| Base de datos | DynamoDB (single-table)       |
| Cache         | node-cache (TTL 10s)          |
| WebSocket     | Socket.IO 4                   |
| Autenticación | JWT (access 15min + refresh 7d) |
| Validación    | class-validator + Joi         |
| Logging       | Winston                       |
| Documentación | Swagger/OpenAPI               |

## Prerrequisitos

- Node.js 20+
- Docker + docker-compose (DynamoDB local)
- npm 10+

## Inicio Rápido

### 1. Base de Datos

```bash
docker compose up dynamodb-local -d
```

DynamoDB Local disponible en `http://localhost:8000`.

### 2. Configurar variables

```bash
cp .env.example .env  # o editar .env existente
```

Variables principales:

| Variable              | Default                    | Descripción                |
|----------------------|----------------------------|---------------------------|
| `PORT`               | 3000                       | Puerto del servidor       |
| `JWT_SECRET`         | (cambiar en prod)          | Secreto access token      |
| `JWT_REFRESH_SECRET` | (cambiar en prod)          | Secreto refresh token     |
| `DYNAMODB_ENDPOINT`  | http://localhost:8000       | Endpoint DynamoDB         |
| `DYNAMODB_TABLE_NAME`| IoT_Monitor_Table          | Nombre de la tabla        |

### 3. Inicializar tabla

```bash
npm install
npm run db:init
```

Crea la tabla con GSI1 y GSI2, seedea usuarios:

| Rol    | Email               | Password     |
|--------|---------------------|--------------|
| Admin  | admin@iot.local     | Admin123!    |
| System | system@iot.local    | System123!   |

### 4. Iniciar servidor

```bash
npm run dev
```

Servidor en `http://localhost:3000`. Swagger en `http://localhost:3000/api-docs`.

### 5. Iniciar simulador

```bash
npm run simulator
```

Genera 20 dispositivos con lecturas cada 5 segundos y 5% de anomalías.

## Despliegue Docker

```bash
docker compose up -d --build
```

Levanta DynamoDB Local, API y simulador. La API corre el build de producción (`dist/index.js`).

## API Endpoints

### Autenticación (rate limit: 5/min)

| Método | Endpoint                  | Roles        |
|--------|---------------------------|--------------|
| POST   | /api/v1/auth/register     | admin        |
| POST   | /api/v1/auth/login        | público      |
| POST   | /api/v1/auth/refresh      | autenticado  |
| POST   | /api/v1/auth/logout       | autenticado  |
| GET    | /api/v1/auth/me           | autenticado  |

### Dispositivos (paginación cursor-based)

| Método | Endpoint                       | Roles             |
|--------|--------------------------------|-------------------|
| GET    | /api/v1/devices                | todos             |
| GET    | /api/v1/devices/:id            | todos             |
| POST   | /api/v1/devices                | admin, operator   |
| PUT    | /api/v1/devices/:id            | admin, operator   |
| PATCH  | /api/v1/devices/:id/status     | admin, operator   |
| DELETE | /api/v1/devices/:id            | admin             |
| GET    | /api/v1/devices/:id/readings   | todos             |
| GET    | /api/v1/devices/:id/alerts     | todos             |
| GET    | /api/v1/devices/stats/summary  | todos             |

### Lecturas

| Método | Endpoint                    | Roles                    |
|--------|-----------------------------|--------------------------|
| GET    | /api/v1/readings            | todos                    |
| POST   | /api/v1/readings/batch      | admin, operator, system  |
| GET    | /api/v1/readings/analytics  | todos                    |

### Alertas (paginación cursor-based, GSI2)

| Método | Endpoint                             | Roles             |
|--------|--------------------------------------|-------------------|
| GET    | /api/v1/alerts                       | todos             |
| PATCH  | /api/v1/alerts/:id/acknowledge       | admin, operator   |
| PATCH  | /api/v1/alerts/:id/resolve           | admin, operator   |

### Dashboard (cache 10s)

| Método | Endpoint                       | Roles |
|--------|--------------------------------|-------|
| GET    | /api/v1/dashboard/overview     | todos |
| GET    | /api/v1/dashboard/rack/:rackId | todos |
| GET    | /api/v1/dashboard/trends       | todos |

## Diseño DynamoDB (Single-Table)

| Entidad  | PK              | SK                | GSI1PK            | GSI2PK | GSI2SK    |
|----------|-----------------|-------------------|-------------------|--------|-----------|
| Device   | DEVICE#<uuid>   | METADATA          | DEVICE            | —      | —         |
| Reading  | DEVICE#<uuid>   | READING#<ts>      | —                 | —      | —         |
| Alert    | ALERT#<uuid>    | METADATA          | DEVICE#<deviceId> | ALERT  | createdAt |
| User     | USER#<uuid>     | METADATA          | EMAIL#<email>     | —      | —         |

- **GSI1**: listar devices (`DEVICE`), alerts por device (`DEVICE#<id>`), usuarios por email (`EMAIL#<email>`)
- **GSI2**: listar alerts ordenadas por `createdAt`
- **TTL**: 30 días en lecturas

## WebSocket Events

| Dirección     | Evento               | Payload                         |
|--------------|----------------------|---------------------------------|
| Server→Client | device:reading      | `{ deviceId, reading }`        |
| Server→Client | device:status       | `{ deviceId, status }`          |
| Server→Client | alert:new           | `Alert`                         |
| Server→Client | alert:resolved      | `{ alertId }`                   |
| Server→Client | dashboard:update    | `{ type, deviceId }`            |
| Client→Server | subscribe:device    | `string` (deviceId)             |
| Client→Server | subscribe:rack      | `string` (rackId)               |
| Client→Server | unsubscribe:device  | `string` (deviceId)             |

## Variables de Entorno (Simulador)

| Variable               | Default                    | Descripción                   |
|-----------------------|----------------------------|-------------------------------|
| `MQTT_MODE`           | local                      | `local` (HTTP) o `aws` (MQTT)|
| `ACTIVE_DEVICES`      | 20                         | Dispositivos a simular        |
| `PUBLISH_INTERVAL_MS` | 5000                       | Intervalo entre lecturas      |
| `ANOMALY_PROBABILITY` | 0.05                       | Probabilidad de anomalía      |
| `BACKEND_URL`         | http://api:3000            | URL del backend (modo local)  |

## Scripts

| Comando            | Descripción                          |
|-------------------|--------------------------------------|
| `npm run dev`     | Inicia servidor con hot-reload       |
| `npm run build`   | Compila TypeScript                   |
| `npm start`       | Inicia servidor de producción        |
| `npm run simulator` | Inicia simulador IoT             |
| `npm run db:init` | Inicializa tabla DynamoDB + seed     |
