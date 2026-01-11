defmodule VideoRoomsWeb.Router do
  use Phoenix.Router
  import Plug.Conn
  import Phoenix.Controller

  require Logger

  pipeline :api do
    plug :accepts, ["json"]
    plug :log_request
  end

  # API Routes
  scope "/api", VideoRoomsWeb do
    pipe_through :api

    # Health check
    get "/health", HealthController, :check

    # Room management
    post "/rooms", RoomController, :create
    get "/rooms", RoomController, :index
    get "/rooms/:id", RoomController, :show
    post "/rooms/:id/join", RoomController, :join
    delete "/rooms/:id/leave", RoomController, :leave

    # Service status
    get "/status", StatusController, :index
  end

  # Catch-all for 404
  match :*, "/*path", VideoRoomsWeb.FallbackController, :not_found

  # ============================================================================
  # Custom Plugs
  # ============================================================================

  defp log_request(conn, _opts) do
    start_time = System.monotonic_time(:millisecond)

    Logger.info("[ROUTER] #{conn.method} #{conn.request_path}",
      method: conn.method,
      path: conn.request_path,
      remote_ip: format_ip(conn.remote_ip)
    )

    VideoRooms.Debug.log(:backend, :debug, "Incoming request", %{
      method: conn.method,
      path: conn.request_path,
      remote_ip: format_ip(conn.remote_ip)
    })

    register_before_send(conn, fn conn ->
      duration = System.monotonic_time(:millisecond) - start_time

      Logger.info("[ROUTER] #{conn.method} #{conn.request_path} -> #{conn.status} (#{duration}ms)",
        method: conn.method,
        path: conn.request_path,
        status: conn.status,
        duration_ms: duration
      )

      conn
    end)
  end

  defp format_ip({a, b, c, d}), do: "#{a}.#{b}.#{c}.#{d}"
  defp format_ip(ip), do: inspect(ip)
end
