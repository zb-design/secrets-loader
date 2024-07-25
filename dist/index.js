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
require("dotenv/config");
const identity_1 = require("@azure/identity");
const keyvault_secrets_1 = require("@azure/keyvault-secrets");
const fs = __importStar(require("fs"));
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
function createEnvironmentVariableList(requiredEnvManifest) {
    const appVariables = [];
    const missingVariables = [];
    for (const [key, value] of Object.entries(requiredEnvManifest)) {
        // validate that each required env is already loaded into process.env first
        if (!process.env.hasOwnProperty(key)) {
            console.log(`[ERR] missing required env var ${key}`);
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
function loadSecretsFromStore(client, variableList) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let item of variableList) {
            if (item.value === "FROM_SECRET") {
                const secret = yield client.getSecret(item.keyVaultKey);
                item.value = secret.value;
            }
        }
    });
}
function loadIntoProcessEnv(variableList) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let item of variableList) {
            process.env[item.localKey] = item.value;
            console.log(`[INFO] loaded variable ${item.localKey} with value ${item.value}`);
        }
    });
}
function typeCheckVariables(variableList) {
    for (let item of variableList) {
        const requiredDataType = item.dataType;
        if (typeof requiredDataType !== requiredDataType) {
            console.log(`[ERR] '${item.localKey}' variable required datatype '${requiredDataType}' does not match '${typeof requiredDataType}'`);
        }
    }
}
function main(vaultName_1) {
    return __awaiter(this, arguments, void 0, function* (vaultName, moduleOptions = {
        envManifest: "required-env.json",
        secretStore: "Azure",
        exitOnMissing: true
    }) {
        // Build the URL to reach your key vault
        const vaultClient = new keyvault_secrets_1.SecretClient(`https://${vaultName}.vault.azure.net`, new identity_1.DefaultAzureCredential());
        try {
            const requiredEnvManifest = JSON.parse(fs.readFileSync(moduleOptions.envManifest, 'utf8'));
            const result = createEnvironmentVariableList(requiredEnvManifest);
            if (result.missingVariables.length) {
                console.log("[ERR] missing the following required environment variables");
                console.log(JSON.stringify(result.missingVariables));
                if (moduleOptions.exitOnMissing)
                    throw new Error("Missing reqired env vars");
            }
            typeCheckVariables(result.envVariableList);
            yield loadSecretsFromStore(vaultClient, result.envVariableList);
            loadIntoProcessEnv(result.envVariableList);
        }
        catch (error) {
            if (error.code === "ENOENT" && error.path === moduleOptions.envManifest) {
                console.log(`Error: secrets loader unable to find required env manifest file '${moduleOptions.envManifest}'`);
            }
            else if (error.name === "AggregateAuthenticationError") {
                console.log("Error: secrets loader authentication to Azure secret store failed");
            }
            process.exit(1);
        }
    });
}
main("kv-shared-dev-southeast", {
    envManifest: "required-env.json",
    secretStore: "Azure",
    exitOnMissing: false,
});
//# sourceMappingURL=index.js.map