import { SecretsLoader } from "./index";

async function main() {
  const secretLoader = new SecretsLoader(process.env.AZURE_KEY_VAULT, {
    envManifest: "env/required-env.json"
  });
  await secretLoader.configure();
  console.log(process.env);
}

main();
