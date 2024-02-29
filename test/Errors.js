const {
    time,
    loadFixture,
    reset
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe('Otmoic', function () {

    async function deploy() {
        const [owner, otherAccount, user, lp] = await ethers.getSigners();

        const Otmoic = await hre.ethers.getContractFactory("Otmoic");
        const otmoic = await Otmoic.deploy()
        await otmoic.deployed();

        const initialSupply = '10000000000000000000000'

        const TestERC20Src = await hre.ethers.getContractFactory("TestERC20Src");
        const tercSrc = await TestERC20Src.deploy(initialSupply)
        await tercSrc.deployed();

        const TestERC20Dst = await hre.ethers.getContractFactory("TestERC20Dst");
        const tercDst = await TestERC20Dst.deploy(initialSupply)
        await tercDst.deployed();

        return { otmoic, owner, otherAccount, user, lp, tercSrc, initialSupply, tercDst }
    }

    describe('errors', async function () {

        let requestor = 'did:requestor'
        let lpId = 'did:lp'

        let userSign = 'userSign'
        let lpSign = 'lpSign'

        it('tranferOut timelock and transferIn timelock ', async function () {
            const { otmoic, owner, otherAccount, user, lp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = '1000000000000000000'
            let token_amount_dst = '1000000000000000'
            let eth_amount       = '0'

            let srcTransferId = new Array(32).fill(3)
            let preimage = new Array(32).fill(2)
            let relayPreimage = new Array(32).fill(3)
            let agreementReachedTime = await time.latest()
            let stepTimelock = 60
            let srcChainId = '60'
            let dstChainId = '60'
            let bidId = ethers.utils.formatBytes32String('1');

            let hashlock = ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32'], [preimage]))
            let relayHashlock = ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32'], [relayPreimage]))

            await tercSrc.transfer(user.address, token_amount_src)
            await tercDst.transfer(lp.address, token_amount_dst)

            await tercSrc.connect(user).approve(otmoic.address, token_amount_src)
            await time.setNextBlockTimestamp(agreementReachedTime + 1 * stepTimelock + 1)
            await expect(otmoic.connect(user).transferOut(
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
                lpSign
            ))
            .to.be.revertedWithCustomError(otmoic, "ExpiredOp")
            .withArgs("transfer out", agreementReachedTime + 1 * stepTimelock);

            await tercDst.connect(lp).approve(otmoic.address, token_amount_dst)
            await time.setNextBlockTimestamp(agreementReachedTime + 2 * stepTimelock + 1)
            await expect(otmoic.connect(lp).transferIn(
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
                {value: eth_amount}
            ))
            .to.be.revertedWithCustomError(otmoic, "ExpiredOp")
            .withArgs("transfer in", agreementReachedTime + 2 * stepTimelock);
        })

        it('confirmTransferOut timelock and confirmTransferIn timelock', async function () {
            const { otmoic, owner, otherAccount, user, lp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = '1000000000000000000'
            let token_amount_dst = '1000000000000000'
            let eth_amount       = '0'

            let srcTransferId = new Array(32).fill(3)
            let preimage = new Array(32).fill(2)
            let relayPreimage = new Array(32).fill(3)
            let agreementReachedTime = await time.latest()
            let stepTimelock = 60
            let srcChainId = '60'
            let dstChainId = '60'
            let bidId = ethers.utils.formatBytes32String('1');

            let hashlock = ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32'], [preimage]))
            let relayHashlock = ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32'], [relayPreimage]))

            await tercSrc.transfer(user.address, token_amount_src)
            await tercDst.transfer(lp.address, token_amount_dst)

            await tercSrc.connect(user).approve(otmoic.address, token_amount_src)
            
            await otmoic.connect(user).transferOut(
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
                lpSign
            )

            await tercDst.connect(lp).approve(otmoic.address, token_amount_dst)
            await otmoic.connect(lp).transferIn(
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
                {value: eth_amount}
            )

            // cannot use user hashlock to confirm after 3 * stepTimelock
            await time.setNextBlockTimestamp(agreementReachedTime + 3 * stepTimelock + 1)
            await expect(otmoic.connect(user).confirmTransferOut(
                user.address,         
                lp.address,           
                tercSrc.address,      
                token_amount_src,     
                eth_amount,           
                hashlock,   
                relayHashlock,          
                stepTimelock,         
                preimage,
                preimage,             
                agreementReachedTime,
            ))
            .to.be.revertedWithCustomError(otmoic, "InvalidHashlock")

            await time.setNextBlockTimestamp(agreementReachedTime + 5 * stepTimelock + 1)
            await expect(otmoic.connect(lp).confirmTransferIn(
                lp.address,
                user.address,
                tercDst.address,
                token_amount_dst,
                eth_amount,
                hashlock,
                stepTimelock,
                preimage,
                agreementReachedTime
            ))
            .to.be.revertedWithCustomError(otmoic, "ExpiredOp")
            .withArgs("confirm in", agreementReachedTime + 5 * stepTimelock);

            // cannot use relay hashlock to confirm after 6 * stepTimelock
            await time.setNextBlockTimestamp(agreementReachedTime + 6 * stepTimelock + 1)
            await expect(otmoic.connect(user).confirmTransferOut(
                user.address,         
                lp.address,           
                tercSrc.address,      
                token_amount_src,     
                eth_amount,           
                hashlock,   
                relayHashlock,          
                stepTimelock,         
                preimage,
                relayHashlock,             
                agreementReachedTime,
            ))
            .to.be.revertedWithCustomError(otmoic, "ExpiredOp")
            .withArgs("confirm out", agreementReachedTime + 6 * stepTimelock);
        })

        it('confirm by relay hashlock', async function () {
            const { otmoic, owner, otherAccount, user, lp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = '1000000000000000000'
            let token_amount_dst = '1000000000000000'
            let eth_amount       = '0'

            let srcTransferId = new Array(32).fill(3)
            let preimage = new Array(32).fill(2)
            let relayPreimage = new Array(32).fill(3)
            let agreementReachedTime = await time.latest()
            let stepTimelock = 60
            let srcChainId = '60'
            let dstChainId = '60'
            let bidId = ethers.utils.formatBytes32String('1');

            let hashlock = ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32'], [preimage]))
            let relayHashlock = ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32'], [relayPreimage]))

            await tercSrc.transfer(user.address, token_amount_src)
            await tercDst.transfer(lp.address, token_amount_dst)

            await tercSrc.connect(user).approve(otmoic.address, token_amount_src)
            
            await otmoic.connect(user).transferOut(
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
                lpSign
            )

            await tercDst.connect(lp).approve(otmoic.address, token_amount_dst)
            await otmoic.connect(lp).transferIn(
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
                {value: eth_amount}
            )

            await time.setNextBlockTimestamp(agreementReachedTime + 6 * stepTimelock)
            await expect(otmoic.connect(user).confirmTransferOut(
                user.address,         
                lp.address,           
                tercSrc.address,      
                token_amount_src,     
                eth_amount,           
                hashlock,   
                relayHashlock,          
                stepTimelock,         
                preimage,
                relayPreimage,             
                agreementReachedTime,
            ))
            .to.be.emit(otmoic, "LogTransferOutConfirmed");
        })

        it('refundTransferOut timelock and refundTransferIn timelock', async function () {
            const { otmoic, owner, otherAccount, user, lp, tercSrc, tercDst } = await loadFixture(deploy);

            let token_amount_src = '1000000000000000000'
            let token_amount_dst = '1000000000000000'
            let eth_amount       = '0'

            let srcTransferId = new Array(32).fill(3)
            let preimage = new Array(32).fill(2)
            let relayPreimage = new Array(32).fill(3)
            let agreementReachedTime = await time.latest()
            let stepTimelock = 60
            let srcChainId = '60'
            let dstChainId = '60'
            let bidId = ethers.utils.formatBytes32String('1');

            let hashlock = ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32'], [preimage]))
            let relayHashlock = ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32'], [relayPreimage]))

            await tercSrc.transfer(user.address, token_amount_src)
            await tercDst.transfer(lp.address, token_amount_dst)

            await tercSrc.connect(user).approve(otmoic.address, token_amount_src)
            
            await otmoic.connect(user).transferOut(
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
                lpSign
            )

            await tercDst.connect(lp).approve(otmoic.address, token_amount_dst)
            await otmoic.connect(lp).transferIn(
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
                {value: eth_amount}
            )

            await time.setNextBlockTimestamp(agreementReachedTime + 7 * stepTimelock - 1)
            await expect(otmoic.connect(user).refundTransferOut(
                user.address,         
                lp.address,           
                tercSrc.address,      
                token_amount_src,     
                eth_amount,           
                hashlock,      
                relayHashlock,       
                stepTimelock,                    
                agreementReachedTime,
            ))
            .to.be.revertedWithCustomError(otmoic, "NotUnlock")
            .withArgs("refund out", agreementReachedTime + 7 * stepTimelock);

            await time.setNextBlockTimestamp(agreementReachedTime + 7 * stepTimelock)
            await expect(otmoic.connect(lp).refundTransferIn(
                lp.address,
                user.address,
                tercDst.address,
                token_amount_dst,
                eth_amount,
                hashlock,
                stepTimelock,
                agreementReachedTime
            ))
            .to.be.revertedWithCustomError(otmoic, "NotUnlock")
            .withArgs("refund in", agreementReachedTime + 7 * stepTimelock);
        })
    })
})