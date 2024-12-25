const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OtmoicSwap contract", function () {
    async function deployOtmoicSwap() {
        const [owner, otherAccount, user, lp] = await ethers.getSigners();

        const OtmoicSwap = await ethers.getContractFactory("OtmoicSwap");
        const otmoicSwap = await OtmoicSwap.deploy();
        await otmoicSwap.deployed();

        return { otmoicSwap, owner, otherAccount, user, lp };
    }
    async function deployTestERC20Src() {
        const [owner, otherAccount] = await ethers.getSigners();

        const initialSupply = "10000000000000000000000";

        const TestERC20 = await ethers.getContractFactory("TestERC20Src");
        const tercSrc = await TestERC20.deploy(initialSupply);
        await tercSrc.deployed();

        return { tercSrc, owner, otherAccount, initialSupply };
    }
    async function deployTestERC20Dst() {
        const [owner, otherAccount] = await ethers.getSigners();

        const initialSupply = "10000000000000000000000";

        const TestERC20 = await ethers.getContractFactory("TestERC20Dst");
        const tercDst = await TestERC20.deploy(initialSupply);
        await tercDst.deployed();

        return { tercDst, owner, otherAccount, initialSupply };
    }

    let cache = {};

    describe("Business", function () {
        describe("ERC20 -> ERC20", function () {
            it("TokenA(ERC20) -> TokenB(ERC20)", async function () {
                const { tercSrc } = await loadFixture(deployTestERC20Src);
                const { tercDst } = await loadFixture(deployTestERC20Dst);
                const { otmoicSwap, owner, otherAccount, user, lp } = await loadFixture(deployOtmoicSwap);

                Object.assign(cache, {
                    tercSrc,
                    tercDst,
                    otmoicSwap,
                    owner,
                    otherAccount,
                    user,
                    lp,
                });

                let token_amount_src = "1000000000000000000";
                let token_amount_dst = "1000000000000000";

                let agreementReachedTime = await time.latest();
                let stepTime = 60;

                let bidId = ethers.utils.formatBytes32String("1");

                let requestor = "did:requestor";
                let lpId = "did:lp";

                let userSign = "userSign";
                let lpSign = "lpSign";

                await expect(tercSrc.transfer(user.address, token_amount_src))
                    .to.emit(tercSrc, "Transfer")
                    .withArgs(owner.address, user.address, token_amount_src);

                await expect(tercDst.transfer(lp.address, token_amount_dst))
                    .to.emit(tercDst, "Transfer")
                    .withArgs(owner.address, lp.address, token_amount_dst);

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
                )
                    .to.emit(tercSrc, "Transfer")
                    .withArgs(user.address, otmoicSwap.address, token_amount_src)
                    .and.emit(otmoicSwap, "LogSwapSubmitted")
                    .withArgs(
                        anyValue,
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
                    );

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
                    .to.emit(tercDst, "Transfer")
                    .withArgs(lp.address, user.address, token_amount_dst)
                    .and.emit(tercSrc, "Transfer")
                    .withArgs(otmoicSwap.address, lp.address, token_amount_src)
                    .and.emit(otmoicSwap, "LogSwapConfirmed")
                    .withArgs(anyValue);
            });

            it("RefundSwap", async function () {
                const { tercSrc } = cache;
                const { tercDst } = cache;
                const { otmoicSwap, owner, otherAccount, user, lp } = cache;

                let token_amount_src = "1000000000000000000";
                let token_amount_dst = "1000000000000000";

                let agreementReachedTime = await time.latest();
                let stepTime = 60;

                let bidId = ethers.utils.formatBytes32String("1");

                let requestor = "did:requestor";
                let lpId = "did:lp";

                let userSign = "userSign";
                let lpSign = "lpSign";

                await expect(tercSrc.transfer(user.address, token_amount_src))
                    .to.emit(tercSrc, "Transfer")
                    .withArgs(owner.address, user.address, token_amount_src);

                await expect(tercDst.transfer(lp.address, token_amount_dst))
                    .to.emit(tercDst, "Transfer")
                    .withArgs(owner.address, lp.address, token_amount_dst);

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
                )
                    .to.emit(tercSrc, "Transfer")
                    .withArgs(user.address, otmoicSwap.address, token_amount_src)
                    .and.emit(otmoicSwap, "LogSwapSubmitted")
                    .withArgs(
                        anyValue,
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
                    );

                await time.setNextBlockTimestamp(agreementReachedTime + 2 * stepTime + 1);
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
                    .to.emit(otmoicSwap, "LogSwapRefunded")
                    .withArgs(anyValue)
                    .and.emit(tercSrc, "Transfer")
                    .withArgs(otmoicSwap.address, user.address, token_amount_src);
            });
        });

        describe("Native Token -> ERC20", function () {
            it("Native Token -> TokenB(ERC20)", async function () {
                const { tercSrc } = cache;
                const { tercDst } = cache;
                const { otmoicSwap, owner, otherAccount, user, lp } = cache;

                let nativeTokenAddress = "0x0000000000000000000000000000000000000000";

                let token_amount_src = "1000000000000000000";
                let token_amount_dst = "1000000000000000";

                let agreementReachedTime = await time.latest();
                let stepTime = 60;

                let bidId = ethers.utils.formatBytes32String("2");

                let requestor = "did:requestor";
                let lpId = "did:lp";

                let userSign = "userSign";
                let lpSign = "lpSign";

                await expect(tercDst.transfer(lp.address, token_amount_dst))
                    .to.emit(tercDst, "Transfer")
                    .withArgs(owner.address, lp.address, token_amount_dst);

                await expect(
                    otmoicSwap
                        .connect(user)
                        .submitSwap(
                            user.address,
                            lp.address,
                            nativeTokenAddress,
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
                            {
                                value: token_amount_src,
                            },
                        ),
                )
                    .to.emit(otmoicSwap, "LogSwapSubmitted")
                    .withArgs(
                        anyValue,
                        user.address,
                        lp.address,
                        nativeTokenAddress,
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
                    )
                    .and.changeEtherBalance(otmoicSwap, token_amount_src);

                await tercDst.connect(lp).approve(otmoicSwap.address, token_amount_dst);
                await expect(
                    otmoicSwap
                        .connect(lp)
                        .confirmSwap(
                            user.address,
                            lp.address,
                            nativeTokenAddress,
                            token_amount_src,
                            tercDst.address,
                            token_amount_dst,
                            stepTime,
                            agreementReachedTime,
                        ),
                )
                    .to.emit(otmoicSwap, "LogSwapConfirmed")
                    .withArgs(anyValue)
                    .and.emit(tercDst, "Transfer")
                    .withArgs(lp.address, user.address, token_amount_dst)
                    .and.changeEtherBalance(lp.address, token_amount_src);
            });

            it("RefundSwap", async function () {
                const { tercSrc } = cache;
                const { tercDst } = cache;
                const { otmoicSwap, owner, otherAccount, user, lp } = cache;

                let nativeTokenAddress = "0x0000000000000000000000000000000000000000";

                let token_amount_src = "1000000000000000000";
                let token_amount_dst = "1000000000000000";

                let agreementReachedTime = await time.latest();
                let stepTime = 60;

                let bidId = ethers.utils.formatBytes32String("2");

                let requestor = "did:requestor";
                let lpId = "did:lp";

                let userSign = "userSign";
                let lpSign = "lpSign";

                await expect(tercDst.transfer(lp.address, token_amount_dst))
                    .to.emit(tercDst, "Transfer")
                    .withArgs(owner.address, lp.address, token_amount_dst);

                await expect(
                    otmoicSwap
                        .connect(user)
                        .submitSwap(
                            user.address,
                            lp.address,
                            nativeTokenAddress,
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
                            {
                                value: token_amount_src,
                            },
                        ),
                )
                    .to.emit(otmoicSwap, "LogSwapSubmitted")
                    .withArgs(
                        anyValue,
                        user.address,
                        lp.address,
                        nativeTokenAddress,
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
                    )
                    .and.changeEtherBalance(otmoicSwap, token_amount_src);

                await time.setNextBlockTimestamp(agreementReachedTime + 2 * stepTime + 1);
                await expect(
                    otmoicSwap
                        .connect(user)
                        .refundSwap(
                            user.address,
                            lp.address,
                            nativeTokenAddress,
                            token_amount_src,
                            tercDst.address,
                            token_amount_dst,
                            stepTime,
                            agreementReachedTime,
                        ),
                )
                    .to.emit(otmoicSwap, "LogSwapRefunded")
                    .withArgs(anyValue)
                    .and.changeEtherBalance(user.address, token_amount_src);
            });
        });

        describe("ERC20 -> Native Token", function () {
            it("TokenA(ERC20) -> Native Token", async function () {
                const { tercSrc } = cache;
                const { tercDst } = cache;
                const { otmoicSwap, owner, otherAccount, user, lp } = cache;

                let nativeTokenAddress = "0x0000000000000000000000000000000000000000";

                let token_amount_src = "1000000000000000000";
                let token_amount_dst = "1000000000000000";

                let agreementReachedTime = await time.latest();
                let stepTime = 60;

                let bidId = ethers.utils.formatBytes32String("3");

                let requestor = "did:requestor";
                let lpId = "did:lp";

                let userSign = "userSign";
                let lpSign = "lpSign";

                await expect(tercSrc.transfer(user.address, token_amount_src))
                    .to.emit(tercSrc, "Transfer")
                    .withArgs(owner.address, user.address, token_amount_src);

                await tercSrc.connect(user).approve(otmoicSwap.address, token_amount_src);
                await expect(
                    otmoicSwap
                        .connect(user)
                        .submitSwap(
                            user.address,
                            lp.address,
                            tercSrc.address,
                            token_amount_src,
                            nativeTokenAddress,
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
                    .to.emit(otmoicSwap, "LogSwapSubmitted")
                    .withArgs(
                        anyValue,
                        user.address,
                        lp.address,
                        tercSrc.address,
                        token_amount_src,
                        nativeTokenAddress,
                        token_amount_dst,
                        stepTime,
                        agreementReachedTime,
                        bidId,
                        requestor,
                        lpId,
                        userSign,
                        lpSign,
                    )
                    .and.emit(tercSrc, "Transfer")
                    .withArgs(user.address, otmoicSwap.address, token_amount_src);

                await expect(
                    otmoicSwap
                        .connect(lp)
                        .confirmSwap(
                            user.address,
                            lp.address,
                            tercSrc.address,
                            token_amount_src,
                            nativeTokenAddress,
                            token_amount_dst,
                            stepTime,
                            agreementReachedTime,
                            { value: token_amount_dst },
                        ),
                )
                    .to.emit(otmoicSwap, "LogSwapConfirmed")
                    .withArgs(anyValue)
                    .and.changeEtherBalance(user.address, token_amount_dst)
                    .and.emit(tercSrc, "Transfer")
                    .withArgs(otmoicSwap.address, lp.address, token_amount_src);
            });
        });
    });
});
