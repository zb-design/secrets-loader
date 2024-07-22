const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");
const config = {};

// Build the URL to reach your key vault
const vaultName = "kv-shared-dev-southeast";
const url = `https://${vaultName}.vault.azure.net`;

const credential = new DefaultAzureCredential();
const client = new SecretClient(url, credential);

const secretName = "DB-PASSWORD";

async function main() {
  try {
    const latestSecret = await client.getSecret(secretName);
    console.log(`Latest version of the secret ${secretName}: `, latestSecret);
    const specificSecret = await client.getSecret(secretName, { version: latestSecret.properties.version! });
    console.log(`The secret ${secretName} at the version ${latestSecret.properties.version!}: `, specificSecret);
    
  } catch (error) {
    console.log(error);
  }
}

main();
