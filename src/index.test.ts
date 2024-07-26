import { describe, beforeEach } from "node:test";
import { SecretsLoader } from "src";

let secretLoader: SecretsLoader;

beforeEach(() => {
  secretLoader = new SecretsLoader("kv-shared-dev-southeast");
});

describe("Check required variables are validated correctly", async () => {
  await secretLoader.configure();
});
