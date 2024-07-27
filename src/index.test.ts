import {describe, expect, beforeEach, it } from '@jest/globals';
import { SecretsLoader } from "./index";
import * as dotenvx from "@dotenvx/dotenvx";
dotenvx.config({ path: __dirname+'/../env/development.env' });

const SECONDS = 1000; // as jest times things in milliseconds

function purgeEnvironmentVariables() {
  delete process.env.DB_PASSWORD;
  delete process.env.DB_HOSTNAME;
  delete process.env.DB_USERNAME;
  delete process.env.DB_PORT;
  delete process.env.FLOAT_NUMBER;
}

describe("Check failure cases for incorrect configuration of module", () => {

  it("Should fail as we have incorrectly provided required env file name", async () => {
    const secretLoader = new SecretsLoader(process.env.AZURE_KEY_VAULT, {
      envManifest: "non-existent-file.json"
    });
    await expect(secretLoader.configure())
      .rejects  
      .toThrow("Error: secrets loader unable to find required env manifest file");
  });

  it("Key vault name does not resolveable", async () => {
    const secretLoader = new SecretsLoader("non-existent-vault",{
      envManifest: "env/required-env.json"
    });
    await expect(secretLoader.configure())
      .rejects  
      .toThrow("getaddrinfo ENOTFOUND non-existent-vault.vault.azure.net");
  }, 10 * SECONDS);  
});

describe("Failure cases for required env and type validation", () => {
  
  it("Required env variables missing from .env file", async () => {
    purgeEnvironmentVariables();
    const secretLoader = new SecretsLoader(process.env.AZURE_KEY_VAULT, {
      envManifest: "env/required-env.json"
    });
    await expect(secretLoader.configure())
      .rejects  
      .toThrow("Missing reqired env vars");
  });

  it("Required env variable float type not convertable", async () => {
    purgeEnvironmentVariables();
    dotenvx.config({ path: __dirname+'/../env/test-case-1.env' });
    const secretLoader = new SecretsLoader(process.env.AZURE_KEY_VAULT, {
      envManifest: "env/required-env-test-case-1.json"
    });
    await expect(secretLoader.configure())
      .rejects  
      .toThrow("FLOAT_NUMBER value notafloat cannot be converted to a float");
  });

  it("Required env variable integer type not convertable", async () => {
    purgeEnvironmentVariables();
    dotenvx.config({ path: __dirname+'/../env/test-case-2.env' });
    const secretLoader = new SecretsLoader(process.env.AZURE_KEY_VAULT, {
      envManifest: "env/required-env-test-case-2.json"
    });
    await expect(secretLoader.configure())
      .rejects  
      .toThrow("DB_PORT value notainteger cannot be converted to a integer");
  });
});

describe("Success cases for correct configuration and provided env variables", () => {

  it("Correctly provided env vars and types", async () => {
    purgeEnvironmentVariables();
    dotenvx.config({ path: __dirname+'/../env/development.env' });
    const secretLoader = new SecretsLoader(process.env.AZURE_KEY_VAULT, {
      envManifest: "env/required-env.json"
    });
    await expect(secretLoader.configure()).resolves;
  },  10 * SECONDS);
});
