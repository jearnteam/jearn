module.exports = {
  apps: [
    {
      name: "jearn",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 4000",
      instances: "max",           // will use all your CPU cores (4)
      exec_mode: "cluster",       // important!
      env: {
        PORT: 4000
      }
    }
  ]
};
