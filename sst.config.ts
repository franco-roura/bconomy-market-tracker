/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "bconomy-market-tracker",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          region: "us-west-1",
        },
      },
    };
  },
  async run() {
    if (!process.env.DB_URL) {
      const error = new Error("DB_URL is not set");
      console.error(error);
      throw error;
    }
    if (!process.env.BCONOMY_API_KEY) {
      const error = new Error("BCONOMY_API_KEY is not set");
      console.error(error);
      throw error;
    }
    const scraperLambda = new sst.aws.Function("ScrapeMarketValues", {
      runtime: "go",
      handler: "./cron/main",
      timeout: "5 seconds",
      architecture: "arm64",
      memory: "128 MB",
      environment: {
        DB_URL: process.env.DB_URL,
        BCONOMY_API_KEY: process.env.BCONOMY_API_KEY,
      },
    });
    new sst.aws.Cron("ScrapeMarketValuesCron", {
      function: scraperLambda.arn,
      schedule: "rate(5 minutes)",
    });
    new sst.aws.Nextjs("BconomyMarketTracker", {
      environment: {
        DB_URL: process.env.DB_URL,
      },
    });
  },
});
