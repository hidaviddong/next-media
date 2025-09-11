module.exports = {
  apps: [
    {
      name: "next-media-api",
      cwd: "./apps/api",
      script: "node",
      args: "dist/index.js",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
    {
      name: "next-media-worker",
      cwd: "./apps/worker",
      script: "node",
      args: "dist/worker.js",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
