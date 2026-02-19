import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log(`Deploying SoulRegistry to ${network.name}...`);

  const SoulRegistry = await ethers.getContractFactory("SoulRegistry");
  const registry = await SoulRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`SoulRegistry deployed to: ${address}`);

  // Save deployment
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

  const deploymentFile = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify({
    address,
    network: network.name,
    chainId: network.config.chainId,
    deployer: (await ethers.provider.getSigner()).address,
    deployedAt: new Date().toISOString(),
  }, null, 2));

  console.log(`Deployment saved to ${deploymentFile}`);

  // Verify on Basescan if not localhost/hardhat
  if (network.name !== "localhost" && network.name !== "hardhat") {
    console.log("Waiting for block confirmations...");
    await new Promise(r => setTimeout(r, 30000));
    try {
      const { run } = await import("hardhat");
      await run("verify:verify", { address, constructorArguments: [] });
      console.log("Contract verified on Basescan!");
    } catch (e: any) {
      console.log(`Verification failed: ${e.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
