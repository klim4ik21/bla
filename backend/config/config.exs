import Config

config :video_rooms,
  generators: [timestamp_type: :utc_datetime]

# Phoenix endpoint configuration
config :video_rooms, VideoRoomsWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Phoenix.Endpoint.Cowboy2Adapter,
  render_errors: [
    formats: [json: VideoRoomsWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: VideoRooms.PubSub,
  live_view: [signing_salt: "video_rooms_salt"]

# JSON library
config :phoenix, :json_library, Jason

# Logger configuration - verbose for debugging
config :logger, :console,
  format: "[$level] $time $metadata$message\n",
  metadata: [:request_id, :room_id, :participant_id, :module, :function]

config :logger,
  level: :debug,
  backends: [:console]

# SFU Provider configuration (default: LiveKit)
config :video_rooms, :sfu_provider, VideoRooms.SFU.LiveKitProvider

# Import environment specific config
import_config "#{config_env()}.exs"
