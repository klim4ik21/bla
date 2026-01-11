defmodule VideoRoomsWeb.DebugChannel do
  @moduledoc """
  Phoenix Channel for debug log streaming.

  Allows frontend to subscribe to real-time logs from all services.
  """

  use Phoenix.Channel
  require Logger
  alias VideoRooms.Debug

  @impl true
  def join("debug:logs", _payload, socket) do
    Logger.info("[DEBUG_CHANNEL] Client subscribed to debug logs")
    Debug.log(:backend, :info, "Debug channel: Client subscribed", %{})

    # Subscribe to debug log broadcasts
    Phoenix.PubSub.subscribe(VideoRooms.PubSub, "debug:logs")

    {:ok, %{status: "subscribed"}, socket}
  end

  @impl true
  def handle_in("ping", _payload, socket) do
    {:reply, {:ok, %{pong: DateTime.utc_now() |> DateTime.to_iso8601()}}, socket}
  end

  @impl true
  def handle_info({:log, log_entry}, socket) do
    push(socket, "new_log", log_entry)
    {:noreply, socket}
  end

  @impl true
  def terminate(_reason, _socket) do
    Logger.debug("[DEBUG_CHANNEL] Client disconnected from debug logs")
    :ok
  end
end
