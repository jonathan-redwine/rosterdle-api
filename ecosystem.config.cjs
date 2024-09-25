module.exports = {
    apps: [
      {
        name: 'rosterdle-api',
        script: './index.js',
        watch: true,
        env: {
          PORT: 4000,
          NODE_ENV: 'development',
        },
        env_local: {
          PORT: 4000,
          NODE_ENV: 'development',
        },
        env_dev: {
          port: 4000,
          NODE_ENV: 'development',
        },
        env_production: {
          NODE_ENV: 'production',
          PORT: 3000,
        },
      },
    ],
  };