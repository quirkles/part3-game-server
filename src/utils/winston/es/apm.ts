// eslint-disable-next-line @typescript-eslint/no-require-imports
export const apmClient = require("elastic-apm-node").start({
  serverUrl: process.env.ELASTIC_APM_SERVER_URL,
  secretToken: process.env.ELASTIC_APM_SECRET_TOKEN,
  serviceName: process.env.ELASTIC_APM_SERVICE_NAME,
  serviceVersion: "1.0.0",
  environment: "development",
  metricsInterval: "0s",
  logLevel: "info", // avoid APM agent log preamble
});
