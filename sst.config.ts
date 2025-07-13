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
      handler: "./cron/scraper/main.go",
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
    const candleMakerLambda = new sst.aws.Function("MakeCandles", {
      runtime: "go",
      handler: "./cron/candle-maker/main.go",
      timeout: "15 seconds",
      architecture: "arm64",
      memory: "128 MB",
      environment: {
        DB_URL: process.env.DB_URL,
      },
    });
    new sst.aws.Cron("MakeCandlesCron", {
      function: candleMakerLambda.arn,
      schedule: "cron(1/5 * * * ? *)", // Runs at minute 1, 6, 11, 16, etc.
    });
    const liveStatsWriterLambda = new sst.aws.Function("LiveStatsWriter", {
      runtime: "go",
      handler: "./cron/live-stats-writer/main.go",
      timeout: "30 seconds",
      architecture: "arm64",
      memory: "128 MB",
      environment: {
        DB_URL: process.env.DB_URL,
        BCONOMY_API_KEY: process.env.BCONOMY_API_KEY,
      },
    });
    new sst.aws.Cron("LiveStatsWriterCron0", {
      function: liveStatsWriterLambda.arn,
      schedule: "cron(2,32 * * * ? *)", // Runs twice an hour
      event: {
        batchNumber: "0",
      },
    });
    new sst.aws.Cron("LiveStatsWriterCron1", {
      function: liveStatsWriterLambda.arn,
      schedule: "cron(4,34 * * * ? *)", // Runs twice an hour
      event: {
        batchNumber: "1",
      },
    });
    new sst.aws.Nextjs("BconomyMarketTracker", {
      environment: {
        DB_URL: process.env.DB_URL,
      },
    });
  },
});
