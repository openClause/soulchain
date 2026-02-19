import { run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deploymentFile = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`No deployment found for ${network.name}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  console.log(`Verifying ${deployment.address} on ${network.name}...`);

  await run("verify:verify", {
    address: deployment.address,
    constructorArguments: [],
  });

  console.log("Verified!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
