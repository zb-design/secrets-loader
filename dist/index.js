var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");
const config = {};
// Build the URL to reach your key vault
const vaultName = "kv-shared-dev-southeast";
const url = `https://${vaultName}.vault.azure.net`;
const credential = new DefaultAzureCredential();
const client = new SecretClient(url, credential);
const secretName = "DB-PASSWORD";
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const latestSecret = yield client.getSecret(secretName);
            console.log(`Latest version of the secret ${secretName}: `, latestSecret);
            const specificSecret = yield client.getSecret(secretName, { version: latestSecret.properties.version });
            console.log(`The secret ${secretName} at the version ${latestSecret.properties.version}: `, specificSecret);
        }
        catch (error) {
            console.log(error);
        }
    });
}
main();
//# sourceMappingURL=index.js.map