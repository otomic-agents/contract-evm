// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    console.log("Account balance:", (await deployer.getBalance()).toString());
    console.log("Account nonce:", await deployer.getTransactionCount());

    const Otmoic = await hre.ethers.getContractFactory("Otmoic");
    const otmoic = await Otmoic.deploy();
    await otmoic.deployed();

    console.log(`Otmoic contract deployed ${otmoic.address}`);

    const TestERC20 = await hre.ethers.getContractFactory("TestERC20");
    const oUSDC = await TestERC20.deploy(hre.ethers.utils.parseEther("1000000"), "otmoic-test-usdc", "oUSDC");
    await oUSDC.deployed();

    console.log(`oUSDC contract deployed ${oUSDC.address}`);

    const oBTC = await TestERC20.deploy(hre.ethers.utils.parseEther("1000000"), "otmoic-test-btc", "oBTC");
    await oBTC.deployed();

    console.log(`oBTC contract deployed ${oBTC.address}`);

    const oETH = await TestERC20.deploy(hre.ethers.utils.parseEther("1000000"), "otmoic-test-eth", "oETH");
    await oETH.deployed();

    console.log(`oETH contract deployed ${oETH.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
