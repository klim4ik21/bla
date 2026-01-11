defmodule VideoRooms.MixProject do
  use Mix.Project

  def project do
    [
      app: :video_rooms,
      version: "0.1.0",
      elixir: "~> 1.14",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps()
    ]
  end

  def application do
    [
      mod: {VideoRooms.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  defp deps do
    [
      {:phoenix, "~> 1.7.10"},
      {:phoenix_live_view, "~> 0.20.1"},
      {:phoenix_html, "~> 3.3"},
      {:plug_cowboy, "~> 2.6"},
      {:jason, "~> 1.4"},
      {:cors_plug, "~> 3.0"},
      {:jose, "~> 1.11"},
      {:uuid, "~> 1.1"},
      {:httpoison, "~> 2.2"},
      {:telemetry, "~> 1.2"},
      {:telemetry_metrics, "~> 0.6"},
      {:telemetry_poller, "~> 1.0"}
    ]
  end

  defp aliases do
    [
      setup: ["deps.get"]
    ]
  end
end
