defmodule VideoRooms.SFU.Provider do
  @moduledoc """
  Behaviour for SFU (Selective Forwarding Unit) providers.

  This abstraction allows swapping out LiveKit for any other SFU implementation
  without changing the rest of the application code.

  ## Implementing a custom provider

      defmodule MyApp.SFU.CustomProvider do
        @behaviour VideoRooms.SFU.Provider

        @impl true
        def create_room(room_id, opts) do
          # Create room in your SFU
          {:ok, %{room_id: room_id, metadata: %{}}}
        end

        @impl true
        def delete_room(room_id) do
          # Delete room from your SFU
          :ok
        end

        @impl true
        def generate_token(room_id, participant_id, participant_name, opts) do
          # Generate access token for participant
          {:ok, "your_token_here"}
        end

        @impl true
        def get_room_info(room_id) do
          # Get room information
          {:ok, %{participants: [], metadata: %{}}}
        end

        @impl true
        def health_check() do
          # Check if SFU is healthy
          {:ok, %{status: :healthy, latency_ms: 10}}
        end
      end

  ## Configuration

      config :video_rooms, :sfu_provider, MyApp.SFU.CustomProvider
  """

  @type room_id :: String.t()
  @type participant_id :: String.t()
  @type participant_name :: String.t()
  @type token :: String.t()

  @type room_info :: %{
    room_id: room_id(),
    participants: list(participant_info()),
    metadata: map()
  }

  @type participant_info :: %{
    id: participant_id(),
    name: participant_name(),
    joined_at: DateTime.t()
  }

  @type create_opts :: [
    max_participants: pos_integer(),
    empty_timeout: pos_integer(),
    metadata: map()
  ]

  @type token_opts :: [
    can_publish: boolean(),
    can_subscribe: boolean(),
    can_publish_data: boolean(),
    ttl: pos_integer()
  ]

  @type health_status :: %{
    status: :healthy | :degraded | :unhealthy,
    latency_ms: non_neg_integer(),
    message: String.t() | nil
  }

  @doc """
  Creates a new room in the SFU.

  Returns `{:ok, room_info}` on success, `{:error, reason}` on failure.
  """
  @callback create_room(room_id(), create_opts()) ::
    {:ok, room_info()} | {:error, term()}

  @doc """
  Deletes a room from the SFU.

  Returns `:ok` on success, `{:error, reason}` on failure.
  """
  @callback delete_room(room_id()) :: :ok | {:error, term()}

  @doc """
  Generates an access token for a participant to join a room.

  The token should contain all necessary permissions and metadata
  for the participant to connect to the SFU.
  """
  @callback generate_token(room_id(), participant_id(), participant_name(), token_opts()) ::
    {:ok, token()} | {:error, term()}

  @doc """
  Gets current information about a room.

  Returns room metadata and list of current participants.
  """
  @callback get_room_info(room_id()) :: {:ok, room_info()} | {:error, term()}

  @doc """
  Performs a health check on the SFU service.

  Returns status and latency information.
  """
  @callback health_check() :: {:ok, health_status()} | {:error, term()}

  # Convenience function to get the configured provider
  @doc false
  def get_provider do
    Application.get_env(:video_rooms, :sfu_provider, VideoRooms.SFU.LiveKitProvider)
  end
end
