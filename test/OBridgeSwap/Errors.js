const { time, loadFixture, reset } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("OtmoicSwap contract", function () {
    async function deploy() {
        const [owner, user, lp, nonUser, nonLp] = await ethers.getSigners();

        const OtmoicSwap = await hre.ethers.getContractFactory("OtmoicSwap");
        const otmoicSwap = await OtmoicSwap.deploy();
        await otmoicSwap.deployed();

        const initialSupply = "10000000000000000000000";

        const TestERC20Src = await hre.ethers.getContractFactory("TestERC20Src");
        const tercSrc = await TestERC20Src.deploy(initialSupply);
        await tercSrc.deployed();

        const TestERC20Dst = await hre.ethers.getContractFactory("TestERC20Dst");
        const tercDst = await TestERC20Dst.deploy(initialSupply);
        await tercDst.deployed();

        return {
            otmoicSwap,
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
        let bidId = ethers.utils.formatBytes32String("1");
        let requestor = "did:requestor";
        let lpId = "did:lp";

        let userSign = "userSign";
        let lpSign = "lpSign";

        it("invalid sender for submitSwap", async function () {
            const { otmoicSwap, owner, user, lp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = "1000000000000000000";
            let token_amount_dst = "1000000000000000";

            let agreementReachedTime = await time.latest();
            let stepTime = 60;

            await tercSrc.transfer(user.address, token_amount_src);
            await tercDst.transfer(lp.address, token_amount_dst);

            await tercSrc.connect(user).approve(otmoicSwap.address, token_amount_src);
            await expect(
                otmoicSwap
                    .connect(lp)
                    .submitSwap(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        tercDst.address,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                        bidId,
                        requestor,
                        lpId,
                        userSign,
                        lpSign,
                    ),
            ).to.be.revertedWithCustomError(otmoicSwap, "InvalidSender");
        });

        it("invalid amount for submitSwap", async function () {
            const { otmoicSwap, owner, user, lp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = "0";
            let token_amount_dst = "1000000000000000";

            let agreementReachedTime = await time.latest();
            let stepTime = 60;

            await tercSrc.transfer(user.address, token_amount_src);
            await tercDst.transfer(lp.address, token_amount_dst);

            await tercSrc.connect(user).approve(otmoicSwap.address, token_amount_src);
            await expect(
                otmoicSwap
                    .connect(user)
                    .submitSwap(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        tercDst.address,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                        bidId,
                        requestor,
                        lpId,
                        userSign,
                        lpSign,
                    ),
            ).to.be.revertedWithCustomError(otmoicSwap, "InvalidAmount");
        });

        it("submitSwap timelock", async function () {
            const { otmoicSwap, owner, user, lp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = "1000000000000000000";
            let token_amount_dst = "1000000000000000";

            let agreementReachedTime = await time.latest();
            let stepTime = 60;

            await tercSrc.transfer(user.address, token_amount_src);
            await tercDst.transfer(lp.address, token_amount_dst);

            await tercSrc.connect(user).approve(otmoicSwap.address, token_amount_src);
            await time.setNextBlockTimestamp(agreementReachedTime + 1 * stepTime + 1);
            await expect(
                otmoicSwap
                    .connect(user)
                    .submitSwap(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        tercDst.address,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                        bidId,
                        requestor,
                        lpId,
                        userSign,
                        lpSign,
                    ),
            )
                .to.be.revertedWithCustomError(otmoicSwap, "ExpiredOp")
                .withArgs("submitSwap", agreementReachedTime + 1 * stepTime);
        });

        it("invalid sender for confirmSwap", async function () {
            const { otmoicSwap, owner, user, lp, nonLp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = "1000000000000000000";
            let token_amount_dst = "1000000000000000";

            let agreementReachedTime = await time.latest();
            let stepTime = 60;

            await tercSrc.transfer(user.address, token_amount_src);
            await tercDst.transfer(lp.address, token_amount_dst);

            await tercSrc.connect(user).approve(otmoicSwap.address, token_amount_src);
            await expect(
                otmoicSwap
                    .connect(user)
                    .submitSwap(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        tercDst.address,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                        bidId,
                        requestor,
                        lpId,
                        userSign,
                        lpSign,
                    ),
            ).to.emit(otmoicSwap, "LogSwapSubmitted");

            await tercDst.connect(lp).approve(otmoicSwap.address, token_amount_dst);
            await expect(
                otmoicSwap
                    .connect(nonLp)
                    .confirmSwap(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        tercDst.address,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                    ),
            ).to.be.revertedWithCustomError(otmoicSwap, "InvalidSender");
        });

        it("confirmSwap timelock", async function () {
            const { otmoicSwap, owner, user, lp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = "1000000000000000000";
            let token_amount_dst = "1000000000000000";

            let agreementReachedTime = await time.latest();
            let stepTime = 60;

            await tercSrc.transfer(user.address, token_amount_src);
            await tercDst.transfer(lp.address, token_amount_dst);

            await tercSrc.connect(user).approve(otmoicSwap.address, token_amount_src);
            await expect(
                otmoicSwap
                    .connect(user)
                    .submitSwap(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        tercDst.address,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                        bidId,
                        requestor,
                        lpId,
                        userSign,
                        lpSign,
                    ),
            ).to.emit(otmoicSwap, "LogSwapSubmitted");

            await time.setNextBlockTimestamp(agreementReachedTime + 2 * stepTime + 1);

            await tercDst.connect(lp).approve(otmoicSwap.address, token_amount_dst);
            await expect(
                otmoicSwap
                    .connect(lp)
                    .confirmSwap(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        tercDst.address,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                    ),
            )
                .to.be.revertedWithCustomError(otmoicSwap, "ExpiredOp")
                .withArgs("confirmSwap", agreementReachedTime + 2 * stepTime);
        });

        it("fail to confirmSwap if no lp has no allowance to contract", async function () {
            const { otmoicSwap, owner, user, nonUser, lp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = "1000000000000000000";
            let token_amount_dst = "1000000000000000";

            let agreementReachedTime = await time.latest();
            let stepTime = 60;

            await tercSrc.transfer(user.address, token_amount_src);
            await tercDst.transfer(lp.address, token_amount_dst);

            await tercSrc.connect(user).approve(otmoicSwap.address, token_amount_src);
            await expect(
                otmoicSwap
                    .connect(user)
                    .submitSwap(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        tercDst.address,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                        bidId,
                        requestor,
                        lpId,
                        userSign,
                        lpSign,
                    ),
            ).to.emit(otmoicSwap, "LogSwapSubmitted");

            await expect(
                otmoicSwap
                    .connect(lp)
                    .confirmSwap(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        tercDst.address,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                    ),
            ).to.be.revertedWith("ERC20: insufficient allowance");
        });

        it("invalid swap status at confirmSwap", async function () {
            const { otmoicSwap, owner, user, nonUser, lp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = "1000000000000000000";
            let token_amount_dst = "1000000000000000";

            let agreementReachedTime = await time.latest();
            let stepTime = 60;

            await tercSrc.transfer(user.address, token_amount_src);
            await tercDst.transfer(lp.address, token_amount_dst);

            await tercSrc.connect(user).approve(otmoicSwap.address, token_amount_src);
            await expect(
                otmoicSwap
                    .connect(user)
                    .submitSwap(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        tercDst.address,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                        bidId,
                        requestor,
                        lpId,
                        userSign,
                        lpSign,
                    ),
            ).to.emit(otmoicSwap, "LogSwapSubmitted");

            let fake_token_amount_dst = "1000000";

            await tercDst.connect(lp).approve(otmoicSwap.address, token_amount_dst);
            await expect(
                otmoicSwap
                    .connect(lp)
                    .confirmSwap(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        tercDst.address,
                        fake_token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                    ),
            ).to.be.revertedWithCustomError(otmoicSwap, "InvalidStatus");

            await expect(
                otmoicSwap
                    .connect(lp)
                    .confirmSwap(
                        nonUser.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        tercDst.address,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                    ),
            ).to.be.revertedWithCustomError(otmoicSwap, "InvalidStatus");
        });

        it("refund timelock", async function () {
            const { otmoicSwap, owner, user, lp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = "1000000000000000000";
            let token_amount_dst = "1000000000000000";

            let agreementReachedTime = await time.latest();
            let stepTime = 60;

            await tercSrc.transfer(user.address, token_amount_src);
            await tercDst.transfer(lp.address, token_amount_dst);

            await tercSrc.connect(user).approve(otmoicSwap.address, token_amount_src);
            await expect(
                otmoicSwap
                    .connect(user)
                    .submitSwap(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        tercDst.address,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                        bidId,
                        requestor,
                        lpId,
                        userSign,
                        lpSign,
                    ),
            ).to.emit(otmoicSwap, "LogSwapSubmitted");

            await expect(
                otmoicSwap
                    .connect(user)
                    .refundSwap(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        tercDst.address,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                    ),
            )
                .to.be.revertedWithCustomError(otmoicSwap, "NotUnlock")
                .withArgs("refundSwap", agreementReachedTime + 2 * stepTime);
        });

        it("invalid swap status at refundSwap", async function () {
            const { otmoicSwap, owner, user, nonUser, lp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = "1000000000000000000";
            let token_amount_dst = "1000000000000000";

            let agreementReachedTime = await time.latest();
            let stepTime = 60;

            await tercSrc.transfer(user.address, token_amount_src);
            await tercDst.transfer(lp.address, token_amount_dst);

            await tercSrc.connect(user).approve(otmoicSwap.address, token_amount_src);
            await expect(
                otmoicSwap
                    .connect(user)
                    .submitSwap(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        tercDst.address,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                        bidId,
                        requestor,
                        lpId,
                        userSign,
                        lpSign,
                    ),
            ).to.emit(otmoicSwap, "LogSwapSubmitted");

            await time.setNextBlockTimestamp(agreementReachedTime + 2 * stepTime + 1);

            let fake_token_amount_src = "1000000";
            await expect(
                otmoicSwap
                    .connect(user)
                    .refundSwap(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        fake_token_amount_src,
                        tercDst.address,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                    ),
            ).to.be.revertedWithCustomError(otmoicSwap, "InvalidStatus");

            await expect(
                otmoicSwap
                    .connect(user)
                    .refundSwap(
                        nonUser.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        tercDst.address,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                    ),
            ).to.be.revertedWithCustomError(otmoicSwap, "InvalidStatus");
        });

        it("anyone can call refundSwap", async function () {
            const { otmoicSwap, owner, user, nonUser, lp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = "1000000000000000000";
            let token_amount_dst = "1000000000000000";

            let agreementReachedTime = await time.latest();
            let stepTime = 60;

            await tercSrc.transfer(user.address, token_amount_src);
            await tercDst.transfer(lp.address, token_amount_dst);

            await tercSrc.connect(user).approve(otmoicSwap.address, token_amount_src);
            await expect(
                otmoicSwap
                    .connect(user)
                    .submitSwap(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        tercDst.address,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                        bidId,
                        requestor,
                        lpId,
                        userSign,
                        lpSign,
                    ),
            ).to.emit(otmoicSwap, "LogSwapSubmitted");

            await time.setNextBlockTimestamp(agreementReachedTime + 2 * stepTime + 1);

            await expect(
                otmoicSwap
                    .connect(nonUser)
                    .refundSwap(
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        tercDst.address,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                    ),
            ).to.emit(otmoicSwap, "LogSwapRefunded");
        });
    });
});
