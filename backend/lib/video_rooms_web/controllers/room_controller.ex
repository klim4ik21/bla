defmodule VideoRoomsWeb.RoomController do
  @moduledoc """
  Controller for room management operations.

  Handles:
  - Creating rooms
  - Joining rooms
  - Listing rooms
  - Leaving rooms
  """

  use VideoRoomsWeb, :controller
  require Logger
  alias VideoRooms.Rooms.RoomManager
  alias VideoRooms.Debug

  @doc """
  POST /api/rooms

  Creates a new room and returns connection details.

  ## Request Body

      {
        "participant_name": "John Doe"
      }

  ## Response

      {
        "room_id": "abc123",
        "participant_id": "uuid",
        "token": "jwt_token",
        "livekit_url": "ws://localhost:7880"
      }
  """
  def create(conn, params) do
    participant_name = Map.get(params, "participant_name", "Anonymous")

    Logger.info("[ROOM_CTRL] Creating room for: #{participant_name}")
    Debug.log(:backend, :info, "API: Create room request", %{participant_name: participant_name})

    case RoomManager.create_room(participant_name) do
      {:ok, result} ->
        Logger.info("[ROOM_CTRL] ✓ Room created: #{result.room_id}")
        Debug.log(:backend, :info, "API: Room created", %{
          room_id: result.room_id,
          participant_name: participant_name
        })

        conn
        |> put_status(:created)
        |> json(%{
          room_id: result.room_id,
          participant_id: result.participant_id,
          token: result.token,
          livekit_url: result.livekit_url
        })

      {:error, reason} ->
        Logger.error("[ROOM_CTRL] ✗ Failed to create room: #{inspect(reason)}")
        Debug.log(:backend, :error, "API: Failed to create room", %{error: inspect(reason)})

        conn
        |> put_status(:internal_server_error)
        |> json(%{error: "Failed to create room", details: inspect(reason)})
    end
  end

  @doc """
  GET /api/rooms

  Lists all active rooms.
  """
  def index(conn, _params) do
    Logger.debug("[ROOM_CTRL] Listing rooms")

    rooms = RoomManager.list_rooms()

    room_data = Enum.map(rooms, fn room ->
      %{
        id: room.id,
        created_at: room.created_at,
        participant_count: map_size(room.participants),
        participants: Enum.map(room.participants, fn {_id, p} ->
          %{id: p.id, name: p.name, joined_at: p.joined_at}
        end)
      }
    end)

    json(conn, %{rooms: room_data, count: length(room_data)})
  end

  @doc """
  GET /api/rooms/:id

  Gets details about a specific room.
  """
  def show(conn, %{"id" => room_id}) do
    Logger.debug("[ROOM_CTRL] Getting room: #{room_id}", room_id: room_id)

    case RoomManager.get_room(room_id) do
      {:ok, room} ->
        json(conn, %{
          room: %{
            id: room.id,
            created_at: room.created_at,
            participant_count: map_size(room.participants),
            participants: Enum.map(room.participants, fn {_id, p} ->
              %{id: p.id, name: p.name, joined_at: p.joined_at}
            end)
          }
        })

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Room not found"})
    end
  end

  @doc """
  POST /api/rooms/:id/join

  Joins an existing room.

  ## Request Body

      {
        "participant_name": "Jane Doe"
      }

  ## Response

      {
        "participant_id": "uuid",
        "token": "jwt_token",
        "livekit_url": "ws://localhost:7880"
      }
  """
  def join(conn, %{"id" => room_id} = params) do
    participant_name = Map.get(params, "participant_name", "Anonymous")

    Logger.info("[ROOM_CTRL] #{participant_name} joining room: #{room_id}",
      room_id: room_id
    )

    Debug.log(:backend, :info, "API: Join room request", %{
      room_id: room_id,
      participant_name: participant_name
    })

    case RoomManager.join_room(room_id, participant_name) do
      {:ok, result} ->
        Logger.info("[ROOM_CTRL] ✓ #{participant_name} joined room #{room_id}")
        Debug.log(:backend, :info, "API: Participant joined", %{
          room_id: room_id,
          participant_name: participant_name,
          participant_id: result.participant_id
        })

        conn
        |> put_status(:ok)
        |> json(%{
          participant_id: result.participant_id,
          token: result.token,
          livekit_url: result.livekit_url
        })

      {:error, reason} ->
        Logger.error("[ROOM_CTRL] ✗ Failed to join room: #{inspect(reason)}")
        Debug.log(:backend, :error, "API: Failed to join room", %{
          room_id: room_id,
          error: inspect(reason)
        })

        conn
        |> put_status(:internal_server_error)
        |> json(%{error: "Failed to join room", details: inspect(reason)})
    end
  end

  @doc """
  DELETE /api/rooms/:id/leave

  Leaves a room.

  ## Query Parameters

      participant_id: The ID of the participant leaving
  """
  def leave(conn, %{"id" => room_id} = params) do
    participant_id = Map.get(params, "participant_id")

    Logger.info("[ROOM_CTRL] Participant #{participant_id} leaving room: #{room_id}",
      room_id: room_id,
      participant_id: participant_id
    )

    Debug.log(:backend, :info, "API: Leave room request", %{
      room_id: room_id,
      participant_id: participant_id
    })

    case RoomManager.leave_room(room_id, participant_id) do
      :ok ->
        Logger.info("[ROOM_CTRL] ✓ Participant left room #{room_id}")
        json(conn, %{success: true})

      {:error, reason} ->
        Logger.error("[ROOM_CTRL] ✗ Failed to leave room: #{inspect(reason)}")

        conn
        |> put_status(:internal_server_error)
        |> json(%{error: "Failed to leave room", details: inspect(reason)})
    end
  end
end
