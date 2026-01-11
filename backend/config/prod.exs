import Config

config :video_rooms, VideoRoomsWeb.Endpoint,
  http: [ip: {0, 0, 0, 0}, port: 4000],
  check_origin: false,
  server: true

# Production logging - still verbose for debugging
config :logger,
  level: :info,
  backends: [:console]

config :logger, :console,
  format: "[$level] $time $metadata$message\n",
  metadata: [:request_id, :room_id, :participant_id]
