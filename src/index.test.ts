import {describe, expect, beforeEach, it } from '@jest/globals';
import { SecretsLoader } from "./index";

let secretLoader: SecretsLoader;

beforeEach(() => {
  secretLoader = new SecretsLoader("kv-shared-dev-southeast");
});

describe("Check missing / incorrectly named required env file throws correct error", () => {

  it("Should fail as we have incorrectly provided required env file name", async () => {
    await expect(secretLoader.configure())
      .rejects  
      .toThrow("Error: secrets loader unable to find required env manifest file");
  });
});

// describe("Check required variables are validated correctly", async () => {
//   await secretLoader.configure();
// });
