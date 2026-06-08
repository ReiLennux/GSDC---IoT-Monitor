# GSDC IoT Monitor

Plataforma de monitoreo en tiempo real para dispositivos IoT en centro de datos.

## Video Demo

[![Video Demo](https://img.youtube.com/vi/znXDLYthFg4/0.jpg)](https://youtu.be/znXDLYthFg4)

## Demo en Vivo

**Plataforma:** https://d574amddekt52.cloudfront.net/  

**Credenciales:** `admin@iot.local` / `Admin123!`

## Repositorios

| Componente | README                                         |
|-----------|------------------------------------------------|
| Backend   | [Backend/README.md](./Backend/README.md)       |
| Frontend  | [Frontend/README.md](./Frontend/README.md)     |

## Stack

| Capa     | Tecnología                           |
|----------|--------------------------------------|
| Backend  | Node.js 20, Express 5, DynamoDB      |
| Frontend | Angular 21, PrimeNG 21, Socket.IO    |
| WS       | Socket.IO 4                          |
| BD       | DynamoDB (single-table, 2 GSIs)      |
| Cache    | node-cache (TTL 10s)                 |

## Inicio Rápido

```bash
# 1. DynamoDB local
cd Backend && docker compose up dynamodb-local -d

# 2. Backend
npm install && npm run db:init && npm run dev

# 3. Frontend (otra terminal)
cd Frontend && npm install && npm start

# 4. Simulador (otra terminal)
cd Backend && npm run simulator
```

- Frontend: http://localhost:4200
- API + Swagger: http://localhost:3000/api-docs

## Arquitectura

### Backend

<img src="./assets/backend/Backend_diagrama.png" alt="Backend Architecture" width="800">

### Frontend

<img src="./assets/frontend/Frontend_diagrama.png" alt="Frontend Architecture" width="800">

## Documentación

- [Especificación técnica](./PRUEBA_TECNICA.md)
- [Colección Postman](./IoT%20Monitor%20API.postman_collection.json)
