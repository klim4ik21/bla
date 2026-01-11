defmodule DebugService.MixProject do
  use Mix.Project

  def project do
    [
      app: :debug_service,
      version: "0.1.0",
      elixir: "~> 1.14",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [
      mod: {DebugService.Application, []},
      extra_applications: [:logger]
    ]
  end

  defp deps do
    [
      {:plug_cowboy, "~> 2.6"},
      {:jason, "~> 1.4"},
      {:cors_plug, "~> 3.0"}
    ]
  end
end
