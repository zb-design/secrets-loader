"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretsLoader = void 0;
require("dotenv/config");
const identity_1 = require("@azure/identity");
const keyvault_secrets_1 = require("@azure/keyvault-secrets");
const fs = __importStar(require("fs"));
class SecretsLoader {
    constructor(vaultName, moduleOptions, logger = console) {
        this.vaultUrl = `https://${vaultName}.vault.azure.net`;
        this.vaultClient = new keyvault_secrets_1.SecretClient(this.vaultUrl, new identity_1.DefaultAzureCredential());
        if (!moduleOptions) {
            this.moduleOptions = {
                envManifest: "required-env.json",
                secretStore: "Azure",
                exitOnMissing: true
            };
        }
        else {
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
    createEnvironmentVariableList(requiredEnvManifest) {
        const appVariables = [];
        const missingVariables = [];
        for (const [key, value] of Object.entries(requiredEnvManifest)) {
            // validate that each required env is already loaded into process.env first
            if (!process.env.hasOwnProperty(key)) {
                this.logger.log(`[ERR] missing required env var ${key}`);
                missingVariables.push(key);
            }
            const newVar = {
                localKey: key,
                keyVaultKey: key.replace("_", "-"), //azure key vault only allows - instead of _
                value: process.env[key],
                dataType: String(value)
            };
            appVariables.push(newVar);
        }
        return {
            envVariableList: appVariables,
            missingVariables: missingVariables
        };
    }
    loadSecretsFromStore(client, variableList) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let item of variableList) {
                if (item.value === "FROM_SECRET") {
                    const secret = yield client.getSecret(item.keyVaultKey);
                    item.value = secret.value;
                }
            }
        });
    }
    loadIntoProcessEnv(variableList) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let item of variableList) {
                process.env[item.localKey] = item.value;
                this.logger.debug(`[INFO] loaded variable ${item.localKey} with value ${item.value}`);
            }
        });
    }
    typeCheckVariables(variableList) {
        for (let item of variableList) {
            const requiredDataType = item.dataType;
            if (typeof requiredDataType !== requiredDataType) {
                this.logger.log(`[ERR] '${item.localKey}' variable required datatype '${requiredDataType}' does not match '${typeof requiredDataType}'`);
            }
        }
    }
    configure() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const requiredEnvManifest = JSON.parse(fs.readFileSync(this.moduleOptions.envManifest, 'utf8'));
                const result = this.createEnvironmentVariableList(requiredEnvManifest);
                if (result.missingVariables.length) {
                    this.logger.log("[ERR] missing the following required environment variables");
                    this.logger.log(JSON.stringify(result.missingVariables));
                    if (this.moduleOptions.exitOnMissing)
                        throw new Error("Missing reqired env vars");
                }
                this.typeCheckVariables(result.envVariableList);
                yield this.loadSecretsFromStore(this.vaultClient, result.envVariableList);
                this.loadIntoProcessEnv(result.envVariableList);
            }
            catch (error) {
                if (error.code === "ENOENT" && error.path === this.moduleOptions.envManifest) {
                    this.logger.log(`Error: secrets loader unable to find required env manifest file '${this.moduleOptions.envManifest}'`);
                }
                else if (error.name === "AggregateAuthenticationError") {
                    this.logger.log("Error: secrets loader authentication to Azure secret store failed");
                }
                process.exit(1);
            }
        });
    }
}
exports.SecretsLoader = SecretsLoader;
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const secretLoader = new SecretsLoader(process.env.AZURE_KEY_VAULT);
        yield secretLoader.configure();
    });
}
main();
//# sourceMappingURL=index.js.map