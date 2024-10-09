const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Otmoic", function () {
    async function deploy() {
        const [owner, otherAccount, user, lp] = await ethers.getSigners();

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
            otherAccount,
            user,
            lp,
            tercSrc,
            tercDst,
            initialSupply,
        };
    }

    describe("event", function () {
        describe("in", function () {
            it("Should emit an event on transferIn and confirmTransferIn", async function () {
                const { otmoic, owner, otherAccount, tercSrc } = await loadFixture(deploy);

                let agreementReachedTime = await time.latest();
                let stepTimelock = 60;
                let srcChainId = "60";
                let srcTransferId = new Array(32).fill(3);

                let token_amount = "1000000000000000000";
                let eth_amount = "100000000000000000";

                let preimage = ethers.utils.solidityPack(["bytes32"], [new Array(32).fill(2)]);
                let hashlock = ethers.utils.keccak256(preimage);

                // console.log('otmoic address:', otmoic.address)
                // console.log('tercSrc address:', tercSrc.address)

                await expect(tercSrc.approve(otmoic.address, token_amount));

                await expect(
                    otmoic.transferIn(
                        owner.address, // address _sender,
                        otherAccount.address, // address _dstAddress,
                        tercSrc.address, // address _token,
                        token_amount, // uint256 _token_amount,
                        eth_amount, // uint256 _eth_amount,
                        hashlock, // bytes32 _hashlock,
                        stepTimelock, // uint64 _stepTimelock,
                        srcChainId, // uint64 _srcChainId,
                        srcTransferId, // bytes32 _srcTransferId
                        agreementReachedTime, // uint64 _agreementReachedTime
                        { value: eth_amount },
                    ),
                )
                    .to.emit(otmoic, "LogNewTransferIn")
                    .withArgs(
                        anyValue, // bytes32 transferId,
                        owner.address, // address sender,
                        otherAccount.address, // address receiver,
                        tercSrc.address, // address token,
                        token_amount, // uint256 token_amount,
                        eth_amount, // uint256 eth_amount,
                        anyValue, // bytes32 hashlock, // hash of the preimage
                        stepTimelock, // uint64 stepTimelock, // lock timestamp = agreementReachedTime + 2 * stepTimelock
                        srcChainId, // uint64 srcChainId,
                        anyValue, // bytes32 srcTransferId // outbound transferId at src chain
                        agreementReachedTime, // uint64 agreementReachedTime
                    );

                await expect(
                    otmoic.confirmTransferIn(
                        owner.address, // address _sender,
                        otherAccount.address, // address _receiver,
                        tercSrc.address, // address _token,
                        token_amount, // uint256 _token_amount,
                        eth_amount, // uint256 _eth_amount,
                        hashlock, // bytes32 _hashlock,
                        stepTimelock, // uint64 _stepTimelock,
                        preimage, // bytes32 _preimage,
                        agreementReachedTime, // uint64 _agreementReachedTime
                    ),
                )
                    .to.emit(otmoic, "LogTransferInConfirmed")
                    .withArgs(
                        anyValue, // transferId
                        preimage, // preimage
                    );
            });

            it("Should emit an event on transferIn and refundTransferIn", async function () {
                const { otmoic, owner, otherAccount, tercSrc } = await loadFixture(deploy);

                let agreementReachedTime = await time.latest();
                let stepTimelock = 60;
                let srcChainId = "60";
                let srcTransferId = new Array(32).fill(3);

                let token_amount = "1000000000000000000";
                let eth_amount = "100000000000000000";

                let preimage = ethers.utils.solidityPack(["bytes32"], [new Array(32).fill(2)]);
                let hashlock = ethers.utils.keccak256(preimage);

                // console.log('otmoic address:', otmoic.address)
                // console.log('tercSrc address:', tercSrc.address)

                await expect(tercSrc.approve(otmoic.address, token_amount));

                await expect(
                    otmoic.transferIn(
                        owner.address, // address _sender,
                        otherAccount.address, // address _dstAddress,
                        tercSrc.address, // address _token,
                        token_amount, // uint256 _token_amount,
                        eth_amount, // uint256 _eth_amount,
                        hashlock, // bytes32 _hashlock,
                        stepTimelock, // uint64 _stepTimelock,
                        srcChainId, // uint64 _srcChainId,
                        srcTransferId, // bytes32 _srcTransferId
                        agreementReachedTime, // uint64 _agreementReachedTime
                        { value: eth_amount },
                    ),
                )
                    .to.emit(otmoic, "LogNewTransferIn")
                    .withArgs(
                        anyValue, // bytes32 transferId,
                        owner.address, // address sender,
                        otherAccount.address, // address receiver,
                        tercSrc.address, // address token,
                        token_amount, // uint256 token_amount,
                        eth_amount, // uint256 eth_amount,
                        anyValue, // bytes32 hashlock, // hash of the preimage
                        stepTimelock, // uint64 stepTimelock, // lock timestamp = agreementReachedTime + 2 * stepTimelock
                        srcChainId, // uint64 srcChainId,
                        anyValue, // bytes32 srcTransferId // outbound transferId at src chain
                        agreementReachedTime, // uint64 agreementReachedTime
                    );

                await time.setNextBlockTimestamp(agreementReachedTime + 7 * stepTimelock + 1);
                await expect(
                    otmoic.refundTransferIn(
                        owner.address, // address _sender,
                        otherAccount.address, // address _receiver,
                        tercSrc.address, // address _token,
                        token_amount, // uint256 _token_amount,
                        eth_amount, // uint256 _eth_amount,
                        hashlock, // bytes32 _hashlock,
                        stepTimelock, // uint64 _stepTimelock,
                        agreementReachedTime, // uint64 _agreementReachedTime
                    ),
                )
                    .to.emit(otmoic, "LogTransferInRefunded")
                    .withArgs(
                        anyValue, // transferId
                    );
            });
        });

        describe("out", function () {
            let requestor = "did:requestor";
            let lpId = "did:lp";

            let userSign = "userSign";
            let lpSign = "lpSign";

            it("Should emit an event on transferOut and confirmTransferOut", async function () {
                const { otmoic, owner, otherAccount, tercSrc, tercDst } = await loadFixture(deploy);

                const ownerBalance = await tercDst.balanceOf(owner.address);
                // console.log(ownerBalance)

                let token_amount = "1000000000000000000";
                let token_amount_dst = "1000000000000000";

                let agreementReachedTime = await time.latest();
                let stepTimelock = 60;
                let dstChainId = "60";
                let bidId = ethers.utils.formatBytes32String("1");
                let eth_amount = "0";
                let preimage = ethers.utils.solidityPack(["bytes32"], [new Array(32).fill(2)]);
                let hashlock = ethers.utils.keccak256(preimage);

                let relayPreimage = ethers.utils.solidityPack(["bytes32"], [new Array(32).fill(3)]);
                let relayHashlock = ethers.utils.keccak256(relayPreimage);

                await expect(tercSrc.approve(otmoic.address, token_amount));

                await expect(
                    otmoic.transferOut(
                        owner.address, // address _sender,
                        otherAccount.address, // address _bridge,
                        tercSrc.address, // address _token,
                        token_amount, // uint256 _amount,
                        hashlock, // bytes32 _hashlock,
                        relayHashlock, // bytes32 _relayHashlock,
                        stepTimelock, // uint64 _stepTimelock,
                        dstChainId, // uint64 _dstChainId,
                        owner.address, // address _dstAddress,
                        bidId, // bytes32 _bidId,
                        tercDst.address, // uint256 _tokenDst,
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
                    .withArgs(
                        anyValue, // bytes32 transferId,
                        owner.address, // address sender,
                        otherAccount.address, // address receiver,
                        tercSrc.address, // address token,
                        token_amount, // uint256 amount,
                        anyValue, // bytes32 hashlock, // hash of the preimage
                        anyValue, // bytes32 relayHashlock, // hash of the relayPreimage
                        stepTimelock, // uint64 stepTimelock, // lock timestamp = agreementReachedTime + 1 * stepTimelock
                        dstChainId, // uint64 dstChainId,
                        owner.address, // address dstAddress,
                        bidId, // bytes32 bidId,
                        tercDst.address, // uint256 tokenDst,
                        token_amount_dst, // uint256 amountDst,
                        eth_amount, // uint256 nativeAmountDst,
                        agreementReachedTime, // uint64 agreementReachedTime,
                        requestor, // string requestor,
                        lpId, // string lpId,
                        userSign, // string userSign,
                        lpSign, // string lpSign
                    );

                await expect(
                    otmoic.confirmTransferOut(
                        owner.address, // address _sender,
                        otherAccount.address, // address _receiver,
                        tercSrc.address, // address _token,
                        token_amount, // uint256 _token_amount,
                        eth_amount, // uint256 _eth_amount,
                        hashlock, // bytes32 _hashlock,
                        relayHashlock, // bytes32 _relayHashlock,
                        stepTimelock, // uint64 _stepTimelock,
                        preimage, // bytes32 _preimage,
                        relayPreimage, // bytes32 _relayPreimage,
                        agreementReachedTime, // uint64 _agreementReachedTime
                    ),
                )
                    .to.emit(otmoic, "LogTransferOutConfirmed")
                    .withArgs(
                        anyValue, // transferId
                        preimage, // preimage
                    );
            });

            it("Should emit an event on transferOut and refundTransferOut", async function () {
                const { otmoic, owner, otherAccount, tercSrc, tercDst } = await loadFixture(deploy);

                const ownerBalance = await tercDst.balanceOf(owner.address);
                // console.log(ownerBalance)

                let token_amount = "1000000000000000000";
                let token_amount_dst = "1000000000000000";

                let agreementReachedTime = await time.latest();
                let stepTimelock = 60;
                let dstChainId = "60";
                let bidId = ethers.utils.formatBytes32String("1");
                let eth_amount = "0";
                let preimage = ethers.utils.solidityPack(["bytes32"], [new Array(32).fill(2)]);
                let hashlock = ethers.utils.keccak256(preimage);

                let relayPreimage = ethers.utils.solidityPack(["bytes32"], [new Array(32).fill(3)]);
                let relayHashlock = ethers.utils.keccak256(relayPreimage);

                await expect(tercSrc.approve(otmoic.address, token_amount));

                await expect(
                    otmoic.transferOut(
                        owner.address, // address _sender,
                        otherAccount.address, // address _bridge,
                        tercSrc.address, // address _token,
                        token_amount, // uint256 _amount,
                        hashlock, // bytes32 _hashlock,
                        relayHashlock, // bytes32 _relayHashlock,
                        stepTimelock, // uint64 _stepTimelock,
                        dstChainId, // uint64 _dstChainId,
                        owner.address, // address _dstAddress,
                        bidId, // bytes32 _bidId,
                        tercDst.address, // uint256 _tokenDst,
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
                    .withArgs(
                        anyValue, // bytes32 transferId,
                        owner.address, // address sender,
                        otherAccount.address, // address receiver,
                        tercSrc.address, // address token,
                        token_amount, // uint256 amount,
                        anyValue, // bytes32 hashlock, // hash of the preimage
                        anyValue, // bytes32 relayHashlock, // hash of the relayPreimage
                        stepTimelock, // uint64 stepTimelock, // lock timestamp = agreementReachedTime + 1 * stepTimelock
                        dstChainId, // uint64 dstChainId,
                        owner.address, // address dstAddress,
                        bidId, // bytes32 bidId,
                        tercDst.address, // uint256 tokenDst,
                        token_amount_dst, // uint256 amountDst,
                        eth_amount, // uint256 nativeAmountDst,
                        agreementReachedTime, // uint64 agreementReachedTime,
                        requestor, // string requestor,
                        lpId, // string lpId,
                        userSign, // string userSign,
                        lpSign, // string lpSign
                    );

                await time.setNextBlockTimestamp(agreementReachedTime + 7 * stepTimelock + 1);
                await expect(
                    otmoic.refundTransferOut(
                        owner.address, // address _sender,
                        otherAccount.address, // address _receiver,
                        tercSrc.address, // address _token,
                        token_amount, // uint256 _token_amount,
                        eth_amount, // uint256 _eth_amount,
                        hashlock, // bytes32 _hashlock,
                        relayHashlock, // bytes32 _relayHashlock,
                        stepTimelock, // uint64 _stepTimelock,
                        agreementReachedTime, // uint64 _agreementReachedTime
                    ),
                )
                    .to.emit(otmoic, "LogTransferOutRefunded")
                    .withArgs(
                        anyValue, // transferId
                    );
            });
        });
    });
});
