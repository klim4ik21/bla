defmodule VideoRooms.SFU.LiveKitProvider do
  @moduledoc """
  LiveKit implementation of the SFU Provider behaviour.

  Handles all communication with LiveKit server including:
  - Room creation/deletion
  - Token generation (JWT-based)
  - Health checks

  ## Configuration

      config :video_rooms, :livekit,
        api_key: "your_api_key",
        api_secret: "your_api_secret",
        url: "ws://localhost:7880",
        public_url: "ws://your-domain:7880"
  """

  @behaviour VideoRooms.SFU.Provider

  require Logger
  alias VideoRooms.Debug

  # Token validity in seconds (24 hours)
  @default_ttl 86_400

  # ============================================================================
  # Provider Callbacks
  # ============================================================================

  @impl true
  def create_room(room_id, opts \\ []) do
    Logger.info("[LIVEKIT] Creating room: #{room_id}", room_id: room_id)
    Debug.log(:sfu, :info, "Creating room", %{room_id: room_id, opts: opts})

    # LiveKit auto-creates rooms when first participant joins
    # We just validate and prepare room metadata
    room_info = %{
      room_id: room_id,
      participants: [],
      metadata: %{
        created_at: DateTime.utc_now(),
        max_participants: Keyword.get(opts, :max_participants, 10),
        empty_timeout: Keyword.get(opts, :empty_timeout, 300)
      }
    }

    Logger.debug("[LIVEKIT] Room created: #{inspect(room_info)}", room_id: room_id)
    Debug.log(:sfu, :debug, "Room created successfully", room_info)

    {:ok, room_info}
  end

  @impl true
  def delete_room(room_id) do
    Logger.info("[LIVEKIT] Deleting room: #{room_id}", room_id: room_id)
    Debug.log(:sfu, :info, "Deleting room", %{room_id: room_id})

    # In production, you would call LiveKit's DeleteRoom API
    # POST /twirp/livekit.RoomService/DeleteRoom
    # For now, rooms auto-delete when empty (configured in livekit.yaml)

    :ok
  end

  @impl true
  def generate_token(room_id, participant_id, participant_name, opts \\ []) do
    Logger.info("[LIVEKIT] Generating token for #{participant_name} in room #{room_id}",
      room_id: room_id,
      participant_id: participant_id
    )

    Debug.log(:sfu, :info, "Generating token", %{
      room_id: room_id,
      participant_id: participant_id,
      participant_name: participant_name
    })

    start_time = System.monotonic_time(:millisecond)

    config = get_config()
    api_key = Keyword.fetch!(config, :api_key)
    api_secret = Keyword.fetch!(config, :api_secret)

    # Build JWT claims for LiveKit
    now = DateTime.utc_now() |> DateTime.to_unix()
    ttl = Keyword.get(opts, :ttl, @default_ttl)

    claims = %{
      # Standard JWT claims
      "iss" => api_key,
      "sub" => participant_id,
      "iat" => now,
      "nbf" => now,
      "exp" => now + ttl,
      # LiveKit-specific claims
      "video" => build_video_grants(room_id, participant_name, opts),
      "metadata" => Jason.encode!(%{
        participant_id: participant_id,
        participant_name: participant_name,
        joined_at: DateTime.utc_now() |> DateTime.to_iso8601()
      })
    }

    # Sign with HMAC SHA256
    signer = JOSE.JWS.from_map(%{"alg" => "HS256", "typ" => "JWT"})
    jwk = JOSE.JWK.from_oct(api_secret)

    {_, token} = JOSE.JWT.sign(jwk, signer, claims) |> JOSE.JWS.compact()

    duration = System.monotonic_time(:millisecond) - start_time

    Logger.debug("[LIVEKIT] Token generated in #{duration}ms",
      room_id: room_id,
      participant_id: participant_id,
      duration_ms: duration
    )

    Debug.log(:sfu, :debug, "Token generated", %{
      room_id: room_id,
      participant_id: participant_id,
      duration_ms: duration,
      ttl: ttl
    })

    # Emit telemetry
    :telemetry.execute(
      [:video_rooms, :token, :generation],
      %{duration: duration},
      %{room_id: room_id}
    )

    {:ok, token}
  rescue
    e ->
      Logger.error("[LIVEKIT] Token generation failed: #{inspect(e)}")
      Debug.log(:sfu, :error, "Token generation failed", %{error: inspect(e)})
      {:error, {:token_generation_failed, e}}
  end

  @impl true
  def get_room_info(room_id) do
    Logger.debug("[LIVEKIT] Getting room info: #{room_id}", room_id: room_id)

    # In a full implementation, this would call LiveKit's ListParticipants API
    # POST /twirp/livekit.RoomService/ListParticipants
    # For simplicity, we return basic info

    {:ok, %{
      room_id: room_id,
      participants: [],
      metadata: %{}
    }}
  end

  @impl true
  def health_check do
    Logger.debug("[LIVEKIT] Performing health check")
    Debug.log(:sfu, :debug, "Performing health check", %{})

    config = get_config()
    url = Keyword.get(config, :url, "ws://localhost:7880")

    # Convert ws:// to http:// for health check
    http_url = url
      |> String.replace("ws://", "http://")
      |> String.replace("wss://", "https://")

    start_time = System.monotonic_time(:millisecond)

    case HTTPoison.get(http_url, [], recv_timeout: 5000) do
      {:ok, %{status_code: code}} when code in 200..299 ->
        latency = System.monotonic_time(:millisecond) - start_time

        status = %{
          status: :healthy,
          latency_ms: latency,
          message: "LiveKit server responding"
        }

        Debug.log(:sfu, :info, "Health check passed", status)
        {:ok, status}

      {:ok, %{status_code: code}} ->
        latency = System.monotonic_time(:millisecond) - start_time

        status = %{
          status: :degraded,
          latency_ms: latency,
          message: "LiveKit returned status #{code}"
        }

        Debug.log(:sfu, :warn, "Health check degraded", status)
        {:ok, status}

      {:error, %HTTPoison.Error{reason: reason}} ->
        status = %{
          status: :unhealthy,
          latency_ms: 0,
          message: "LiveKit unreachable: #{inspect(reason)}"
        }

        Debug.log(:sfu, :error, "Health check failed", status)
        {:ok, status}
    end
  end

  # ============================================================================
  # Private Functions
  # ============================================================================

  defp build_video_grants(room_id, participant_name, opts) do
    %{
      "roomJoin" => true,
      "room" => room_id,
      "canPublish" => Keyword.get(opts, :can_publish, true),
      "canSubscribe" => Keyword.get(opts, :can_subscribe, true),
      "canPublishData" => Keyword.get(opts, :can_publish_data, true),
      "canUpdateOwnMetadata" => true
    }
  end

  defp get_config do
    Application.get_env(:video_rooms, :livekit, [])
  end

  @doc """
  Returns the public LiveKit URL for clients to connect to.
  """
  def get_public_url do
    config = get_config()
    Keyword.get(config, :public_url, "ws://localhost:7880")
  end
end
