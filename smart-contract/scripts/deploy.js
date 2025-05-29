const { ethers } = require("hardhat");

async function main() {
  // 1. Get the contract factory (compiled contract)
  const DShare = await ethers.getContractFactory("DShare");

  // 2. Deploy the contract
  console.log("Deploying DShare contract...");
  const dshare = await DShare.deploy();
  
  // 3. Wait for deployment confirmation
  await dshare.waitForDeployment();
  
  // 4. Get the contract address
  const contractAddress = await dshare.getAddress();
  console.log("DShare deployed to:", contractAddress);
}

// Execute and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });