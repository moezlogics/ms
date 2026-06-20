module.exports = {
  apps: [
    {
      name: "mobilestore",
      // We run the Next.js CLI binary directly through node for PM2 cluster mode support
      script: "node_modules/next/dist/bin/next",
      args: "start",
      // 1 instance now that catalog pages are ISR-cached (foodiespakistan
      // runs a single fork at ~58MB). 2 cluster instances were only needed
      // to absorb force-dynamic burst load; with ISR + CF caching the
      // origin gets far fewer renders, so 1 instance is enough and frees
      // ~400MB. Bump back to 2 if you ever see request queueing under load.
      instances: 1,
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      // Delay before restarting a crashed application
      restart_delay: 5000,
      // Time to wait before force-killing a process during reload
      kill_timeout: 5000,
      // Time to wait for the app to start listening
      listen_timeout: 10000,
      env: {
        PORT: 3060,
        NODE_ENV: "production"
      },
      error_file: "./logs/storefront-error.log",
      out_file: "./logs/storefront-out.log",
      merge_logs: true,
      time: true
    }
  ]
};
