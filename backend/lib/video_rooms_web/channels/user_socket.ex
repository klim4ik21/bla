defmodule VideoRoomsWeb.UserSocket do
  @moduledoc """
  Phoenix Socket for real-time communication.

  Handles WebSocket connections for:
  - Room events (participant joined/left)
  - Debug log streaming
  """

  use Phoenix.Socket
  require Logger

  # Channels
  channel "room:*", VideoRoomsWeb.RoomChannel
  channel "debug:*", VideoRoomsWeb.DebugChannel

  @impl true
  def connect(params, socket, _connect_info) do
    Logger.debug("[SOCKET] New connection attempt: #{inspect(params)}")

    VideoRooms.Debug.log(:backend, :debug, "WebSocket connection", %{params: params})

    {:ok, socket}
  end

  @impl true
  def id(_socket), do: nil
end
