import 'dotenv/config';
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import * as fs from "fs";

type moduleOptions = {
  envManifest: string;
  secretStore: string;
  exitOnMissing: boolean;
};

type applicationVariable = {
  localKey: string;
  keyVaultKey: string;
  value: any;
  dataType: string;
};

// Steps
// 1) load and env variables from .env file as normal
// 2) load required-env file into mem
// 3) iterate required envs, transform - into _ for purposes of matching
// if value = FROM_SECRET load from secret store
// 
// working

/**
 * Takes our required env json object and validates that each required env var has already been 
 * provided through process.env as expected. Any missing required env var keys are stored in a list
 * and returned as well
 * @param requiredEnvManifest our loaded json object taken straight from the required-env.json file
 * @returns list of objects representing the env variables our application needs and a possible list
 * of missing env variable keys
 */
function createEnvironmentVariableList(requiredEnvManifest: any) {
  const appVariables: applicationVariable[] = [];
  const missingVariables: string[] = [];
  for (const [key, value] of Object.entries(requiredEnvManifest)) {
    // validate that each required env is already loaded into process.env first
    if (!process.env.hasOwnProperty(key)) {
      console.log(`[ERR] missing required env var ${key}`)
      missingVariables.push(key);
    }
    const newVar: applicationVariable = {
      localKey: key,
      keyVaultKey: key.replace("_", "-"), //azure key vault only allows - instead of _
      value: process.env[key],
      dataType: String(value)
    }
    appVariables.push(newVar);
  }
  return {
    envVariableList: appVariables,
    missingVariables: missingVariables
  }
}

async function loadSecretsFromStore(client: SecretClient, variableList: applicationVariable[]): Promise<void> {
  for (let item of variableList) {
    if (item.value === "FROM_SECRET") {
      const secret = await client.getSecret(item.keyVaultKey);
      item.value = secret.value;
    }
  }
}

async function loadIntoProcessEnv(variableList: applicationVariable[]) {
  for (let item of variableList) {
    process.env[item.localKey] = item.value;
    console.log(`[INFO] loaded variable ${item.localKey} with value ${item.value}`)
  }
}

function typeCheckVariables(variableList: applicationVariable[]): void {
  for (let item of variableList) {
    const requiredDataType = item.dataType;

    if (typeof requiredDataType !== requiredDataType) {
      console.log(`[ERR] '${item.localKey}' variable required datatype '${requiredDataType}' does not match '${typeof requiredDataType}'`)
    }
  }
} 

async function main(vaultName: string, moduleOptions: moduleOptions = {
  envManifest: "required-env.json",
  secretStore: "Azure",
  exitOnMissing: true
}) {
  // Build the URL to reach your key vault
  const vaultClient = new SecretClient(`https://${vaultName}.vault.azure.net`, new DefaultAzureCredential());

  try {
    const requiredEnvManifest = JSON.parse(fs.readFileSync(moduleOptions.envManifest, 'utf8'));
    const result = createEnvironmentVariableList(requiredEnvManifest);

    if (result.missingVariables.length) {
      console.log("[ERR] missing the following required environment variables");
      console.log(JSON.stringify(result.missingVariables));
      if (moduleOptions.exitOnMissing) throw new Error("Missing reqired env vars");
    }
    typeCheckVariables(result.envVariableList);
    await loadSecretsFromStore(vaultClient, result.envVariableList);
    loadIntoProcessEnv(result.envVariableList);
  } catch (error) {
    if (error.code === "ENOENT" && error.path === moduleOptions.envManifest) {
      console.log(`Error: secrets loader unable to find required env manifest file '${moduleOptions.envManifest}'`);
    } else if (error.name === "AggregateAuthenticationError") {
      console.log("Error: secrets loader authentication to Azure secret store failed");
    }
    process.exit(1);
  }
}

main("kv-shared-dev-southeast", {
  envManifest: "required-env.json",
  secretStore: "Azure",
  exitOnMissing: false,
});
