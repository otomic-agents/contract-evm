const { time, loadFixture, reset } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Otmoic", function () {
    async function deploy() {
        const [owner, user, lp, nonUser, nonLp] = await ethers.getSigners();

        const Otmoic = await hre.ethers.getContractFactory("Otmoic");
        const otmoic = await Otmoic.deploy();
        await otmoic.deployed();

        const initialSupply = "10000000000000000000000";

        const TestERC20Src = await hre.ethers.getContractFactory("TestERC20Src");
        const tercSrc = await TestERC20Src.deploy(initialSupply);
        await tercSrc.deployed();

        const TestERC20Dst = await hre.ethers.getContractFactory("TestERC20Dst");
        const tercDst = await TestERC20Dst.deploy(initialSupply);
        await tercDst.deployed();

        return {
            otmoic,
            owner,
            nonUser,
            nonLp,
            user,
            lp,
            tercSrc,
            initialSupply,
            tercDst,
        };
    }

    describe("errors", async function () {
        let requestor = "did:requestor";
        let lpId = "did:lp";

        let userSign = "userSign";
        let lpSign = "lpSign";

        it("tranferOut timelock and transferIn timelock ", async function () {
            const { otmoic, owner, user, lp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = "1000000000000000000";
            let token_amount_dst = "1000000000000000";
            let eth_amount = "0";

            let srcTransferId = new Array(32).fill(3);
            let preimage = new Array(32).fill(2);
            let agreementReachedTime = await time.latest();
            let expectedSingleStepTime = 60;
            let tolerantSingleStepTime = 120;
            let earliestRefundTime = agreementReachedTime + 3 * expectedSingleStepTime + 3 * tolerantSingleStepTime + 1;
            let srcChainId = "60";
            let dstChainId = "60";
            let bidId = ethers.utils.formatBytes32String("1");

            let hashlock = ethers.utils.keccak256(ethers.utils.solidityPack(["bytes32"], [preimage]));

            await tercSrc.transfer(user.address, token_amount_src);
            await tercDst.transfer(lp.address, token_amount_dst);

            await tercSrc.connect(user).approve(otmoic.address, token_amount_src);
            await time.setNextBlockTimestamp(agreementReachedTime + 1 * expectedSingleStepTime + 1);
            await expect(
                otmoic
                    .connect(user)
                    .transferOut(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        hashlock,
                        expectedSingleStepTime,
                        tolerantSingleStepTime,
                        earliestRefundTime,
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
                .to.be.revertedWithCustomError(otmoic, "ExpiredOp")
                .withArgs("transfer out", agreementReachedTime + 1 * expectedSingleStepTime);

            await tercDst.connect(lp).approve(otmoic.address, token_amount_dst);
            await time.setNextBlockTimestamp(agreementReachedTime + 2 * expectedSingleStepTime + 1);
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
                        expectedSingleStepTime,
                        tolerantSingleStepTime,
                        earliestRefundTime,
                        srcChainId,
                        srcTransferId,
                        agreementReachedTime,
                        { value: eth_amount },
                    ),
            )
                .to.be.revertedWithCustomError(otmoic, "ExpiredOp")
                .withArgs("transfer in", agreementReachedTime + 2 * expectedSingleStepTime);
        });

        it("confirmTransferOut timelock and confirmTransferIn timelock", async function () {
            const { otmoic, owner, user, lp, nonUser, nonLp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = "1000000000000000000";
            let token_amount_dst = "1000000000000000";
            let eth_amount = "0";

            let srcTransferId = new Array(32).fill(3);
            let preimage = new Array(32).fill(2);
            let agreementReachedTime = await time.latest();
            let expectedSingleStepTime = 60;
            let tolerantSingleStepTime = 120;
            let earliestRefundTime = agreementReachedTime + 3 * expectedSingleStepTime + 3 * tolerantSingleStepTime + 1;
            let srcChainId = "60";
            let dstChainId = "60";
            let bidId = ethers.utils.formatBytes32String("1");

            let hashlock = ethers.utils.keccak256(ethers.utils.solidityPack(["bytes32"], [preimage]));

            await tercSrc.transfer(user.address, token_amount_src);
            await tercDst.transfer(lp.address, token_amount_dst);

            await tercSrc.connect(user).approve(otmoic.address, token_amount_src);

            await otmoic
                .connect(user)
                .transferOut(
                    user.address,
                    lp.address,
                    tercSrc.address,
                    token_amount_src,
                    hashlock,
                    expectedSingleStepTime,
                    tolerantSingleStepTime,
                    earliestRefundTime,
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
                );

            await tercDst.connect(lp).approve(otmoic.address, token_amount_dst);
            await otmoic
                .connect(lp)
                .transferIn(
                    lp.address,
                    user.address,
                    tercDst.address,
                    token_amount_dst,
                    eth_amount,
                    hashlock,
                    expectedSingleStepTime,
                    tolerantSingleStepTime,
                    earliestRefundTime,
                    srcChainId,
                    srcTransferId,
                    agreementReachedTime,
                    { value: eth_amount },
                );

            // user cannot confirm out after agreementReachedTime + 3 * expectedSingleStepTime
            await time.setNextBlockTimestamp(agreementReachedTime + 3 * expectedSingleStepTime + 1);
            await expect(
                otmoic
                    .connect(user)
                    .confirmTransferOut(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        eth_amount,
                        hashlock,
                        expectedSingleStepTime,
                        tolerantSingleStepTime,
                        earliestRefundTime,
                        preimage,
                        agreementReachedTime,
                    ),
            )
                .to.be.revertedWithCustomError(otmoic, "ExpiredOp")
                .withArgs("user confirm out", agreementReachedTime + 3 * expectedSingleStepTime);

            // lp cannot confirm after in agreementReachedTime + 3 * expectedSingleStepTime + 1 * tolerantSingleStepTime
            await time.setNextBlockTimestamp(
                agreementReachedTime + 3 * expectedSingleStepTime + 1 * tolerantSingleStepTime + 1,
            );
            await expect(
                otmoic
                    .connect(lp)
                    .confirmTransferIn(
                        lp.address,
                        user.address,
                        tercDst.address,
                        token_amount_dst,
                        eth_amount,
                        hashlock,
                        expectedSingleStepTime,
                        tolerantSingleStepTime,
                        earliestRefundTime,
                        preimage,
                        agreementReachedTime,
                    ),
            )
                .to.be.revertedWithCustomError(otmoic, "ExpiredOp")
                .withArgs(
                    "lp confirm in",
                    agreementReachedTime + 3 * expectedSingleStepTime + 1 * tolerantSingleStepTime,
                );

            // non-lp cannot confirm in after agreementReachedTime + 3 * expectedSingleStepTime + 2 * tolerantSingleStepTime
            await time.setNextBlockTimestamp(
                agreementReachedTime + 3 * expectedSingleStepTime + 2 * tolerantSingleStepTime + 1,
            );
            await expect(
                otmoic
                    .connect(nonLp)
                    .confirmTransferIn(
                        lp.address,
                        user.address,
                        tercDst.address,
                        token_amount_dst,
                        eth_amount,
                        hashlock,
                        expectedSingleStepTime,
                        tolerantSingleStepTime,
                        earliestRefundTime,
                        preimage,
                        agreementReachedTime,
                    ),
            )
                .to.be.revertedWithCustomError(otmoic, "NotInOpWindow")
                .withArgs(
                    "non-lp confirm in",
                    agreementReachedTime + 3 * expectedSingleStepTime + 1 * tolerantSingleStepTime,
                    agreementReachedTime + 3 * expectedSingleStepTime + 2 * tolerantSingleStepTime,
                );

            // non-user cannot confirm out after agreementReachedTime + 3 * expectedSingleStepTime + 3 * tolerantSingleStepTime
            await time.setNextBlockTimestamp(
                agreementReachedTime + 3 * expectedSingleStepTime + 3 * tolerantSingleStepTime + 1,
            );
            await expect(
                otmoic
                    .connect(nonUser)
                    .confirmTransferOut(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        eth_amount,
                        hashlock,
                        expectedSingleStepTime,
                        tolerantSingleStepTime,
                        earliestRefundTime,
                        preimage,
                        agreementReachedTime,
                    ),
            )
                .to.be.revertedWithCustomError(otmoic, "NotInOpWindow")
                .withArgs(
                    "non-user confirm out",
                    agreementReachedTime + 3 * expectedSingleStepTime + 2 * tolerantSingleStepTime,
                    agreementReachedTime + 3 * expectedSingleStepTime + 3 * tolerantSingleStepTime,
                );
        });

        it("confirm out by non-user address and confirm in by non-lp address", async function () {
            const { otmoic, owner, user, lp, nonUser, nonLp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = "1000000000000000000";
            let token_amount_dst = "1000000000000000";
            let eth_amount = "0";

            let srcTransferId = new Array(32).fill(3);
            let preimage = new Array(32).fill(2);
            let agreementReachedTime = await time.latest();
            let expectedSingleStepTime = 60;
            let tolerantSingleStepTime = 120;
            let earliestRefundTime = agreementReachedTime + 3 * expectedSingleStepTime + 3 * tolerantSingleStepTime + 1;
            let srcChainId = "60";
            let dstChainId = "60";
            let bidId = ethers.utils.formatBytes32String("1");

            let hashlock = ethers.utils.keccak256(ethers.utils.solidityPack(["bytes32"], [preimage]));

            await tercSrc.transfer(user.address, token_amount_src);
            await tercDst.transfer(lp.address, token_amount_dst);

            await tercSrc.connect(user).approve(otmoic.address, token_amount_src);

            await otmoic
                .connect(user)
                .transferOut(
                    user.address,
                    lp.address,
                    tercSrc.address,
                    token_amount_src,
                    hashlock,
                    expectedSingleStepTime,
                    tolerantSingleStepTime,
                    earliestRefundTime,
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
                );

            await tercDst.connect(lp).approve(otmoic.address, token_amount_dst);
            await otmoic
                .connect(lp)
                .transferIn(
                    lp.address,
                    user.address,
                    tercDst.address,
                    token_amount_dst,
                    eth_amount,
                    hashlock,
                    expectedSingleStepTime,
                    tolerantSingleStepTime,
                    earliestRefundTime,
                    srcChainId,
                    srcTransferId,
                    agreementReachedTime,
                    { value: eth_amount },
                );

            await time.setNextBlockTimestamp(
                agreementReachedTime + 3 * expectedSingleStepTime + 1 * tolerantSingleStepTime + 1,
            );
            await expect(
                otmoic
                    .connect(nonLp)
                    .confirmTransferIn(
                        lp.address,
                        user.address,
                        tercDst.address,
                        token_amount_dst,
                        eth_amount,
                        hashlock,
                        expectedSingleStepTime,
                        tolerantSingleStepTime,
                        earliestRefundTime,
                        preimage,
                        agreementReachedTime,
                    ),
            ).to.be.emit(otmoic, "LogTransferInConfirmed");

            await time.setNextBlockTimestamp(
                agreementReachedTime + 3 * expectedSingleStepTime + 2 * tolerantSingleStepTime + 1,
            );
            await expect(
                otmoic
                    .connect(nonUser)
                    .confirmTransferOut(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        eth_amount,
                        hashlock,
                        expectedSingleStepTime,
                        tolerantSingleStepTime,
                        earliestRefundTime,
                        preimage,
                        agreementReachedTime,
                    ),
            ).to.be.emit(otmoic, "LogTransferOutConfirmed");
        });

        it("refundTransferOut timelock and refundTransferIn timelock", async function () {
            const { otmoic, owner, user, lp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = "1000000000000000000";
            let token_amount_dst = "1000000000000000";
            let eth_amount = "0";

            let srcTransferId = new Array(32).fill(3);
            let preimage = new Array(32).fill(2);
            let agreementReachedTime = await time.latest();
            let expectedSingleStepTime = 60;
            let tolerantSingleStepTime = 120;
            let earliestRefundTime = agreementReachedTime + 3 * expectedSingleStepTime + 3 * tolerantSingleStepTime + 1;
            let srcChainId = "60";
            let dstChainId = "60";
            let bidId = ethers.utils.formatBytes32String("1");

            let hashlock = ethers.utils.keccak256(ethers.utils.solidityPack(["bytes32"], [preimage]));

            await tercSrc.transfer(user.address, token_amount_src);
            await tercDst.transfer(lp.address, token_amount_dst);

            await tercSrc.connect(user).approve(otmoic.address, token_amount_src);

            await otmoic
                .connect(user)
                .transferOut(
                    user.address,
                    lp.address,
                    tercSrc.address,
                    token_amount_src,
                    hashlock,
                    expectedSingleStepTime,
                    tolerantSingleStepTime,
                    earliestRefundTime,
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
                );

            await tercDst.connect(lp).approve(otmoic.address, token_amount_dst);
            await otmoic
                .connect(lp)
                .transferIn(
                    lp.address,
                    user.address,
                    tercDst.address,
                    token_amount_dst,
                    eth_amount,
                    hashlock,
                    expectedSingleStepTime,
                    tolerantSingleStepTime,
                    earliestRefundTime,
                    srcChainId,
                    srcTransferId,
                    agreementReachedTime,
                    { value: eth_amount },
                );

            await time.setNextBlockTimestamp(earliestRefundTime - 1);
            await expect(
                otmoic
                    .connect(user)
                    .refundTransferOut(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        eth_amount,
                        hashlock,
                        expectedSingleStepTime,
                        tolerantSingleStepTime,
                        earliestRefundTime,
                        agreementReachedTime,
                    ),
            )
                .to.be.revertedWithCustomError(otmoic, "NotUnlock")
                .withArgs("refund out", earliestRefundTime);

            await time.setNextBlockTimestamp(earliestRefundTime);
            await expect(
                otmoic
                    .connect(lp)
                    .refundTransferIn(
                        lp.address,
                        user.address,
                        tercDst.address,
                        token_amount_dst,
                        eth_amount,
                        hashlock,
                        expectedSingleStepTime,
                        tolerantSingleStepTime,
                        earliestRefundTime,
                        agreementReachedTime,
                    ),
            )
                .to.be.revertedWithCustomError(otmoic, "NotUnlock")
                .withArgs("refund in", earliestRefundTime);
        });

        it("invalid earliestRefundTime", async function () {
            const { otmoic, owner, user, lp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = "1000000000000000000";
            let token_amount_dst = "1000000000000000";
            let eth_amount = "0";

            let srcTransferId = new Array(32).fill(3);
            let preimage = new Array(32).fill(2);
            let agreementReachedTime = await time.latest();
            let expectedSingleStepTime = 60;
            let tolerantSingleStepTime = 120;
            let earliestRefundTime = agreementReachedTime + 3 * expectedSingleStepTime + 3 * tolerantSingleStepTime;
            let srcChainId = "60";
            let dstChainId = "60";
            let bidId = ethers.utils.formatBytes32String("1");

            let hashlock = ethers.utils.keccak256(ethers.utils.solidityPack(["bytes32"], [preimage]));

            await tercSrc.transfer(user.address, token_amount_src);
            await tercDst.transfer(lp.address, token_amount_dst);

            await tercSrc.connect(user).approve(otmoic.address, token_amount_src);

            await expect(
                otmoic
                    .connect(user)
                    .transferOut(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        hashlock,
                        expectedSingleStepTime,
                        tolerantSingleStepTime,
                        earliestRefundTime,
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
            ).to.be.revertedWithCustomError(otmoic, "InvalidRefundTime");
        });
    });
});
