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

                let hashlock = ethers.utils.keccak256(ethers.utils.solidityPack(["bytes32"], [preimage]));
                let relayHashlock = ethers.utils.keccak256(ethers.utils.solidityPack(["bytes32"], [relayPreimage]));

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
                            stepTimelock,
                            srcChainId,
                            srcTransferId,
                            agreementReachedTime,
                            { value: eth_amount },
                        ),
                )
                    .to.emit(tercDst, "Transfer")
                    .withArgs(lp.address, otmoic.address, token_amount_dst);

                await expect(
                    otmoic.connect(user).confirmTransferOut(
                        user.address, // address _sender,
                        lp.address, // address _receiver,
                        tercSrc.address, // address _token,
                        token_amount_src, // uint256 _token_amount,
                        eth_amount, // uint256 _eth_amount,
                        hashlock, // bytes32 _hashlock,
                        relayHashlock, // bytes32 _relayHashlock,
                        stepTimelock, // uint64 _stepTimelock,
                        preimage, // bytes32 _preimage,
                        relayPreimage, // bytes32 _relayPreimage,
                        agreementReachedTime, // uint64 _agreementReachedTime
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
                            stepTimelock,
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
                let relayPreimage = new Array(32).fill(3);
                let agreementReachedTime = await time.latest();
                let stepTimelock = 60;
                let srcChainId = "60";
                let dstChainId = "60";
                let bidId = ethers.utils.formatBytes32String("2");
                let nativeTokenAddress = "0x0000000000000000000000000000000000000000";

                let hashlock = ethers.utils.keccak256(ethers.utils.solidityPack(["bytes32"], [preimage]));
                let relayHashlock = ethers.utils.keccak256(ethers.utils.solidityPack(["bytes32"], [relayPreimage]));

                let requestor = "did:requestor";
                let lpId = "did:lp";

                let userSign = "userSign";
                let lpSign = "lpSign";

                await expect(tercDst.transfer(lp.address, token_amount_dst))
                    .to.emit(tercDst, "Transfer")
                    .withArgs(owner.address, lp.address, token_amount_dst);

                await expect(
                    otmoic.connect(user).transferOut(
                        user.address, // address _sender,
                        lp.address, // address _bridge,
                        nativeTokenAddress, // address _token,
                        token_amount_src, // uint256 _amount,
                        hashlock, // bytes32 _hashlock,
                        relayHashlock, // bytes32 _relayHashlock,
                        stepTimelock, // uint64 _stepTimelock,
                        dstChainId, // uint64 _dstChainId,
                        user.address, // address _dstAddress,
                        bidId, // bytes32 _bidId,
                        tercDst.address, // uint256 _tokenDst,
                        token_amount_dst, // uint256 _amountDst,
                        eth_amount, // uint256 _nativeAmountDst,
                        agreementReachedTime, // uint64 _agreementReachedTime,
                        requestor, // string calldata _requestor,
                        lpId, // string calldata _lpId,
                        userSign, // string calldata _userSign,
                        lpSign, // string calldata _lpSign
                        {
                            value: token_amount_src,
                        },
                    ),
                )
                    .to.emit(otmoic, "LogNewTransferOut")
                    .and.changeEtherBalance(otmoic, token_amount_src);

                await expect(tercDst.connect(lp).approve(otmoic.address, token_amount_dst));
                await expect(
                    otmoic.connect(lp).transferIn(
                        lp.address, // address _sender,
                        user.address, // address _dstAddress,
                        tercDst.address, // address _token,
                        token_amount_dst, // uint256 _token_amount,
                        eth_amount, // uint256 _eth_amount,
                        hashlock, // bytes32 _hashlock,
                        stepTimelock, // uint64 _stepTimelock,
                        srcChainId, // uint64 _srcChainId,
                        srcTransferId, // bytes32 _srcTransferId,
                        agreementReachedTime, // uint64 _agreementReachedTime
                        { value: eth_amount },
                    ),
                )
                    .to.emit(otmoic, "LogNewTransferIn")
                    .and.emit(tercDst, "Transfer")
                    .withArgs(lp.address, otmoic.address, token_amount_dst);

                await expect(
                    otmoic.connect(user).confirmTransferOut(
                        user.address, // address _sender,
                        lp.address, // address _receiver,
                        nativeTokenAddress, // address _token,
                        token_amount_src, // uint256 _token_amount,
                        eth_amount, // uint256 _eth_amount,
                        hashlock, // bytes32 _hashlock,
                        relayHashlock, // bytes32 _relayHashlock,
                        stepTimelock, // uint64 _stepTimelock,
                        preimage, // bytes32 _preimage,
                        relayPreimage, // bytes32 _relayPreimage,
                        agreementReachedTime, // uint64 _agreementReachedTime
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
                            stepTimelock,
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
                let relayPreimage = new Array(32).fill(3);
                let agreementReachedTime = await time.latest();
                let stepTimelock = 60;
                let srcChainId = "60";
                let dstChainId = "60";
                let bidId = ethers.utils.formatBytes32String("3");
                let nativeTokenAddress = "0x0000000000000000000000000000000000000000";

                let hashlock = ethers.utils.keccak256(ethers.utils.solidityPack(["bytes32"], [preimage]));
                let relayHashlock = ethers.utils.keccak256(ethers.utils.solidityPack(["bytes32"], [relayPreimage]));

                let requestor = "did:requestor";
                let lpId = "did:lp";

                let userSign = "userSign";
                let lpSign = "lpSign";

                await expect(tercSrc.transfer(user.address, token_amount_src))
                    .to.emit(tercSrc, "Transfer")
                    .withArgs(owner.address, user.address, token_amount_src);

                await expect(tercSrc.connect(user).approve(otmoic.address, token_amount_src));
                await expect(
                    otmoic.connect(user).transferOut(
                        user.address, // address _sender,
                        lp.address, // address _bridge,
                        tercSrc.address, // address _token,
                        token_amount_src, // uint256 _amount,
                        hashlock, // bytes32 _hashlock,
                        relayHashlock, // bytes32 _relayHashlock,
                        stepTimelock, // uint64 _stepTimelock,
                        dstChainId, // uint64 _dstChainId,
                        user.address, // address _dstAddress,
                        bidId, // bytes32 _bidId,
                        nativeTokenAddress, // uint256 _tokenDst,
                        token_amount_dst, // uint256 _amountDst,
                        eth_amount, // uint256 _nativeAmountDst,
                        agreementReachedTime, // uint64 _agreementReachedTime,
                        requestor, // string calldata _requestor,
                        lpId, // string calldata _lpId,
                        userSign, // string calldata _userSign,
                        lpSign, // string calldata _lpSign
                    ),
                )
                    .to.emit(otmoic, "LogNewTransferOut")
                    .and.emit(tercSrc, "Transfer")
                    .withArgs(user.address, otmoic.address, token_amount_src);

                await expect(
                    otmoic.connect(lp).transferIn(
                        lp.address, // address _sender,
                        user.address, // address _dstAddress,
                        nativeTokenAddress, // address _token,
                        token_amount_dst, // uint256 _token_amount,
                        eth_amount, // uint256 _eth_amount,
                        hashlock, // bytes32 _hashlock,
                        stepTimelock, // uint64 _stepTimelock,
                        srcChainId, // uint64 _srcChainId,
                        srcTransferId, // bytes32 _srcTransferId,
                        agreementReachedTime, // uint64 _agreementReachedTime
                        { value: token_amount_dst },
                    ),
                )
                    .to.emit(otmoic, "LogNewTransferIn")
                    .and.changeEtherBalance(otmoic, token_amount_dst);

                await expect(
                    otmoic.connect(user).confirmTransferOut(
                        user.address, // address _sender,
                        lp.address, // address _receiver,
                        tercSrc.address, // address _token,
                        token_amount_src, // uint256 _token_amount,
                        eth_amount, // uint256 _eth_amount,
                        hashlock, // bytes32 _hashlock,
                        relayHashlock, // bytes32 _relayHashlock,
                        stepTimelock, // uint64 _stepTimelock,
                        preimage, // bytes32 _preimage,
                        relayPreimage, // bytes32 _relayPreimage,
                        agreementReachedTime, // uint64 _agreementReachedTime
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
                            stepTimelock,
                            preimage,
                            agreementReachedTime,
                        ),
                ).to.changeEtherBalance(user, token_amount_dst);
            });
        });
    });
});
