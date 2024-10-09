const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Otmoic", function () {
    async function deployOtmoic() {
        const [owner, otherAccount, user, lp, feeRecepient] =
            await ethers.getSigners();

        const Otmoic = await hre.ethers.getContractFactory("Otmoic");
        const otmoic = await Otmoic.deploy();
        await otmoic.deployed();

        return { otmoic, owner, otherAccount, user, lp, feeRecepient };
    }
    async function deployTestERC20Src() {
        const [owner, otherAccount] = await ethers.getSigners();

        const initialSupply = "10000000000000000000000";

        const TestERC20 = await hre.ethers.getContractFactory("TestERC20Src");
        const tercSrc = await TestERC20.deploy(initialSupply);
        await tercSrc.deployed();

        return { tercSrc, owner, otherAccount, initialSupply };
    }
    async function deployTestERC20Dst() {
        const [owner, otherAccount] = await ethers.getSigners();

        const initialSupply = "10000000000000000000000";

        const TestERC20 = await hre.ethers.getContractFactory("TestERC20Dst");
        const tercDst = await TestERC20.deploy(initialSupply);
        await tercDst.deployed();

        return { tercDst, owner, otherAccount, initialSupply };
    }

    let cache = {};

    describe("Fee", function () {
        describe("ERC20 -> Native + ERC20 (Fee)", function () {
            it("TokenA(ERC20) -> Native + TokenB(ERC20) (Fee setup)", async function () {
                const { tercSrc } = await loadFixture(deployTestERC20Src);
                const { tercDst } = await loadFixture(deployTestERC20Dst);
                const { otmoic, owner, otherAccount, user, lp, feeRecepient } =
                    await loadFixture(deployOtmoic);

                Object.assign(cache, {
                    tercSrc,
                    tercDst,
                    otmoic,
                    owner,
                    otherAccount,
                    user,
                    lp,
                    feeRecepient,
                });

                // on source chain, user transfer token_amount_src TokenA to lp with 10% fee
                let token_amount_src = ethers.BigNumber.from(
                    "1000000000000000000",
                );

                // on destination chain, lp transfer token_amount_dst TokenB and eth_amount ETH to user with 10% fee
                let token_amount_dst =
                    ethers.BigNumber.from("1000000000000000");
                let eth_amount = ethers.BigNumber.from("1000000000000000");

                // set fee to 10%
                await otmoic.connect(owner).setBasisPointsRate(1000);
                await otmoic
                    .connect(owner)
                    .setTollAddress(feeRecepient.address);

                let token_amount_src_fee = token_amount_src
                    .mul(1000)
                    .div(10000);
                let token_amount_dst_fee = token_amount_dst
                    .mul(1000)
                    .div(10000);
                let eth_amount_fee = eth_amount.mul(1000).div(10000);

                let srcTransferId = new Array(32).fill(3);
                let preimage = new Array(32).fill(2);
                let relayPreimage = new Array(32).fill(3);

                let agreementReachedTime = await time.latest();
                let stepTimelock = 60;
                let srcChainId = "60";
                let dstChainId = "60";
                let bidId = ethers.utils.formatBytes32String("1");

                let requestor = "did:requestor";
                let lpId = "did:lp";

                let userSign = "userSign";
                let lpSign = "lpSign";

                let hashlock = ethers.utils.keccak256(
                    ethers.utils.solidityPack(["bytes32"], [preimage]),
                );
                let relayHashlock = ethers.utils.keccak256(
                    ethers.utils.solidityPack(["bytes32"], [relayPreimage]),
                );

                await expect(
                    tercSrc
                        .connect(owner)
                        .transfer(user.address, token_amount_src),
                )
                    .to.emit(tercSrc, "Transfer")
                    .withArgs(owner.address, user.address, token_amount_src);

                await expect(
                    tercDst
                        .connect(owner)
                        .transfer(lp.address, token_amount_dst),
                )
                    .to.emit(tercDst, "Transfer")
                    .withArgs(owner.address, lp.address, token_amount_dst);

                let feeRecepientNativeBalanceBefore =
                    await feeRecepient.getBalance();
                let feeRecepientTokenSrcBalanceBefore = await tercSrc.balanceOf(
                    feeRecepient.address,
                );
                let feeRecepientTokenDstBalanceBefore = await tercDst.balanceOf(
                    feeRecepient.address,
                );

                await expect(
                    tercSrc
                        .connect(user)
                        .approve(otmoic.address, token_amount_src),
                );

                let userTokenSrcBalanceBefore = await tercSrc.balanceOf(
                    user.address,
                );
                let userTokenDstBalanceBefore = await tercDst.balanceOf(
                    user.address,
                );

                await expect(
                    otmoic
                        .connect(user)
                        .transferOut(
                            user.address,
                            lp.address,
                            tercSrc.address,
                            token_amount_src,
                            hashlock,
                            relayHashlock,
                            stepTimelock,
                            dstChainId,
                            owner.address,
                            bidId,
                            tercDst.address,
                            token_amount_dst,
                            eth_amount,
                            agreementReachedTime,
                            requestor,
                            lpId,
                            userSign,
                            lpSign,
                        ),
                )
                    .to.emit(tercSrc, "Transfer")
                    .withArgs(user.address, otmoic.address, token_amount_src);

                let userNativeBalanceBefore = await user.getBalance();
                await expect(
                    tercDst
                        .connect(lp)
                        .approve(otmoic.address, token_amount_dst),
                );

                let lpNativeBalanceBefore = await lp.getBalance();
                let lpTokenSrcBalanceBefore = await tercSrc.balanceOf(
                    lp.address,
                );
                let lpTokenDstBalanceBefore = await tercDst.balanceOf(
                    lp.address,
                );

                await expect(
                    otmoic
                        .connect(lp)
                        .transferIn(
                            lp.address,
                            user.address,
                            tercDst.address,
                            token_amount_dst,
                            eth_amount,
                            hashlock,
                            stepTimelock,
                            srcChainId,
                            srcTransferId,
                            agreementReachedTime,
                            { value: eth_amount },
                        ),
                )
                    .to.emit(tercDst, "Transfer")
                    .withArgs(lp.address, otmoic.address, token_amount_dst);

                // change fee in the middle will not affect the fee for this swap
                await otmoic.connect(owner).setBasisPointsRate(2000);

                await expect(
                    otmoic.connect(owner).confirmTransferOut(
                        user.address, // address _sender,
                        lp.address, // address _receiver,
                        tercSrc.address, // address _token,
                        token_amount_src, // uint256 _token_amount,
                        "0", // uint256 _eth_amount,
                        hashlock, // bytes32 _hashlock,
                        relayHashlock, // bytes32 _relayHashlock,
                        stepTimelock, // uint64 _stepTimelock,
                        preimage, // bytes32 _preimage,
                        relayPreimage, // bytes32 _relayPreimage,
                        agreementReachedTime, // uint64 _agreementReachedTime
                    ),
                )
                    .to.emit(tercSrc, "Transfer")
                    .withArgs(
                        otmoic.address,
                        lp.address,
                        token_amount_src.sub(token_amount_src_fee),
                    )
                    .to.emit(tercSrc, "Transfer")
                    .withArgs(
                        otmoic.address,
                        feeRecepient.address,
                        token_amount_src_fee,
                    );

                await expect(
                    otmoic
                        .connect(owner)
                        .confirmTransferIn(
                            lp.address,
                            user.address,
                            tercDst.address,
                            token_amount_dst,
                            eth_amount,
                            hashlock,
                            stepTimelock,
                            preimage,
                            agreementReachedTime,
                        ),
                )
                    .to.emit(tercDst, "Transfer")
                    .withArgs(
                        otmoic.address,
                        user.address,
                        token_amount_dst.sub(token_amount_dst_fee),
                    )
                    .to.emit(tercDst, "Transfer")
                    .withArgs(
                        otmoic.address,
                        feeRecepient.address,
                        token_amount_dst_fee,
                    );

                // address balance after swap

                let feeRecepientNativeBalanceDiff = (
                    await feeRecepient.getBalance()
                ).sub(feeRecepientNativeBalanceBefore);
                expect(feeRecepientNativeBalanceDiff).to.equal(eth_amount_fee);

                let feeRecepientTokenSrcBalanceDiff = (
                    await tercSrc.balanceOf(feeRecepient.address)
                ).sub(feeRecepientTokenSrcBalanceBefore);
                expect(feeRecepientTokenSrcBalanceDiff).to.equal(
                    token_amount_src_fee,
                );

                let feeRecepientTokenDstBalanceDiff = (
                    await tercDst.balanceOf(feeRecepient.address)
                ).sub(feeRecepientTokenDstBalanceBefore);
                expect(feeRecepientTokenDstBalanceDiff).to.equal(
                    token_amount_dst_fee,
                );

                let userNativeBalanceDiff = (await user.getBalance()).sub(
                    userNativeBalanceBefore,
                );
                expect(userNativeBalanceDiff).to.equal(
                    eth_amount.sub(eth_amount_fee),
                );

                let userTokenSrcBalanceDiff = userTokenSrcBalanceBefore.sub(
                    await tercSrc.balanceOf(user.address),
                );
                expect(userTokenSrcBalanceDiff).to.equal(token_amount_src);

                let userTokenDstBalanceDiff = (
                    await tercDst.balanceOf(user.address)
                ).sub(userTokenDstBalanceBefore);
                expect(userTokenDstBalanceDiff).to.equal(
                    token_amount_dst.sub(token_amount_dst_fee),
                );

                let lpNativeBalanceDiff = lpNativeBalanceBefore.sub(
                    await lp.getBalance(),
                );
                // lpNativeBalanceDiff = eth_amount_fee + gas_fee_for_transferIn
                expect(lpNativeBalanceDiff).to.greaterThan(eth_amount_fee);

                let lpTokenSrcBalanceDiff = (
                    await tercSrc.balanceOf(lp.address)
                ).sub(lpTokenSrcBalanceBefore);
                expect(lpTokenSrcBalanceDiff).to.equal(
                    token_amount_src.sub(token_amount_src_fee),
                );

                let lpTokenDstBalanceDiff = lpTokenDstBalanceBefore.sub(
                    await tercDst.balanceOf(lp.address),
                );
                expect(lpTokenDstBalanceDiff).to.equal(token_amount_dst);
            });
        });
    });
});
