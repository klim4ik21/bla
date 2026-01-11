defmodule VideoRoomsWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :video_rooms

  # Session configuration
  @session_options [
    store: :cookie,
    key: "_video_rooms_key",
    signing_salt: "video_rooms_signing_salt",
    same_site: "Lax"
  ]

  # WebSocket for Phoenix Channels
  socket "/ws", VideoRoomsWeb.UserSocket,
    websocket: [timeout: 45_000],
    longpoll: false

  # LiveView socket (if needed in future)
  socket "/live", Phoenix.LiveView.Socket,
    websocket: [connect_info: [session: @session_options]]

  # Serve static files (if any)
  plug Plug.Static,
    at: "/",
    from: :video_rooms,
    gzip: false,
    only: VideoRoomsWeb.static_paths()

  # Code reloading in dev
  if code_reloading? do
    plug Phoenix.CodeReloader
  end

  # Request logging
  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  # Parse body
  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug Plug.MethodOverride
  plug Plug.Head
  plug Plug.Session, @session_options

  # CORS support
  plug CORSPlug, origin: ["*"]

  # Router
  plug VideoRoomsWeb.Router
end
