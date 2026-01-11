defmodule DebugService.Router do
  @moduledoc """
  HTTP API for the Debug Service.

  Endpoints:
    - GET  /api/health - Health check
    - GET  /api/logs   - Get logs with filtering
    - POST /api/logs   - Add new logs
    - GET  /api/stats  - Get log statistics
    - DELETE /api/logs - Clear all logs
  """

  use Plug.Router
  require Logger

  plug Plug.Logger
  plug CORSPlug, origin: ["*"]
  plug :match
  plug Plug.Parsers,
    parsers: [:json],
    pass: ["application/json"],
    json_decoder: Jason
  plug :dispatch

  # Health check
  get "/api/health" do
    Logger.debug("[ROUTER] Health check")

    send_json(conn, 200, %{
      status: "healthy",
      service: "debug_service",
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    })
  end

  # Get logs
  get "/api/logs" do
    Logger.debug("[ROUTER] Get logs request")

    opts = [
      limit: parse_int(conn.query_params["limit"], 100),
      level: conn.query_params["level"],
      service: conn.query_params["service"]
    ]

    logs = DebugService.LogStore.get_logs(opts)

    send_json(conn, 200, %{
      logs: logs,
      count: length(logs)
    })
  end

  # Add logs
  post "/api/logs" do
    logs = conn.body_params["logs"] || []

    Logger.debug("[ROUTER] Adding #{length(logs)} logs")

    DebugService.LogStore.add_logs(logs)

    send_json(conn, 200, %{
      success: true,
      added: length(logs)
    })
  end

  # Get stats
  get "/api/stats" do
    Logger.debug("[ROUTER] Get stats request")

    stats = DebugService.LogStore.stats()

    send_json(conn, 200, stats)
  end

  # Clear logs
  delete "/api/logs" do
    Logger.info("[ROUTER] Clearing all logs")

    DebugService.LogStore.clear()

    send_json(conn, 200, %{success: true})
  end

  # Catch-all for unmatched routes
  match _ do
    send_json(conn, 404, %{error: "Not found"})
  end

  # ============================================================================
  # Helpers
  # ============================================================================

  defp send_json(conn, status, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(status, Jason.encode!(data))
  end

  defp parse_int(nil, default), do: default
  defp parse_int(str, default) do
    case Integer.parse(str) do
      {int, _} -> int
      :error -> default
    end
  end
end
