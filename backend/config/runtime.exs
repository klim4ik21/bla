import Config

# Runtime configuration - loaded at runtime, not compile time
# This is crucial for Docker where env vars are set at runtime

if config_env() == :prod do
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  host = System.get_env("PHX_HOST", "localhost")
  port = String.to_integer(System.get_env("PHX_PORT", "4000"))

  config :video_rooms, VideoRoomsWeb.Endpoint,
    url: [host: host, port: 80],
    http: [ip: {0, 0, 0, 0}, port: port],
    secret_key_base: secret_key_base
end

# LiveKit configuration (available in all environments)
config :video_rooms, :livekit,
  api_key: System.get_env("LIVEKIT_API_KEY", "devkey"),
  api_secret: System.get_env("LIVEKIT_API_SECRET", "secret_that_is_at_least_32_characters_long"),
  url: System.get_env("LIVEKIT_URL", "ws://localhost:7880"),
  public_url: System.get_env("LIVEKIT_PUBLIC_URL", "ws://localhost:7880")

# Debug service configuration
config :video_rooms, :debug_service,
  url: System.get_env("DEBUG_SERVICE_URL", "http://localhost:5000"),
  enabled: System.get_env("DEBUG_SERVICE_ENABLED", "true") == "true"
