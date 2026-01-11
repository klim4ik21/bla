# VideoRooms Architecture

## Обзор

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NGINX (Port 80)                               │
│                    Reverse Proxy + Static Files                      │
├─────────────────────────────────────────────────────────────────────┤
│  /          → Frontend (React SPA)                                   │
│  /api/*     → Backend (Elixir/Phoenix)                              │
│  /ws        → Backend WebSocket (Phoenix Channels)                   │
│  /debug/*   → Debug Service                                          │
│  /livekit/* → LiveKit Server                                         │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┬─────────────────┐
    │                 │                 │                 │
    ▼                 ▼                 ▼                 ▼
┌─────────┐    ┌──────────┐    ┌──────────────┐    ┌─────────┐
│Frontend │    │ Backend  │    │Debug Service │    │ LiveKit │
│ React   │◄──►│ Elixir   │───►│   Elixir     │    │   SFU   │
│  :3000  │    │  :4000   │    │    :5000     │    │  :7880  │
└────┬────┘    └────┬─────┘    └──────────────┘    └────┬────┘
     │              │                                    │
     │              │ Генерация JWT Token               │
     │              ├──────────────────────────────────►│
     │              │                                    │
     │ WebRTC Signaling + Media                         │
     └──────────────────────────────────────────────────┘
```

## Компоненты

### 1. Frontend (React + TypeScript)

**Путь:** `/frontend`

**Архитектура:**
```
src/
├── adapters/          # Абстракция SFU (LiveKit adapter)
│   └── sfu/
│       ├── types.ts         # SFU интерфейс
│       ├── livekitAdapter.ts # LiveKit реализация
│       └── index.ts         # Экспорт и фабрика
├── hooks/             # React хуки
│   ├── useRoom.ts          # Управление комнатой
│   ├── useServiceStatus.ts # Статус сервисов
│   └── useLogs.ts          # Debug логи
├── services/          # API и утилиты
│   ├── api.ts              # HTTP клиент
│   ├── debugLogger.ts      # Логирование
│   └── socket.ts           # Phoenix WebSocket
├── components/        # UI компоненты
│   ├── VideoTile.tsx       # Видео участника
│   ├── ControlBar.tsx      # Кнопки управления
│   └── DebugPanel.tsx      # Панель статуса
└── pages/             # Страницы
    ├── HomePage.tsx        # Создание комнаты
    ├── RoomPage.tsx        # Видеозвонок
    └── LogsPage.tsx        # Просмотр логов
```

**Ключевые паттерны:**
- **Adapter Pattern** для SFU - легко заменить LiveKit
- **Custom Hooks** для бизнес-логики
- **Service Layer** для API взаимодействия

### 2. Backend (Elixir + Phoenix)

**Путь:** `/backend`

**Архитектура:**
```
lib/
├── video_rooms/
│   ├── sfu/                  # SFU абстракция
│   │   ├── provider.ex       # Behaviour определение
│   │   └── livekit_provider.ex # LiveKit реализация
│   ├── rooms/
│   │   └── room_manager.ex   # GenServer для комнат
│   └── debug/
│       └── logger.ex         # Отправка логов
└── video_rooms_web/
    ├── controllers/
    │   ├── room_controller.ex
    │   ├── health_controller.ex
    │   └── status_controller.ex
    └── channels/
        ├── room_channel.ex   # События комнаты
        └── debug_channel.ex  # Стриминг логов
```

**Ключевые паттерны:**
- **Behaviour** для SFU провайдеров
- **GenServer** для состояния комнат
- **Phoenix Channels** для real-time
- **Telemetry** для метрик

### 3. Debug Service (Elixir)

**Путь:** `/debug-service`

Простой сервис для сбора логов:
- In-memory хранилище (circular buffer)
- REST API для получения/добавления логов
- Фильтрация по уровню/сервису

### 4. LiveKit SFU

Готовый Docker образ `livekit/livekit-server`:
- WebRTC SFU
- Автоматическое создание комнат
- JWT аутентификация

## SFU Абстракция

### Backend (Elixir)

```elixir
# Определение поведения
defmodule VideoRooms.SFU.Provider do
  @callback create_room(room_id, opts) :: {:ok, room_info} | {:error, term}
  @callback delete_room(room_id) :: :ok | {:error, term}
  @callback generate_token(room_id, participant_id, name, opts) :: {:ok, token} | {:error, term}
  @callback get_room_info(room_id) :: {:ok, room_info} | {:error, term}
  @callback health_check() :: {:ok, status} | {:error, term}
end

# Реализация для LiveKit
defmodule VideoRooms.SFU.LiveKitProvider do
  @behaviour VideoRooms.SFU.Provider
  
  @impl true
  def generate_token(room_id, participant_id, name, opts) do
    # JWT генерация для LiveKit
  end
end
```

### Frontend (TypeScript)

```typescript
// Интерфейс адаптера
interface SFUAdapter {
  connect(config: SFUConfig, callbacks: SFUCallbacks): Promise<void>;
  disconnect(): Promise<void>;
  setAudioEnabled(enabled: boolean): Promise<void>;
  setVideoEnabled(enabled: boolean): Promise<void>;
  getLocalParticipant(): SFUParticipant | null;
  getRemoteParticipants(): SFUParticipant[];
}

// Реализация для LiveKit
class LiveKitAdapter implements SFUAdapter {
  // LiveKit специфичная логика
}
```

## Замена LiveKit на свой SFU

### Шаг 1: Backend

1. Создайте новый модуль, реализующий `VideoRooms.SFU.Provider`:

```elixir
defmodule VideoRooms.SFU.CustomProvider do
  @behaviour VideoRooms.SFU.Provider
  
  @impl true
  def create_room(room_id, opts) do
    # Ваша реализация
  end
  
  # ... остальные callbacks
end
```

2. Обновите конфигурацию:

```elixir
config :video_rooms, :sfu_provider, VideoRooms.SFU.CustomProvider
```

### Шаг 2: Frontend

1. Создайте новый адаптер в `src/adapters/sfu/`:

```typescript
export class CustomSFUAdapter implements SFUAdapter {
  async connect(config: SFUConfig, callbacks: SFUCallbacks): Promise<void> {
    // Ваша реализация
  }
  // ... остальные методы
}
```

2. Обновите фабрику в `src/adapters/sfu/index.ts`:

```typescript
export { createCustomAdapter as createSFUAdapter } from './customAdapter';
```

### Шаг 3: Docker

Обновите `docker-compose.yml` для вашего SFU сервера.

## Debug Flow

```
Frontend Log → debugLogger.info() → HTTP POST /debug/api/logs
                                          ↓
Backend Log → VideoRooms.Debug.log() → HTTP POST → Debug Service
                                                         ↓
                                              LogStore (GenServer)
                                                         ↓
                                         GET /debug/api/logs ← Frontend /logs page
```

## Порты и эндпоинты

| Service | Port | Endpoints |
|---------|------|-----------|
| Nginx | 80 | / (proxy) |
| Frontend | 3000 | Static SPA |
| Backend | 4000 | /api/*, /ws |
| Debug | 5000 | /api/logs, /api/stats |
| LiveKit | 7880 | WebRTC signaling |

## Переменные окружения

| Variable | Service | Description |
|----------|---------|-------------|
| LIVEKIT_API_KEY | Backend | LiveKit API Key |
| LIVEKIT_API_SECRET | Backend | LiveKit API Secret |
| LIVEKIT_URL | Backend | Internal LiveKit URL |
| LIVEKIT_PUBLIC_URL | Backend/Frontend | Public LiveKit URL |
| SECRET_KEY_BASE | Backend | Phoenix secret |
| DEBUG_SERVICE_URL | Backend | Debug service URL |
