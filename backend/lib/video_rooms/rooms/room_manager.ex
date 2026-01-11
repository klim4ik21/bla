defmodule VideoRooms.Rooms.RoomManager do
  @moduledoc """
  GenServer managing video rooms.

  Responsibilities:
  - Track active rooms in memory
  - Coordinate with SFU provider for room operations
  - Handle room lifecycle (creation, joining, leaving)
  - Emit telemetry events

  ## Architecture

  This module acts as a coordinator between the HTTP API and the SFU provider.
  It maintains local state for quick lookups while delegating actual media
  operations to the configured SFU provider.
  """

  use GenServer
  require Logger
  alias VideoRooms.SFU.Provider
  alias VideoRooms.Debug

  @type room :: %{
    id: String.t(),
    created_at: DateTime.t(),
    participants: map(),
    metadata: map()
  }

  @type participant :: %{
    id: String.t(),
    name: String.t(),
    joined_at: DateTime.t()
  }

  # ============================================================================
  # Client API
  # ============================================================================

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  @doc """
  Creates a new room and generates a token for the first participant.

  Returns `{:ok, %{room_id: ..., token: ..., livekit_url: ...}}` on success.
  """
  @spec create_room(String.t()) :: {:ok, map()} | {:error, term()}
  def create_room(participant_name) do
    GenServer.call(__MODULE__, {:create_room, participant_name})
  end

  @doc """
  Joins an existing room and generates a token for the participant.

  Returns `{:ok, %{token: ..., livekit_url: ...}}` on success.
  """
  @spec join_room(String.t(), String.t()) :: {:ok, map()} | {:error, term()}
  def join_room(room_id, participant_name) do
    GenServer.call(__MODULE__, {:join_room, room_id, participant_name})
  end

  @doc """
  Removes a participant from a room.
  """
  @spec leave_room(String.t(), String.t()) :: :ok | {:error, term()}
  def leave_room(room_id, participant_id) do
    GenServer.call(__MODULE__, {:leave_room, room_id, participant_id})
  end

  @doc """
  Gets information about a room.
  """
  @spec get_room(String.t()) :: {:ok, room()} | {:error, :not_found}
  def get_room(room_id) do
    GenServer.call(__MODULE__, {:get_room, room_id})
  end

  @doc """
  Lists all active rooms.
  """
  @spec list_rooms() :: [room()]
  def list_rooms do
    GenServer.call(__MODULE__, :list_rooms)
  end

  @doc """
  Telemetry measurement callback - returns count of active rooms.
  """
  def measure_active_rooms do
    count = GenServer.call(__MODULE__, :count_rooms)
    :telemetry.execute([:video_rooms, :rooms], %{active: count}, %{})
  end

  # ============================================================================
  # Server Callbacks
  # ============================================================================

  @impl true
  def init(_) do
    Logger.info("[ROOM_MANAGER] Starting Room Manager")
    Debug.log(:backend, :info, "Room Manager started", %{})

    # Rooms stored as: %{room_id => room_data}
    {:ok, %{rooms: %{}}}
  end

  @impl true
  def handle_call({:create_room, participant_name}, _from, state) do
    room_id = generate_room_id()
    participant_id = generate_participant_id()

    Logger.info("[ROOM_MANAGER] Creating room #{room_id} for #{participant_name}",
      room_id: room_id,
      participant_id: participant_id
    )

    Debug.log(:backend, :info, "Creating room", %{
      room_id: room_id,
      participant_name: participant_name,
      participant_id: participant_id
    })

    provider = Provider.get_provider()

    with {:ok, _room_info} <- provider.create_room(room_id, []),
         {:ok, token} <- provider.generate_token(room_id, participant_id, participant_name, []) do

      now = DateTime.utc_now()

      room = %{
        id: room_id,
        created_at: now,
        participants: %{
          participant_id => %{
            id: participant_id,
            name: participant_name,
            joined_at: now
          }
        },
        metadata: %{}
      }

      new_state = put_in(state, [:rooms, room_id], room)

      # Emit telemetry
      :telemetry.execute([:video_rooms, :room, :created], %{count: 1}, %{room_id: room_id})

      # Broadcast room created event
      Phoenix.PubSub.broadcast(
        VideoRooms.PubSub,
        "rooms",
        {:room_created, room_id, participant_name}
      )

      Logger.info("[ROOM_MANAGER] ✓ Room #{room_id} created successfully", room_id: room_id)
      Debug.log(:backend, :info, "Room created successfully", %{room_id: room_id})

      response = %{
        room_id: room_id,
        participant_id: participant_id,
        token: token,
        livekit_url: VideoRooms.SFU.LiveKitProvider.get_public_url()
      }

      {:reply, {:ok, response}, new_state}
    else
      {:error, reason} = error ->
        Logger.error("[ROOM_MANAGER] ✗ Failed to create room: #{inspect(reason)}")
        Debug.log(:backend, :error, "Failed to create room", %{error: inspect(reason)})
        {:reply, error, state}
    end
  end

  @impl true
  def handle_call({:join_room, room_id, participant_name}, _from, state) do
    participant_id = generate_participant_id()

    Logger.info("[ROOM_MANAGER] #{participant_name} joining room #{room_id}",
      room_id: room_id,
      participant_id: participant_id
    )

    Debug.log(:backend, :info, "Participant joining room", %{
      room_id: room_id,
      participant_name: participant_name,
      participant_id: participant_id
    })

    case Map.get(state.rooms, room_id) do
      nil ->
        # Room doesn't exist locally, but might exist in LiveKit
        # Let's create it anyway (LiveKit auto-creates rooms)
        Logger.warn("[ROOM_MANAGER] Room #{room_id} not found locally, creating...", room_id: room_id)

        provider = Provider.get_provider()

        with {:ok, token} <- provider.generate_token(room_id, participant_id, participant_name, []) do
          now = DateTime.utc_now()

          room = %{
            id: room_id,
            created_at: now,
            participants: %{
              participant_id => %{
                id: participant_id,
                name: participant_name,
                joined_at: now
              }
            },
            metadata: %{}
          }

          new_state = put_in(state, [:rooms, room_id], room)

          :telemetry.execute([:video_rooms, :room, :joined], %{count: 1}, %{room_id: room_id})

          response = %{
            participant_id: participant_id,
            token: token,
            livekit_url: VideoRooms.SFU.LiveKitProvider.get_public_url()
          }

          {:reply, {:ok, response}, new_state}
        else
          error ->
            {:reply, error, state}
        end

      room ->
        provider = Provider.get_provider()

        case provider.generate_token(room_id, participant_id, participant_name, []) do
          {:ok, token} ->
            now = DateTime.utc_now()

            participant = %{
              id: participant_id,
              name: participant_name,
              joined_at: now
            }

            new_state = put_in(state, [:rooms, room_id, :participants, participant_id], participant)

            :telemetry.execute([:video_rooms, :room, :joined], %{count: 1}, %{room_id: room_id})

            # Broadcast participant joined
            Phoenix.PubSub.broadcast(
              VideoRooms.PubSub,
              "room:#{room_id}",
              {:participant_joined, participant_id, participant_name}
            )

            Logger.info("[ROOM_MANAGER] ✓ #{participant_name} joined room #{room_id}",
              room_id: room_id,
              participant_id: participant_id
            )

            Debug.log(:backend, :info, "Participant joined room", %{
              room_id: room_id,
              participant_name: participant_name,
              participant_count: map_size(new_state.rooms[room_id].participants)
            })

            response = %{
              participant_id: participant_id,
              token: token,
              livekit_url: VideoRooms.SFU.LiveKitProvider.get_public_url()
            }

            {:reply, {:ok, response}, new_state}

          {:error, _} = error ->
            {:reply, error, state}
        end
    end
  end

  @impl true
  def handle_call({:leave_room, room_id, participant_id}, _from, state) do
    Logger.info("[ROOM_MANAGER] Participant #{participant_id} leaving room #{room_id}",
      room_id: room_id,
      participant_id: participant_id
    )

    Debug.log(:backend, :info, "Participant leaving room", %{
      room_id: room_id,
      participant_id: participant_id
    })

    case get_in(state, [:rooms, room_id]) do
      nil ->
        {:reply, {:error, :room_not_found}, state}

      room ->
        new_participants = Map.delete(room.participants, participant_id)

        new_state =
          if map_size(new_participants) == 0 do
            # Last participant left, remove room
            Logger.info("[ROOM_MANAGER] Room #{room_id} is empty, removing", room_id: room_id)
            Debug.log(:backend, :info, "Room empty, removing", %{room_id: room_id})

            update_in(state, [:rooms], &Map.delete(&1, room_id))
          else
            put_in(state, [:rooms, room_id, :participants], new_participants)
          end

        :telemetry.execute([:video_rooms, :room, :left], %{count: 1}, %{room_id: room_id})

        # Broadcast participant left
        Phoenix.PubSub.broadcast(
          VideoRooms.PubSub,
          "room:#{room_id}",
          {:participant_left, participant_id}
        )

        {:reply, :ok, new_state}
    end
  end

  @impl true
  def handle_call({:get_room, room_id}, _from, state) do
    case Map.get(state.rooms, room_id) do
      nil -> {:reply, {:error, :not_found}, state}
      room -> {:reply, {:ok, room}, state}
    end
  end

  @impl true
  def handle_call(:list_rooms, _from, state) do
    rooms = Map.values(state.rooms)
    {:reply, rooms, state}
  end

  @impl true
  def handle_call(:count_rooms, _from, state) do
    {:reply, map_size(state.rooms), state}
  end

  # ============================================================================
  # Private Functions
  # ============================================================================

  defp generate_room_id do
    UUID.uuid4() |> String.split("-") |> List.first()
  end

  defp generate_participant_id do
    UUID.uuid4()
  end
end
