import Config

config :video_rooms, VideoRoomsWeb.Endpoint,
  http: [ip: {0, 0, 0, 0}, port: 4000],
  check_origin: false,
  code_reloader: true,
  debug_errors: true,
  secret_key_base: "dev_secret_key_base_that_is_at_least_64_bytes_long_for_development",
  watchers: []

# LiveKit configuration for development
config :video_rooms, :livekit,
  api_key: System.get_env("LIVEKIT_API_KEY", "devkey"),
  api_secret: System.get_env("LIVEKIT_API_SECRET", "secret_that_is_at_least_32_characters_long"),
  url: System.get_env("LIVEKIT_URL", "ws://localhost:7880"),
  public_url: System.get_env("LIVEKIT_PUBLIC_URL", "ws://localhost:7880")

# Debug service configuration
config :video_rooms, :debug_service,
  url: System.get_env("DEBUG_SERVICE_URL", "http://localhost:5000"),
  enabled: true

# Enable dev routes for debugging
config :video_rooms, dev_routes: true

# Verbose logging in development
config :logger, level: :debug
