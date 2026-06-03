# Prueba Técnica Grupo Salinas DC - Plataforma de Monitoreo IoT en Tiempo Real

## 🏢 Contexto del Proyecto

**Empresa:** Grupo Salinas DC  
**Proyecto:** Sistema de monitoreo en tiempo real para dispositivos IoT desplegados en un centro de datos.

El centro de datos cuenta con **500+ dispositivos IoT** (sensores de temperatura, humedad, consumo eléctrico, estado de UPS, cooling systems). Se requiere una plataforma que permita:

- Monitorear en tiempo real el estado de todos los dispositivos
- Generar alertas cuando los valores excedan umbrales configurables
- Visualizar históricos y tendencias mediante dashboards
- Gestionar dispositivos (CRUD completo)
- Autenticación segura con roles (Admin, Operator, Viewer)

---

## 📋 Requisitos de Entrega

| Elemento | Obligatorio |
|----------|-------------|
| Repositorio Git con commits semánticos
| Backend funcional desplegable
| Frontend funcional desplegable
| Documentación Swagger/OpenAPI
| Colección Postman exportada
| README con instrucciones de despliegue
| Diagrama de arquitectura
| Video explicativo de la solución

---

## 🏗️ Arquitectura Esperada

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            AWS Cloud                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────┐    MQTT     ┌──────────┐    IoT Rule             │
│  │ EC2 - IoT Gateway │───────────▶│ IoT Core │──────────────┐          │
│  │ (Simulador/Daemon)│            │ (MQTT)   │              │          │
│  └───────────────────┘            └──────────┘              ▼          │
│                                                     ┌──────────────┐    │
│                                                     │ Lambda/EC2   │    │
│                                                     │ (Node.js)    │    │
│                                                     └──────┬───────┘    │
│                                                            │            │
│                          ┌─────────────────────────────────┼─────┐      │
│                          ▼                                 ▼     │      │
│                  ┌───────────────────┐            ┌─────────────┐│      │
│                  │ DynamoDB          │            │ API Gateway ││      │
│                  │ (Devices/Readings)│            │ (REST + WS) ││      │
│                  └───────────────────┘            └──────┬──────┘│      │
│                                                          │       │      │
│                                                          ▼       │      │
│                                                  ┌───────────────┐      │
│                                                  │ S3 + CloudFront│     │
│                                                  │ (Angular App) │      │
│                                                  └───────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 PARTE 1: BACKEND (Node.js)

### Modelos de Datos (DynamoDB)

