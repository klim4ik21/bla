defmodule VideoRoomsWeb.RoomChannel do
  @moduledoc """
  Phoenix Channel for room-specific events.

  Broadcasts:
  - participant_joined
  - participant_left
  - room_closed
  """

  use Phoenix.Channel
  require Logger
  alias VideoRooms.Debug

  @impl true
  def join("room:" <> room_id, payload, socket) do
    participant_name = Map.get(payload, "participant_name", "Anonymous")

    Logger.info("[ROOM_CHANNEL] #{participant_name} joining channel for room: #{room_id}",
      room_id: room_id
    )

    Debug.log(:backend, :info, "Channel: Participant joined room channel", %{
      room_id: room_id,
      participant_name: participant_name
    })

    # Subscribe to room events via PubSub
    Phoenix.PubSub.subscribe(VideoRooms.PubSub, "room:#{room_id}")

    socket = socket
      |> assign(:room_id, room_id)
      |> assign(:participant_name, participant_name)

    # Notify others
    broadcast_from(socket, "participant_joined", %{
      participant_name: participant_name,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    })

    {:ok, %{room_id: room_id}, socket}
  end

  @impl true
  def handle_in("speaking", %{"is_speaking" => is_speaking}, socket) do
    Logger.debug("[ROOM_CHANNEL] #{socket.assigns.participant_name} speaking: #{is_speaking}")

    broadcast_from(socket, "speaking_changed", %{
      participant_name: socket.assigns.participant_name,
      is_speaking: is_speaking
    })

    {:noreply, socket}
  end

  @impl true
  def handle_in("message", %{"text" => text}, socket) do
    Logger.debug("[ROOM_CHANNEL] Message from #{socket.assigns.participant_name}: #{text}")

    broadcast(socket, "new_message", %{
      participant_name: socket.assigns.participant_name,
      text: text,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    })

    {:noreply, socket}
  end

  @impl true
  def handle_info({:participant_joined, participant_id, participant_name}, socket) do
    push(socket, "participant_joined", %{
      participant_id: participant_id,
      participant_name: participant_name,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    })

    {:noreply, socket}
  end

  @impl true
  def handle_info({:participant_left, participant_id}, socket) do
    push(socket, "participant_left", %{
      participant_id: participant_id,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    })

    {:noreply, socket}
  end

  @impl true
  def terminate(reason, socket) do
    Logger.info("[ROOM_CHANNEL] #{socket.assigns.participant_name} left room #{socket.assigns.room_id}: #{inspect(reason)}")

    Debug.log(:backend, :info, "Channel: Participant left room channel", %{
      room_id: socket.assigns.room_id,
      participant_name: socket.assigns.participant_name,
      reason: inspect(reason)
    })

    broadcast_from(socket, "participant_left", %{
      participant_name: socket.assigns.participant_name,
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
    })

    :ok
  end
end
