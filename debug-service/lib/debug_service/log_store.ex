defmodule DebugService.LogStore do
  @moduledoc """
  In-memory log storage with circular buffer.

  Stores logs from all services and provides retrieval with filtering.
  """

  use GenServer
  require Logger

  @max_logs 10_000

  # ============================================================================
  # Client API
  # ============================================================================

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  @doc """
  Adds logs to the store.
  """
  def add_logs(logs) when is_list(logs) do
    GenServer.cast(__MODULE__, {:add_logs, logs})
  end

  @doc """
  Gets logs with optional filtering.

  Options:
    - :limit - max number of logs to return (default: 100)
    - :level - filter by log level
    - :service - filter by service name
    - :since - filter logs after this timestamp
  """
  def get_logs(opts \\ []) do
    GenServer.call(__MODULE__, {:get_logs, opts})
  end

  @doc """
  Clears all logs.
  """
  def clear do
    GenServer.cast(__MODULE__, :clear)
  end

  @doc """
  Gets statistics about stored logs.
  """
  def stats do
    GenServer.call(__MODULE__, :stats)
  end

  # ============================================================================
  # Server Callbacks
  # ============================================================================

  @impl true
  def init(_) do
    Logger.info("[LOG_STORE] Log store initialized")
    {:ok, %{logs: [], count: 0}}
  end

  @impl true
  def handle_cast({:add_logs, new_logs}, state) do
    # Add timestamps if missing
    timestamped_logs = Enum.map(new_logs, fn log ->
      Map.put_new(log, "timestamp", DateTime.utc_now() |> DateTime.to_iso8601())
    end)

    # Add to beginning (newest first internally)
    all_logs = timestamped_logs ++ state.logs

    # Trim to max size
    trimmed_logs = Enum.take(all_logs, @max_logs)

    new_count = state.count + length(new_logs)

    Logger.debug("[LOG_STORE] Added #{length(new_logs)} logs, total: #{length(trimmed_logs)}")

    {:noreply, %{state | logs: trimmed_logs, count: new_count}}
  end

  @impl true
  def handle_cast(:clear, state) do
    Logger.info("[LOG_STORE] Logs cleared")
    {:noreply, %{state | logs: []}}
  end

  @impl true
  def handle_call({:get_logs, opts}, _from, state) do
    limit = Keyword.get(opts, :limit, 100)
    level = Keyword.get(opts, :level)
    service = Keyword.get(opts, :service)
    since = Keyword.get(opts, :since)

    filtered_logs = state.logs
      |> filter_by_level(level)
      |> filter_by_service(service)
      |> filter_by_since(since)
      |> Enum.take(limit)
      |> Enum.reverse()  # Return oldest first

    {:reply, filtered_logs, state}
  end

  @impl true
  def handle_call(:stats, _from, state) do
    stats = %{
      total_stored: length(state.logs),
      total_received: state.count,
      max_capacity: @max_logs,
      by_level: count_by_field(state.logs, "level"),
      by_service: count_by_field(state.logs, "service")
    }

    {:reply, stats, state}
  end

  # ============================================================================
  # Private Functions
  # ============================================================================

  defp filter_by_level(logs, nil), do: logs
  defp filter_by_level(logs, level) do
    Enum.filter(logs, fn log -> log["level"] == level end)
  end

  defp filter_by_service(logs, nil), do: logs
  defp filter_by_service(logs, service) do
    Enum.filter(logs, fn log -> log["service"] == service end)
  end

  defp filter_by_since(logs, nil), do: logs
  defp filter_by_since(logs, since) do
    Enum.filter(logs, fn log ->
      case DateTime.from_iso8601(log["timestamp"] || "") do
        {:ok, timestamp, _} -> DateTime.compare(timestamp, since) == :gt
        _ -> true
      end
    end)
  end

  defp count_by_field(logs, field) do
    logs
    |> Enum.group_by(&Map.get(&1, field, "unknown"))
    |> Enum.map(fn {key, items} -> {key, length(items)} end)
    |> Enum.into(%{})
  end
end