#### Tabla: Devices
```json
{
  "PK": "DEVICE#<device_id>",
  "SK": "METADATA",
  "deviceId": "UUID",
  "name": "string",
  "type": "enum: [temperature, humidity, power, ups, cooling]",
  "location": { "rack": "string", "position": "number", "floor": "number" },
  "status": "enum: [online, offline, maintenance, critical]",
  "thresholds": { "min": "number", "max": "number", "criticalMin": "number", "criticalMax": "number" },
  "metadata": { "manufacturer": "string", "model": "string", "firmwareVersion": "string" },
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

#### Tabla: Readings
```json
{
  "PK": "DEVICE#<device_id>",
  "SK": "READING#<timestamp>",
  "value": "number",
  "unit": "string",
  "quality": "enum: [good, uncertain, bad]",
  "timestamp": "ISO8601",
  "TTL": "epoch + 30 days"
}
```

#### Tabla: Alerts
```json
{
  "PK": "ALERT#<alert_id>",
  "SK": "METADATA",
  "GSI1PK": "DEVICE#<device_id>",
  "severity": "enum: [info, warning, critical, emergency]",
  "type": "enum: [threshold_exceeded, device_offline, anomaly_detected]",
  "message": "string",
  "acknowledged": "boolean",
  "resolvedAt": "ISO8601 | null",
  "createdAt": "ISO8601"
}
```

#### Tabla: Users
```json
{
  "PK": "USER#<user_id>",
  "SK": "METADATA",
  "GSI1PK": "EMAIL#<email>",
  "email": "string",
  "passwordHash": "bcrypt",
  "role": "enum: [admin, operator, viewer]",
  "isActive": "boolean"
}
```

### API Endpoints Requeridos

#### Autenticación
| Método | Endpoint | Roles |
|--------|----------|-------|
| POST | /api/v1/auth/register | admin |
| POST | /api/v1/auth/login | público |
| POST | /api/v1/auth/refresh | autenticado |
| POST | /api/v1/auth/logout | autenticado |
| GET | /api/v1/auth/me | autenticado |

#### Dispositivos
| Método | Endpoint | Roles |
|--------|----------|-------|
| GET | /api/v1/devices | todos |
| GET | /api/v1/devices/:id | todos |
| POST | /api/v1/devices | admin, operator |
| PUT | /api/v1/devices/:id | admin, operator |
| PATCH | /api/v1/devices/:id/status | admin, operator |
| DELETE | /api/v1/devices/:id | admin |
| GET | /api/v1/devices/:id/readings | todos |
| GET | /api/v1/devices/:id/alerts | todos |
| GET | /api/v1/devices/stats/summary | todos |

#### Lecturas
| Método | Endpoint | Roles |
|--------|----------|-------|
| GET | /api/v1/readings | todos |
| POST | /api/v1/readings/batch | sistema |
| GET | /api/v1/readings/analytics | todos |

#### Alertas
| Método | Endpoint | Roles |
|--------|----------|-------|
| GET | /api/v1/alerts | todos |
| PATCH | /api/v1/alerts/:id/acknowledge | admin, operator |
| PATCH | /api/v1/alerts/:id/resolve | admin, operator |

#### Dashboard
| Método | Endpoint | Roles |
|--------|----------|-------|
| GET | /api/v1/dashboard/overview | todos |
| GET | /api/v1/dashboard/rack/:rackId | todos |
| GET | /api/v1/dashboard/trends | todos |

### Simulador IoT Gateway (EC2)

Se requiere implementar un **IoT Gateway** que corra como demonio en una instancia EC2 (o localmente en Docker) y simule dispositivos IoT publicando lecturas en tiempo real a AWS IoT Core vía MQTT.

#### Arquitectura del Gateway
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EC2 - IoT Gateway                                                          │
│  ┌────────────────────────────────────────────────────────┐                 │
│  │  Demonio Node.js (systemd service / Docker container)  │                 │
│  │                                                        │                 │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │                 │
│  │  │ Simulador   │  │ Simulador   │  │ Simulador   │   │                 │
│  │  │ Temperatura │  │ Humedad     │  │ Power/UPS   │   │                 │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │                 │
│  │         └─────────────────┼─────────────────┘         │                 │
│  │                           ▼                            │                 │
│  │                  ┌─────────────────┐                   │                 │
│  │                  │  MQTT Publisher  │                   │                 │
│  │                  │  (aws-iot-sdk)  │                   │                 │
│  │                  └────────┬────────┘                   │                 │
│  └───────────────────────────┼────────────────────────────┘                 │
└──────────────────────────────┼──────────────────────────────────────────────┘
                               │ MQTT (TLS)
                               ▼
                      ┌─────────────────┐
                      │  AWS IoT Core   │
                      │  Topic:         │
                      │  dt/devices/    │
                      │  {deviceId}/    │
                      │  telemetry      │
                      └────────┬────────┘
                               │ IoT Rule
                               ▼
                      ┌─────────────────┐
                      │  Backend        │
                      │  (Lambda/EC2)   │
                      └─────────────────┘
```

#### Requisitos del Gateway

**Demonio/Servicio:**
- Script Node.js que corra como proceso persistente (demonio)
- En desarrollo local: contenedor Docker dentro del `docker-compose`
- En AWS: servicio systemd en EC2 o contenedor ECS
- Debe reconectarse automáticamente si pierde conexión con IoT Core

**Simulación de dispositivos:**
- Generar lecturas realistas cada 5-10 segundos por dispositivo
- Tipos de lecturas según el tipo de sensor:
  - `temperature`: valores entre 18-45°C (umbral crítico > 35°C)
  - `humidity`: valores entre 20-80% (umbral crítico > 70%)
  - `power`: valores entre 0-100 kW
  - `ups`: valores de carga 0-100%
  - `cooling`: valores de flujo en L/min
- Simular anomalías con probabilidad configurable (ej: 5% de lecturas fuera de umbral)
- Simular cambios de estado (online → offline) con baja frecuencia

**Publicación MQTT:**
- Conectarse a AWS IoT Core usando certificados X.509 (Thing certificates)
- Publicar en topics con estructura: `dt/devices/{deviceId}/telemetry`
- Payload JSON:
```json
{
  "deviceId": "uuid",
  "value": 23.5,
  "unit": "°C",
  "quality": "good",
  "timestamp": "2026-05-11T10:30:00.000Z"
}
```

