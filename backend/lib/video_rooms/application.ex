defmodule VideoRooms.Application do
  @moduledoc """
  OTP Application for VideoRooms.

  Starts all supervision trees and processes.
  """
  use Application
  require Logger

  @impl true
  def start(_type, _args) do
    Logger.info("[APPLICATION] Starting VideoRooms application...")

    children = [
      # Telemetry supervisor for metrics
      VideoRoomsWeb.Telemetry,
      # PubSub for Phoenix Channels
      {Phoenix.PubSub, name: VideoRooms.PubSub},
      # Room Registry - tracks active rooms
      {Registry, keys: :unique, name: VideoRooms.RoomRegistry},
      # Room Manager - GenServer for room operations
      VideoRooms.Rooms.RoomManager,
      # Debug Logger - sends logs to debug service
      VideoRooms.Debug.Logger,
      # Phoenix Endpoint - must be last
      VideoRoomsWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: VideoRooms.Supervisor]

    Logger.info("[APPLICATION] Starting supervision tree with #{length(children)} children")

    case Supervisor.start_link(children, opts) do
      {:ok, pid} ->
        Logger.info("[APPLICATION] ✓ VideoRooms started successfully")
        log_startup_info()
        {:ok, pid}

      {:error, reason} = error ->
        Logger.error("[APPLICATION] ✗ Failed to start: #{inspect(reason)}")
        error
    end
  end

  @impl true
  def config_change(changed, _new, removed) do
    Logger.info("[APPLICATION] Config changed: #{inspect(changed)}, removed: #{inspect(removed)}")
    VideoRoomsWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  defp log_startup_info do
    livekit_config = Application.get_env(:video_rooms, :livekit, [])
    debug_config = Application.get_env(:video_rooms, :debug_service, [])

    Logger.info("""
    [APPLICATION] Configuration:
      - LiveKit URL: #{Keyword.get(livekit_config, :url, "not configured")}
      - LiveKit Public URL: #{Keyword.get(livekit_config, :public_url, "not configured")}
      - Debug Service: #{Keyword.get(debug_config, :url, "not configured")}
      - SFU Provider: #{Application.get_env(:video_rooms, :sfu_provider, "not configured")}
    """)
  end
end
