defmodule VideoRoomsWeb.ErrorJSON do
  @moduledoc """
  Error JSON renderer for VideoRoomsWeb.
  """

  def render("404.json", _assigns) do
    %{errors: %{detail: "Not Found"}}
  end

  def render("500.json", _assigns) do
    %{errors: %{detail: "Internal Server Error"}}
  end

  # Default handler for any status
  def render(template, _assigns) do
    %{errors: %{detail: Phoenix.Controller.status_message_from_template(template)}}
  end
end