**Configuración por variables de entorno:**
| Variable | Descripción | Default |
|----------|-------------|---------|
| `IOT_ENDPOINT` | Endpoint de AWS IoT Core | — |
| `CERT_PATH` | Ruta al certificado del dispositivo | `./certs/` |
| `PUBLISH_INTERVAL_MS` | Intervalo entre publicaciones | `5000` |
| `ACTIVE_DEVICES` | Cantidad de dispositivos a simular | `20` |
| `ANOMALY_PROBABILITY` | Probabilidad de lectura fuera de umbral | `0.05` |
| `MQTT_TOPIC_PREFIX` | Prefijo del topic MQTT | `dt/devices` |

#### IoT Core Rules (Backend receptor)

El backend debe recibir las lecturas mediante una **IoT Rule** que invoque una Lambda o reenvíe a un endpoint HTTP. Al recibir cada lectura, el backend debe:

1. Persistir la lectura en DynamoDB (tabla Readings)
2. Evaluar umbrales del dispositivo y generar alertas si corresponde
3. Emitir el evento por WebSocket a los clientes suscritos

#### Desarrollo Local

Para desarrollo local sin acceso a IoT Core real, el gateway puede opcionalmente publicar directamente al backend vía HTTP (`POST /api/v1/readings/batch`) como fallback configurable:

```
MQTT_MODE=local  → publica vía HTTP al backend directamente
MQTT_MODE=aws    → publica vía MQTT a IoT Core
```

El simulador debe incluirse en el `docker-compose` como un servicio adicional que se levanta junto al backend.

### WebSocket Events
```
Servidor → Cliente: device:reading, device:status, alert:new, alert:resolved, dashboard:update
Cliente → Servidor: subscribe:device, subscribe:rack, unsubscribe:device, acknowledge:alert
```

### Requisitos Técnicos Backend
- JWT con access token (15 min) + refresh token (7 días) + rotación
- Rate limiting (5 intentos/min en auth)
- Validación con Joi o class-validator
- Error handler centralizado con logging estructurado
- Paginación cursor-based
- Cache en memoria (node-cache o similar) para KPIs (TTL 10s)
- Helmet.js, CORS, sanitización de inputs
- Swagger completo con schemas y ejemplos

---

## 🎨 PARTE 2: FRONTEND (Angular + TypeScript)

### Pantallas Requeridas

1. **Login** — Formulario reactivo, manejo de errores, responsive
2. **Dashboard** — KPIs, gráficas en tiempo real, mapa de calor por rack, feed de alertas
3. **Dispositivos** — CRUD con tabla filtrable, búsqueda con debounce, paginación
4. **Detalle Dispositivo** — Gráfica streaming, historial, estadísticas
5. **Alertas** — Lista filtrable, reconocer/resolver, notificaciones sonoras para críticas
6. **Analytics** — Tendencias, heatmap, exportar CSV

### Requisitos Técnicos Frontend
- State management (NgRx o similar)
- Gráficas con Chart.js/D3/ngx-charts (mínimo 4 tipos diferentes)
- Angular Material o PrimeNG
- Tema oscuro/claro
- Responsive (mobile-first)
- Lazy loading de módulos
- OnPush change detection
- TypeScript strict mode, sin `any`
- Guards + interceptors para JWT
- Directiva *hasRole

---

## 🚀 PARTE 3: INFRAESTRUCTURA AWS

- DynamoDB (single-table design, GSIs, TTL)
- API Gateway (REST + WebSocket)
- S3 + CloudFront para frontend
- Docker + docker-compose para desarrollo local
- Al menos un script IaC (CDK/CloudFormation/Terraform)
- Diagrama de arquitectura justificado

---

## 🎥 PARTE 4: VIDEO EXPLICATIVO

Se requiere grabar un **video de máximo 15 minutos** donde el aplicante explique cada componente de la solución implementada. El video debe cubrir:

1. **Arquitectura general** — Explicar el diagrama, decisiones de diseño y cómo se comunican los componentes
2. **IoT Gateway / Simulador** — Mostrar el demonio corriendo, la conexión MQTT a IoT Core y cómo se generan las lecturas
3. **Backend** — Recorrido por la estructura del proyecto, endpoints principales, autenticación JWT, WebSockets y manejo de alertas
4. **Frontend** — Navegación por las pantallas, state management, gráficas en tiempo real y funcionalidades clave
5. **Infraestructura** — Docker-compose, script IaC, y cómo se despliega en AWS
6. **Demo en vivo** — Mostrar el sistema funcionando end-to-end: simulador generando datos → backend procesando → frontend mostrando en tiempo real

**Formato de entrega:**
- Enlace a YouTube (no listado) o enlace de descarga (Google Drive, etc.)
- Incluir el enlace en el README del repositorio

---

¡Éxito!

---

*Versión 1.0 | Mayo 2026*
