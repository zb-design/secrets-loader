import { SecretsLoader } from "./index";

async function main() {
  const secretLoader = new SecretsLoader(process.env.AZURE_KEY_VAULT);
  await secretLoader.configure();
}

main();
