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

interface Logger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export class SecretsLoader {
  private vaultUrl: string;
  private vaultClient: SecretClient;
  private moduleOptions: moduleOptions;
  private logger: Logger;

  constructor(vaultName: string, moduleOptions?: moduleOptions, logger: Logger = console) {
    this.vaultUrl = `https://${vaultName}.vault.azure.net`;
    this.vaultClient = new SecretClient(this.vaultUrl, new DefaultAzureCredential());
    if (!moduleOptions) {
      this.moduleOptions = {
        envManifest: "required-env.json",
        secretStore: "Azure",
        exitOnMissing: true
      }
    } else {
      this.moduleOptions = moduleOptions;
    }
    this.logger = logger;
  }


  /**
   * Takes our required env json object and validates that each required env var has already been 
   * provided through process.env as expected. Any missing required env var keys are stored in a list
   * and returned as well
   * @param requiredEnvManifest our loaded json object taken straight from the required-env.json file
   * @returns list of objects representing the env variables our application needs and a possible list
   * of missing env variable keys
   */
  private createEnvironmentVariableList(requiredEnvManifest: any) {
    const appVariables: applicationVariable[] = [];
    const missingVariables: string[] = [];
    for (const [key, value] of Object.entries(requiredEnvManifest)) {
      // validate that each required env is already loaded into process.env first
      if (!process.env.hasOwnProperty(key)) {
        this.logger.log(`[ERR] missing required env var ${key}`)
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
  
  private async loadSecretsFromStore(client: SecretClient, variableList: applicationVariable[]): Promise<void> {
    for (let item of variableList) {
      if (item.value === "FROM_SECRET") {
        const secret = await client.getSecret(item.keyVaultKey);
        item.value = secret.value;
      }
    }
  }
  
  private async loadIntoProcessEnv(variableList: applicationVariable[]) {
    for (let item of variableList) {
      process.env[item.localKey] = item.value;
      this.logger.debug(`[INFO] loaded variable ${item.localKey} with value ${item.value}`)
    }
  }
  
  private typeCheckVariables(variableList: applicationVariable[]): void {
    for (let item of variableList) {
      const requiredDataType = item.dataType;
  
      if (typeof requiredDataType !== requiredDataType) {
        this.logger.log(`[ERR] '${item.localKey}' variable required datatype '${requiredDataType}' does not match '${typeof requiredDataType}'`)
      }
    }
  }

  public async configure() {
    try {
      const requiredEnvManifest = JSON.parse(fs.readFileSync(this.moduleOptions.envManifest, 'utf8'));
      const result = this.createEnvironmentVariableList(requiredEnvManifest);
  
      if (result.missingVariables.length) {
        this.logger.log("[ERR] missing the following required environment variables");
        this.logger.log(JSON.stringify(result.missingVariables));
        if (this.moduleOptions.exitOnMissing) throw new Error("Missing reqired env vars");
      }
      this.typeCheckVariables(result.envVariableList);
      await this.loadSecretsFromStore(this.vaultClient, result.envVariableList);
      this.loadIntoProcessEnv(result.envVariableList);
    } catch (error) {
      if (error.code === "ENOENT" && error.path === this.moduleOptions.envManifest) {
        this.logger.log(`Error: secrets loader unable to find required env manifest file '${this.moduleOptions.envManifest}'`);
      } else if (error.name === "AggregateAuthenticationError") {
        this.logger.log("Error: secrets loader authentication to Azure secret store failed");
      }
      process.exit(1);
    }
  }
}

async function main() {
  const secretLoader = new SecretsLoader(process.env.AZURE_KEY_VAULT);
  await secretLoader.configure();
}

main();
