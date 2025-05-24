import fs from "fs";
import { join } from "path";
import readline from "readline";

import { z } from "zod";

const configPath = join(__dirname, "../../.env");

const configSchema = z.object({
  JWT_SECRET: z.string(),
  PORT: z.string().transform(Number),
  ENV: z.enum(["LOCAL", "CLOUD"]),
});

export type Config = z.infer<typeof configSchema>;

let env: Config | null = null;

export async function getConfig(): Promise<Config> {
  if (env) {
    return env;
  }
  const config: Record<string, string> = {};

  const fileStream = fs.createReadStream(configPath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  // Note: we use the crlfDelay option to recognize all instances of CR LF
  // ('\r\n') in input.txt as a single line break.

  for await (const line of rl) {
    // Each line in input.txt will be successively available here as `line`.
    const { groups } =
      /^(?<name>[A-Z_]+)=(?<value>.*$)/.exec(line.trim()) ?? {};
    if (!groups) {
      continue;
    }
    config[groups.name] = groups.value.replace(/\\n/g, "\n");
  }

  env = configSchema.parse(config);

  return env;
}
