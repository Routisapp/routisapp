const { ethers } = require("hardhat");
const fs   = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  // Deploy TraderNFT
  const TraderNFT = await ethers.getContractFactory("TraderNFT");
  const nft = await TraderNFT.deploy(
    "https://agex.app/api/nft/{id}.json"  // metadata URI
  );
  await nft.waitForDeployment();

  const address = await nft.getAddress();
  console.log("TraderNFT deployed to:", address);

  // Update constants/nft-tiers.ts in frontend
  const tiersPath = path.resolve(__dirname, "../../frontend/constants/nft-tiers.ts");
  if (fs.existsSync(tiersPath)) {
    let content = fs.readFileSync(tiersPath, "utf8");
    content = content.replace(
      /export const TRADER_NFT_ADDRESS = ".*?"/,
      `export const TRADER_NFT_ADDRESS = "${address}"`
    );
    fs.writeFileSync(tiersPath, content);
    console.log("Updated frontend/constants/nft-tiers.ts with contract address");
  }

  // Verify on Basescan (if API key set)
  if (process.env.BASESCAN_API_KEY) {
    console.log("Waiting 5 confirmations before verifying...");
    const tx = nft.deploymentTransaction();
    if (tx) await tx.wait(5);

    await hre.run("verify:verify", {
      address,
      constructorArguments: ["https://agex.app/api/nft/{id}.json"],
    });
    console.log("Verified on Basescan");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
