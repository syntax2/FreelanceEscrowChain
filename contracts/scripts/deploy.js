const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  // 1. Deploy MockUSDT
  console.log("\n--- Deploying MockUSDT ---");
  const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy();
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("MockUSDT deployed to:", usdtAddress);

  // 2. Deploy EscrowUSDT
  console.log("\n--- Deploying EscrowUSDT ---");
  const EscrowUSDT = await hre.ethers.getContractFactory("EscrowUSDT");
  const escrow = await EscrowUSDT.deploy(usdtAddress, deployer.address);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("EscrowUSDT deployed to:", escrowAddress);

  // 3. Deploy ReputationNFT
  console.log("\n--- Deploying ReputationNFT ---");
  const ReputationNFT = await hre.ethers.getContractFactory("ReputationNFT");
  const nft = await ReputationNFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("ReputationNFT deployed to:", nftAddress);

  // 4. Deploy FreelanceMarket
  console.log("\n--- Deploying FreelanceMarket ---");
  const FreelanceMarket = await hre.ethers.getContractFactory("FreelanceMarket");
  const market = await FreelanceMarket.deploy(usdtAddress, escrowAddress, nftAddress);
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log("FreelanceMarket deployed to:", marketAddress);

  // 5. Post-deployment setup
  console.log("\n--- Post-deployment Setup ---");

  // Authorize FreelanceMarket as minter for ReputationNFT
  const authTx = await nft.authorizeMinter(marketAddress);
  await authTx.wait();
  console.log("FreelanceMarket authorized as ReputationNFT minter");

  // Register deployer as arbiter for demo
  const arbiterTx = await escrow.registerArbiter(deployer.address);
  await arbiterTx.wait();
  console.log("Deployer registered as arbiter");

  // Summary
  console.log("\n========================================");
  console.log("  DEPLOYMENT SUMMARY");
  console.log("========================================");
  console.log(`  Network:        ${hre.network.name}`);
  console.log(`  MockUSDT:       ${usdtAddress}`);
  console.log(`  EscrowUSDT:     ${escrowAddress}`);
  console.log(`  ReputationNFT:  ${nftAddress}`);
  console.log(`  FreelanceMarket:${marketAddress}`);
  console.log(`  Deployer:       ${deployer.address}`);
  console.log("========================================\n");

  // Write deployment info for frontend
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    contracts: {
      MockUSDT: usdtAddress,
      EscrowUSDT: escrowAddress,
      ReputationNFT: nftAddress,
      FreelanceMarket: marketAddress,
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  const deployDir = "./deployments";
  if (!fs.existsSync(deployDir)) fs.mkdirSync(deployDir, { recursive: true });
  fs.writeFileSync(
    `${deployDir}/${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`Deployment info saved to ${deployDir}/${hre.network.name}.json`);

  // Verify contracts if on testnet
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations before verification...");
    await new Promise((r) => setTimeout(r, 30000));

    const contracts = [
      { address: usdtAddress, args: [] },
      { address: escrowAddress, args: [usdtAddress, deployer.address] },
      { address: nftAddress, args: [] },
      { address: marketAddress, args: [usdtAddress, escrowAddress, nftAddress] },
    ];

    for (const c of contracts) {
      try {
        await hre.run("verify:verify", {
          address: c.address,
          constructorArguments: c.args,
        });
        console.log(`Verified: ${c.address}`);
      } catch (e) {
        console.log(`Verification failed for ${c.address}: ${e.message}`);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
