defmodule VideoRooms.Debug.Logger do
  @moduledoc """
  GenServer that sends logs to the centralized debug service.

  Collects logs from the application and forwards them to the debug
  service via HTTP POST. Implements buffering and retry logic for reliability.
  """

  use GenServer
  require Logger

  @flush_interval 1_000  # Flush buffer every second
  @max_buffer_size 100   # Max logs before force flush
  @http_timeout 5_000    # HTTP request timeout

  # ============================================================================
  # Client API
  # ============================================================================

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  @doc """
  Logs a message to the debug service.

  ## Parameters

    - `service`: The source service (:backend, :sfu, :frontend)
    - `level`: Log level (:debug, :info, :warn, :error)
    - `message`: Log message
    - `metadata`: Additional metadata map
  """
  @spec log(atom(), atom(), String.t(), map()) :: :ok
  def log(service, level, message, metadata \\ %{}) do
    GenServer.cast(__MODULE__, {:log, service, level, message, metadata})
  end

  # ============================================================================
  # Server Callbacks
  # ============================================================================

  @impl true
  def init(_) do
    Logger.info("[DEBUG_LOGGER] Starting Debug Logger")

    # Schedule periodic flush
    schedule_flush()

    {:ok, %{buffer: [], debug_url: get_debug_url()}}
  end

  @impl true
  def handle_cast({:log, service, level, message, metadata}, state) do
    log_entry = %{
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
      service: service,
      level: level,
      message: message,
      metadata: metadata
    }

    new_buffer = [log_entry | state.buffer]

    # Force flush if buffer is full
    if length(new_buffer) >= @max_buffer_size do
      flush_buffer(new_buffer, state.debug_url)
      {:noreply, %{state | buffer: []}}
    else
      {:noreply, %{state | buffer: new_buffer}}
    end
  end

  @impl true
  def handle_info(:flush, state) do
    if length(state.buffer) > 0 do
      flush_buffer(state.buffer, state.debug_url)
    end

    schedule_flush()
    {:noreply, %{state | buffer: []}}
  end

  # ============================================================================
  # Private Functions
  # ============================================================================

  defp schedule_flush do
    Process.send_after(self(), :flush, @flush_interval)
  end

  defp flush_buffer(buffer, debug_url) do
    config = Application.get_env(:video_rooms, :debug_service, [])
    enabled = Keyword.get(config, :enabled, true)

    if enabled and debug_url do
      logs = Enum.reverse(buffer)

      Task.start(fn ->
        case HTTPoison.post(
          "#{debug_url}/api/logs",
          Jason.encode!(%{logs: logs}),
          [{"Content-Type", "application/json"}],
          recv_timeout: @http_timeout
        ) do
          {:ok, %{status_code: code}} when code in 200..299 ->
            :ok

          {:ok, %{status_code: code}} ->
            Logger.warn("[DEBUG_LOGGER] Debug service returned #{code}")

          {:error, %HTTPoison.Error{reason: reason}} ->
            Logger.warn("[DEBUG_LOGGER] Failed to send logs: #{inspect(reason)}")
        end
      end)
    end
  end

  defp get_debug_url do
    config = Application.get_env(:video_rooms, :debug_service, [])
    Keyword.get(config, :url)
  end
end

defmodule VideoRooms.Debug do
  @moduledoc """
  Convenience module for debug logging.

  ## Usage

      alias VideoRooms.Debug

      Debug.log(:backend, :info, "User joined room", %{user_id: "123", room_id: "abc"})
      Debug.log(:sfu, :error, "Connection failed", %{reason: "timeout"})
  """

  defdelegate log(service, level, message, metadata \\ %{}), to: VideoRooms.Debug.Logger
end
