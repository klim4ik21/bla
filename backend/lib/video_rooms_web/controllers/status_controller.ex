defmodule VideoRoomsWeb.StatusController do
  @moduledoc """
  Status controller for monitoring all services.

  Provides a comprehensive view of:
  - Backend status
  - SFU (LiveKit) status
  - Debug service status
  """

  use VideoRoomsWeb, :controller
  require Logger
  alias VideoRooms.SFU.Provider
  alias VideoRooms.Rooms.RoomManager
  alias VideoRooms.Debug

  @doc """
  GET /api/status

  Returns comprehensive status of all services.
  """
  def index(conn, _params) do
    Logger.info("[STATUS] Status check requested")
    Debug.log(:backend, :info, "Status check requested", %{})

    # Check all services in parallel
    tasks = [
      Task.async(fn -> check_backend() end),
      Task.async(fn -> check_sfu() end),
      Task.async(fn -> check_debug_service() end)
    ]

    [backend_status, sfu_status, debug_status] = Task.await_many(tasks, 10_000)

    overall_status = determine_overall_status([backend_status, sfu_status, debug_status])

    response = %{
      overall: overall_status,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
      services: %{
        backend: backend_status,
        sfu: sfu_status,
        debug: debug_status
      }
    }

    Debug.log(:backend, :info, "Status check completed", %{overall: overall_status})

    status_code = if overall_status == "healthy", do: 200, else: 503

    conn
    |> put_status(status_code)
    |> json(response)
  end

  # ============================================================================
  # Private Functions
  # ============================================================================

  defp check_backend do
    rooms = RoomManager.list_rooms()

    %{
      status: "healthy",
      latency_ms: 0,
      details: %{
        active_rooms: length(rooms),
        total_participants: Enum.reduce(rooms, 0, fn r, acc -> acc + map_size(r.participants) end)
      }
    }
  end

  defp check_sfu do
    provider = Provider.get_provider()

    case provider.health_check() do
      {:ok, status} ->
        %{
          status: to_string(status.status),
          latency_ms: status.latency_ms,
          message: status.message
        }

      {:error, reason} ->
        %{
          status: "unhealthy",
          latency_ms: 0,
          message: inspect(reason)
        }
    end
  end

  defp check_debug_service do
    config = Application.get_env(:video_rooms, :debug_service, [])
    url = Keyword.get(config, :url)

    if url do
      start_time = System.monotonic_time(:millisecond)

      case HTTPoison.get("#{url}/api/health", [], recv_timeout: 5000) do
        {:ok, %{status_code: code}} when code in 200..299 ->
          %{
            status: "healthy",
            latency_ms: System.monotonic_time(:millisecond) - start_time,
            message: "Debug service responding"
          }

        {:ok, %{status_code: code}} ->
          %{
            status: "degraded",
            latency_ms: System.monotonic_time(:millisecond) - start_time,
            message: "Debug service returned #{code}"
          }

        {:error, %HTTPoison.Error{reason: reason}} ->
          %{
            status: "unhealthy",
            latency_ms: 0,
            message: "Debug service unreachable: #{inspect(reason)}"
          }
      end
    else
      %{
        status: "unconfigured",
        latency_ms: 0,
        message: "Debug service URL not configured"
      }
    end
  end

  defp determine_overall_status(statuses) do
    status_values = Enum.map(statuses, & &1.status)

    cond do
      Enum.all?(status_values, &(&1 == "healthy")) -> "healthy"
      Enum.any?(status_values, &(&1 == "unhealthy")) -> "unhealthy"
      true -> "degraded"
    end
  end
end
