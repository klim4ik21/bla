defmodule DebugService.Application do
  @moduledoc """
  Debug Service Application.

  Provides centralized logging for all VideoRooms services.
  """

  use Application
  require Logger

  @impl true
  def start(_type, _args) do
    port = Application.get_env(:debug_service, :port, 5000)

    Logger.info("[DEBUG_SERVICE] Starting Debug Service on port #{port}")

    children = [
      # Log store - keeps logs in memory
      DebugService.LogStore,
      # HTTP API
      {Plug.Cowboy, scheme: :http, plug: DebugService.Router, options: [port: port]}
    ]

    opts = [strategy: :one_for_one, name: DebugService.Supervisor]

    case Supervisor.start_link(children, opts) do
      {:ok, pid} ->
        Logger.info("[DEBUG_SERVICE] ✓ Debug Service started successfully on http://localhost:#{port}")
        {:ok, pid}

      {:error, reason} = error ->
        Logger.error("[DEBUG_SERVICE] ✗ Failed to start: #{inspect(reason)}")
        error
    end
  end
end
