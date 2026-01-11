import Config

config :debug_service,
  port: String.to_integer(System.get_env("PORT") || "5000"),
  max_logs: 10_000

config :logger, :console,
  format: "[$level] $time $message\n",
  metadata: [:request_id]

config :logger, level: :debug
