# Video Rooms - Elixir + LiveKit + React

Минималистичное приложение для видеоконференций с чистой архитектурой.

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                          NGINX (80)                              │
│         Reverse Proxy + Load Balancer + Static Files            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┬─────────────────┐
    │                 │                 │                 │
    ▼                 ▼                 ▼                 ▼
┌─────────┐    ┌──────────┐    ┌──────────────┐    ┌─────────┐
│Frontend │    │ Backend  │    │Debug Service │    │ LiveKit │
│ React   │    │ Elixir   │    │   Elixir     │    │   SFU   │
│  :3000  │    │  :4000   │    │    :5000     │    │  :7880  │
└─────────┘    └──────────┘    └──────────────┘    └─────────┘
```

## Быстрый старт

```bash
# Клонировать и запустить
docker compose up -d

# Открыть в браузере
open http://localhost
```

## Особенности

- **SFU Abstraction Layer** - легко заменить LiveKit на свой SFU
- **Централизованное логирование** - все логи в одном месте через WebSocket
- **Debug Panel** - визуальный статус всех сервисов в реальном времени
- **Clean Architecture** - TypeScript/Elixir best practices

## Структура проекта

```
.
├── backend/              # Elixir/Phoenix API
│   ├── lib/
│   │   └── video_rooms/
│   │       ├── sfu/     # SFU abstraction (behaviours)
│   │       └── rooms/   # Room management
│   └── Dockerfile
│
├── frontend/            # React/TypeScript SPA
│   ├── src/
│   │   ├── adapters/   # SFU adapters (LiveKit, custom)
│   │   ├── hooks/      # React hooks
│   │   ├── services/   # API services
│   │   └── components/ # UI components
│   └── Dockerfile
│
├── debug-service/       # Centralized logging
│   └── Dockerfile
│
├── config/
│   ├── nginx.conf      # Nginx configuration
│   └── livekit.yaml    # LiveKit configuration
│
└── docker-compose.yml
```

## Endpoints

| Path | Service | Description |
|------|---------|-------------|
| `/` | Frontend | React SPA |
| `/r/:room_id` | Frontend | Room view |
| `/logs` | Frontend | Debug logs viewer |
| `/api/*` | Backend | REST API |
| `/ws` | Backend | Phoenix Channels |
| `/debug/*` | Debug Service | Logs API |
| `/debug/ws` | Debug Service | Logs WebSocket |

## API

### Create Room
```bash
POST /api/rooms
Content-Type: application/json

{"participant_name": "John"}

# Response
{
  "room_id": "abc123",
  "token": "eyJ...",
  "livekit_url": "ws://localhost:7880"
}
```

### Join Room
```bash
POST /api/rooms/:room_id/join
Content-Type: application/json

{"participant_name": "Jane"}

# Response
{
  "token": "eyJ...",
  "livekit_url": "ws://localhost:7880"
}
```

## Environment Variables

Скопируйте `env.example` в `.env` и настройте:

```bash
cp env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `LIVEKIT_API_KEY` | LiveKit API Key | `devkey` |
| `LIVEKIT_API_SECRET` | LiveKit API Secret | `secret_...` |
| `LIVEKIT_PUBLIC_URL` | Public LiveKit URL | `ws://localhost:7880` |
| `SECRET_KEY_BASE` | Phoenix secret | (generated) |

## Development

### Backend (Elixir)
```bash
cd backend
mix deps.get
mix phx.server
```

### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

### Debug Service
```bash
cd debug-service
mix deps.get
mix run --no-halt
```

## Замена LiveKit на свой SFU

1. Реализуйте behaviour `VideoRooms.SFU.Provider` в backend
2. Создайте adapter в `frontend/src/adapters/`
3. Обновите конфигурацию

Пример нового провайдера:
```elixir
defmodule VideoRooms.SFU.CustomProvider do
  @behaviour VideoRooms.SFU.Provider
  
  @impl true
  def create_room(room_id, opts) do
    # Your implementation
  end
  
  @impl true
  def generate_token(room_id, participant_id, participant_name) do
    # Your implementation
  end
end
```

## License

MIT
