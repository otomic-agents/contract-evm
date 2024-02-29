const assert = require("node:assert");
const hre = require("hardhat");
const ethers = hre.ethers;
const { BigNumber, utils } = ethers;

const OBRIDGE_ADDR = process.env.OBRIDGE;

async function main() {

    const [userWallet, lpWallet] = await ethers.getSigners();

    console.log(`
####################################
    set up
`)

    const userBalance = await userWallet.getBalance();
    console.log(`Load user wallet: ${userWallet.address} -> native token: ${userBalance}`);

    const lpBalance = await lpWallet.getBalance();
    console.log(`Load lp wallet: ${lpWallet.address} -> native token: ${lpBalance}`);

    const otmoic = await ethers.getContractAt("Otmoic", OBRIDGE_ADDR);
    console.log(`Otmoic contract connected: ${otmoic.address}`);

    console.log(`
####################################
    native token <--> native token: swap 10000 user native token to 20000 lp native token
`)
    let token_amount_src = BigNumber.from("10000");
    assert(token_amount_src.lt(userBalance), "user has insufficient native token for swap");
    
    let token_amount_dst = BigNumber.from("20000");
    assert(token_amount_dst.lt(lpBalance), "lp has insufficient native token for swap");
    
    let nativeTokenAddress = "0x0000000000000000000000000000000000000000";
    let preimage = new Array(32).fill(2);
    let relayPreimage = new Array(32).fill(3);
    let hashlock = utils.keccak256(utils.solidityPack(['bytes32'], [preimage]));
    let relayHashlock = utils.keccak256(utils.solidityPack(['bytes32'], [relayPreimage]));

    let stepTimelock = 60;

    // should modify this value when refundTransferOut
    let agreementReachedTime = Math.floor(Date.now() / 1000);

    let srcChainId = 9006;
    let dstChainId = 9006;

    let bidId = ethers.utils.formatBytes32String('2');
    let eth_amount = '0'

    let requestor = 'did:requestor'
    let lpId = 'did:lp'

    let userSign = 'userSign'
    let lpSign = 'lpSign'

    let tx;
    let txComfirm;

    tx = await otmoic.connect(userWallet).transferOut(
        userWallet.address,
        lpWallet.address,
        nativeTokenAddress,
        token_amount_src,
        hashlock,
        relayHashlock,
        stepTimelock,
        dstChainId,
        userWallet.address,
        bidId,
        nativeTokenAddress,
        token_amount_dst,
        eth_amount,
        agreementReachedTime,
        requestor,
        lpId,
        userSign,
        lpSign,
        {
            value: token_amount_src
        }
    );
    txComfirm = await tx.wait();
    console.log(`user sent transferOut: ${txComfirm.transactionHash}`);


    // // refund transferOut
    // tx = await otmoic.connect(userWallet).refundTransferOut(
    //     userWallet.address,
    //     lpWallet.address,
    //     nativeTokenAddress,
    //     token_amount_src,
    //     eth_amount,
    //     hashlock,
    //     relayHashlock,
    //     stepTimelock,
    //     1710901036,
    // );
    // txComfirm = await tx.wait();
    // console.log(`user sent refundTransferOut: ${txComfirm.transactionHash}`);

    let tranferOutLog = txComfirm.logs[0];
    let tranferOutLogData = utils.defaultAbiCoder.decode(
        ['bytes32', 'address', 'address', 'address', 'uint256', 'bytes32', 'bytes32', 'uint64', 'uint64', 'uint256', 'bytes32', 'uint256', 'uint256', 'uint64'],
        tranferOutLog.data
     );
    // console.log(tranferOutLogData);
    let srcTransferId = tranferOutLogData[0];

    tx = await otmoic.connect(lpWallet).transferIn(
        lpWallet.address,
        userWallet.address,
        nativeTokenAddress,
        token_amount_dst,
        eth_amount,
        hashlock,
        stepTimelock,
        srcChainId,
        srcTransferId,
        agreementReachedTime,
        {
            value: token_amount_dst
        }
    );
    txComfirm = await tx.wait();
    console.log(`lp sent transferIn: ${txComfirm.transactionHash}`);

    // // refund transferIn
    // tx = await otmoic.connect(userWallet).refundTransferIn(
    //     lpWallet.address,
    //     userWallet.address,
    //     nativeTokenAddress,
    //     token_amount_dst,
    //     eth_amount,
    //     hashlock,
    //     stepTimelock,
    //     1710901036,
    // );
    // txComfirm = await tx.wait();
    // console.log(`user sent refundTransferIn: ${txComfirm.transactionHash}`);

    tx = await otmoic.connect(userWallet).confirmTransferOut(
        userWallet.address,
        lpWallet.address,
        nativeTokenAddress,
        token_amount_src,
        eth_amount,
        hashlock,
        relayHashlock,
        stepTimelock,
        preimage,
        relayPreimage,
        agreementReachedTime
    );
    txComfirm = await tx.wait();
    console.log(`user confirm transferOut: ${txComfirm.transactionHash}`);

    tx = await otmoic.connect(lpWallet).confirmTransferIn(
        lpWallet.address,
        userWallet.address,
        nativeTokenAddress,
        token_amount_dst,
        eth_amount,
        hashlock,
        stepTimelock,
        preimage,
        agreementReachedTime,
    );
    txComfirm = await tx.wait();
    console.log(`lp confirm transferIn: ${txComfirm.transactionHash}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});