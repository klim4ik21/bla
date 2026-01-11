defmodule VideoRoomsWeb.FallbackController do
  @moduledoc """
  Fallback controller for handling errors and not found routes.
  """

  use VideoRoomsWeb, :controller
  require Logger

  def not_found(conn, _params) do
    Logger.debug("[FALLBACK] Route not found: #{conn.request_path}")

    conn
    |> put_status(:not_found)
    |> json(%{error: "Not found", path: conn.request_path})
  end
end
