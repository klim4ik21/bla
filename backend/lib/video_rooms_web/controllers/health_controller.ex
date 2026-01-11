defmodule VideoRoomsWeb.HealthController do
  @moduledoc """
  Health check controller for load balancers and monitoring.
  """

  use VideoRoomsWeb, :controller
  require Logger

  @doc """
  GET /api/health

  Returns service health status.
  """
  def check(conn, _params) do
    Logger.debug("[HEALTH] Health check requested")

    json(conn, %{
      status: "healthy",
      service: "video_rooms_backend",
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    })
  end
end
