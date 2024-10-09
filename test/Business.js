const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Otmoic", function () {
    async function deployOtmoic() {
        const [owner, otherAccount, user, lp] = await ethers.getSigners();

        const Otmoic = await hre.ethers.getContractFactory("Otmoic");
        const otmoic = await Otmoic.deploy();
        await otmoic.deployed();

        return { otmoic, owner, otherAccount, user, lp };
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

    describe("business", function () {
        describe("ERC20 -> ERC20", function () {
            it("TokenA(ERC20) -> TokenB(ERC20)", async function () {
                const { tercSrc } = await loadFixture(deployTestERC20Src);
                const { tercDst } = await loadFixture(deployTestERC20Dst);
                const { otmoic, owner, otherAccount, user, lp } = await loadFixture(deployOtmoic);

                Object.assign(cache, {
                    tercSrc,
                    tercDst,
                    otmoic,
                    owner,
                    otherAccount,
                    user,
                    lp,
                });

                let token_amount_src = "1000000000000000000";
                let token_amount_dst = "1000000000000000";
                let eth_amount = "0";

                let srcTransferId = new Array(32).fill(3);
                let preimage = new Array(32).fill(2);

                let agreementReachedTime = await time.latest();
                let expectedSingleStepTime = 60;
                let tolerantSingleStepTime = 120;
                let earliestRefundTime =
                    agreementReachedTime + 3 * expectedSingleStepTime + 3 * tolerantSingleStepTime + 1;
                let srcChainId = "60";
                let dstChainId = "60";
                let bidId = ethers.utils.formatBytes32String("1");

                let requestor = "did:requestor";
                let lpId = "did:lp";

                let userSign = "userSign";
                let lpSign = "lpSign";

                let hashlock = ethers.utils.keccak256(ethers.utils.solidityPack(["bytes32"], [preimage]));

                await expect(tercSrc.transfer(user.address, token_amount_src))
                    .to.emit(tercSrc, "Transfer")
                    .withArgs(owner.address, user.address, token_amount_src);

                await expect(tercDst.transfer(lp.address, token_amount_dst))
                    .to.emit(tercDst, "Transfer")
                    .withArgs(owner.address, lp.address, token_amount_dst);

                await expect(tercSrc.connect(user).approve(otmoic.address, token_amount_src));
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
                    .to.emit(tercSrc, "Transfer")
                    .withArgs(user.address, otmoic.address, token_amount_src);

                await expect(tercDst.connect(lp).approve(otmoic.address, token_amount_dst));
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
                    .to.emit(tercDst, "Transfer")
                    .withArgs(lp.address, otmoic.address, token_amount_dst);

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
                    .to.emit(tercSrc, "Transfer")
                    .withArgs(otmoic.address, lp.address, token_amount_src);

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
                    .to.emit(tercDst, "Transfer")
                    .withArgs(otmoic.address, user.address, token_amount_dst);
            });
        });

        describe("Native Token -> ERC20", function () {
            it("Native Token -> TokenB(ERC20)", async function () {
                const { tercSrc } = cache;
                const { tercDst } = cache;
                const { otmoic, owner, otherAccount, user, lp } = cache;

                let token_amount_src = "1000000000000000000";
                let token_amount_dst = "1000000000000000";

                let eth_amount = "0";

                let srcTransferId = new Array(32).fill(3);
                let preimage = new Array(32).fill(2);
                let agreementReachedTime = await time.latest();
                let expectedSingleStepTime = 60;
                let tolerantSingleStepTime = 120;
                let earliestRefundTime =
                    agreementReachedTime + 3 * expectedSingleStepTime + 3 * tolerantSingleStepTime + 1;
                let srcChainId = "60";
                let dstChainId = "60";
                let bidId = ethers.utils.formatBytes32String("2");
                let nativeTokenAddress = "0x0000000000000000000000000000000000000000";

                let hashlock = ethers.utils.keccak256(ethers.utils.solidityPack(["bytes32"], [preimage]));

                let requestor = "did:requestor";
                let lpId = "did:lp";

                let userSign = "userSign";
                let lpSign = "lpSign";

                await expect(tercDst.transfer(lp.address, token_amount_dst))
                    .to.emit(tercDst, "Transfer")
                    .withArgs(owner.address, lp.address, token_amount_dst);

                await expect(
                    otmoic
                        .connect(user)
                        .transferOut(
                            user.address,
                            lp.address,
                            nativeTokenAddress,
                            token_amount_src,
                            hashlock,
                            expectedSingleStepTime,
                            tolerantSingleStepTime,
                            earliestRefundTime,
                            dstChainId,
                            user.address,
                            bidId,
                            tercDst.address,
                            token_amount_dst,
                            eth_amount,
                            agreementReachedTime,
                            requestor,
                            lpId,
                            userSign,
                            lpSign,
                            {
                                value: token_amount_src,
                            },
                        ),
                )
                    .to.emit(otmoic, "LogNewTransferOut")
                    .and.changeEtherBalance(otmoic, token_amount_src);

                await expect(tercDst.connect(lp).approve(otmoic.address, token_amount_dst));
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
                    .to.emit(otmoic, "LogNewTransferIn")
                    .and.emit(tercDst, "Transfer")
                    .withArgs(lp.address, otmoic.address, token_amount_dst);

                await expect(
                    otmoic
                        .connect(user)
                        .confirmTransferOut(
                            user.address,
                            lp.address,
                            nativeTokenAddress,
                            token_amount_src,
                            eth_amount,
                            hashlock,
                            expectedSingleStepTime,
                            tolerantSingleStepTime,
                            earliestRefundTime,
                            preimage,
                            agreementReachedTime,
                        ),
                ).to.changeEtherBalance(lp, token_amount_src);

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
                    .to.emit(tercDst, "Transfer")
                    .withArgs(otmoic.address, user.address, token_amount_dst);
            });
        });

        describe("ERC20 -> Native Token", function () {
            it("TokenA(ERC20) -> Native Token", async function () {
                const { tercSrc } = cache;
                const { tercDst } = cache;
                const { otmoic, owner, otherAccount, user, lp } = cache;

                let token_amount_src = "1000000000000000000";
                let token_amount_dst = "1000000000000000";

                let eth_amount = "0";

                let srcTransferId = new Array(32).fill(3);
                let preimage = new Array(32).fill(2);
                let agreementReachedTime = await time.latest();
                let expectedSingleStepTime = 60;
                let tolerantSingleStepTime = 120;
                let earliestRefundTime =
                    agreementReachedTime + 3 * expectedSingleStepTime + 3 * tolerantSingleStepTime + 1;
                let srcChainId = "60";
                let dstChainId = "60";
                let bidId = ethers.utils.formatBytes32String("3");
                let nativeTokenAddress = "0x0000000000000000000000000000000000000000";

                let hashlock = ethers.utils.keccak256(ethers.utils.solidityPack(["bytes32"], [preimage]));

                let requestor = "did:requestor";
                let lpId = "did:lp";

                let userSign = "userSign";
                let lpSign = "lpSign";

                await expect(tercSrc.transfer(user.address, token_amount_src))
                    .to.emit(tercSrc, "Transfer")
                    .withArgs(owner.address, user.address, token_amount_src);

                await expect(tercSrc.connect(user).approve(otmoic.address, token_amount_src));
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
                            user.address,
                            bidId,
                            nativeTokenAddress,
                            token_amount_dst,
                            eth_amount,
                            agreementReachedTime,
                            requestor,
                            lpId,
                            userSign,
                            lpSign,
                        ),
                )
                    .to.emit(otmoic, "LogNewTransferOut")
                    .and.emit(tercSrc, "Transfer")
                    .withArgs(user.address, otmoic.address, token_amount_src);

                await expect(
                    otmoic
                        .connect(lp)
                        .transferIn(
                            lp.address,
                            user.address,
                            nativeTokenAddress,
                            token_amount_dst,
                            eth_amount,
                            hashlock,
                            expectedSingleStepTime,
                            tolerantSingleStepTime,
                            earliestRefundTime,
                            srcChainId,
                            srcTransferId,
                            agreementReachedTime,
                            { value: token_amount_dst },
                        ),
                )
                    .to.emit(otmoic, "LogNewTransferIn")
                    .and.changeEtherBalance(otmoic, token_amount_dst);

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
                    .to.emit(tercSrc, "Transfer")
                    .withArgs(otmoic.address, lp.address, token_amount_src);

                await expect(
                    otmoic
                        .connect(lp)
                        .confirmTransferIn(
                            lp.address,
                            user.address,
                            nativeTokenAddress,
                            token_amount_dst,
                            eth_amount,
                            hashlock,
                            expectedSingleStepTime,
                            tolerantSingleStepTime,
                            earliestRefundTime,
                            preimage,
                            agreementReachedTime,
                        ),
                ).to.changeEtherBalance(user, token_amount_dst);
            });
        });
    });
});
