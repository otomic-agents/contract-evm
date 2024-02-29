// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return msg.data;
    }
}

abstract contract Ownable is Context {
    address public owner;
    address public nextOwner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor() {
        _setOwner(_msgSender());
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(owner == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _setOwner(address(0));
    }

    /**
    * @dev Allows the current owner to transfer control of the contract to a newOwner.
    * @param _newOwner The address to transfer ownership to.
    */
    function transferOwnership(address _newOwner) public onlyOwner {
        require(_newOwner != address(0), "Address should not be 0x");
        nextOwner = _newOwner;
    }
    
    function approveOwnership() public{
        require(nextOwner == msg.sender);
        owner = nextOwner;
    }

    function _setOwner(address newOwner) private {
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

contract BridgeFee is Ownable{
    uint256 public basisPointsRate = 0;
    mapping(address => uint256) public maximumFee;
    address public tollAddress;

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor() {
        tollAddress = _msgSender();
    }

    function setBasisPointsRate(uint256 rate) external onlyOwner{
        basisPointsRate = rate;
    }

    function setMaximumFee(address token, uint256 fee) external onlyOwner{
        maximumFee[token] = fee;
    }

    function setTollAddress(address toll) external onlyOwner {
        tollAddress = toll;
    }

    function calcFee(address token, uint256 value) view internal returns (uint256) {
        uint256 fee = value * basisPointsRate / 10000;

        uint256 maxFee = maximumFee[token];
        if (maxFee > 0 && fee > maxFee){
            fee = maxFee;
        }

        return fee;
    }
}

contract Otmoic is BridgeFee{
    using SafeERC20 for IERC20;

    enum TransferStatus {
        Null,
        Pending,
        Confirmed,
        Refunded
    }

    mapping(bytes32 => TransferStatus) public transfers;

    event LogNewTransferOut(
        bytes32 transferId,
        address sender,
        address receiver,
        address token,
        uint256 amount,
        bytes32 hashlock, // hash of the preimage
        bytes32 relayHashlock, // hash of the relay preimage
        uint64 stepTimelock, // lock timestamp = agreementReachedTime + 1 * stepTimelock
        uint64 dstChainId,
        uint256 dstAddress,
        bytes32 bidId,
        uint256 tokenDst,
        uint256 amountDst,
        uint256 nativeAmountDst,
        uint64 agreementReachedTime,
        string requestor,
        string lpId,
        string userSign,
        string lpSign
    );
    event LogNewTransferIn(
        bytes32 transferId,
        address sender,
        address receiver,
        address token,
        uint256 token_amount,
        uint256 eth_amount,
        bytes32 hashlock, // hash of the preimage
        uint64 stepTimelock, // lock timestamp = agreementReachedTime + 2 * stepTimelock
        uint64 srcChainId,
        bytes32 srcTransferId, // outbound transferId at src chain
        uint64 agreementReachedTime
    );
    event LogTransferOutConfirmed(bytes32 transferId, bytes32 preimage);
    event LogTransferInConfirmed(bytes32 transferId, bytes32 preimage);
    event LogTransferOutRefunded(bytes32 transferId);
    event LogTransferInRefunded(bytes32 transferId);

    error InvalidSender();
    error InvalidAmount();
    error ExpiredOp(string op, uint64 expiredAt);
    error NotUnlock(string op, uint64 lockedUntil);
    error InvalidHashlock();
    error InvalidStatus();
    error FailedToSendEther();

    receive() external payable {}

    /**
     * @dev transfer sets up a new outbound transfer with hash time lock.
     */
    function transferOut(
        address _sender,
        address _receiver,
        address _token,
        uint256 _amount,
        bytes32 _hashlock,
        bytes32 _relayHashlock,
        uint64 _stepTimelock,
        uint64 _dstChainId,
        uint256 _dstAddress,
        bytes32 _bidId,
        uint256 _tokenDst,
        uint256 _amountDst,
        uint256 _nativeAmountDst,
        uint64 _agreementReachedTime,
        string calldata _requestor,
        string calldata _lpId,
        string calldata _userSign,
        string calldata _lpSign
    ) external payable {
        if (msg.sender != _sender) {
            revert InvalidSender();
        }

        if (_amount <= 0) {
            revert InvalidAmount();
        }

        uint64 _timelock = _agreementReachedTime + 1 * _stepTimelock;
        if (block.timestamp > _timelock) {
            revert ExpiredOp("transfer out", _timelock);
        }

        uint256 _eth_mount = 0;
        bytes32 _transferId = keccak256(
            abi.encodePacked(
                _sender, _receiver, _hashlock, _relayHashlock, _agreementReachedTime, _stepTimelock, _token, _amount, _eth_mount, block.chainid
            )
        );
        if (transfers[_transferId] != TransferStatus.Null) {
            revert InvalidStatus();
        }

        _transfer(_sender, _token, _amount, 0);

        transfers[_transferId] = TransferStatus.Pending;

        emit LogNewTransferOut(
            _transferId,
            _sender,
            _receiver,
            _token,
            _amount,
            _hashlock,
            _relayHashlock,
            _stepTimelock,
            _dstChainId,
            _dstAddress,
            _bidId,
            _tokenDst,
            _amountDst,
            _nativeAmountDst,
            _agreementReachedTime,
            _requestor,
            _lpId,
            _userSign,
            _lpSign
        );
    }

    /**
     * @dev transfer sets up a new inbound transfer with hash time lock.
     */
    function transferIn(
        address _sender,
        address _dstAddress,
        address _token,
        uint256 _token_amount,
        uint256 _eth_amount,
        bytes32 _hashlock,
        uint64 _stepTimelock,
        uint64 _srcChainId,
        bytes32 _srcTransferId,
        uint64 _agreementReachedTime
    ) external payable  {

        if (msg.sender != _sender) {
            revert InvalidSender();
        }

        if (_token_amount <= 0) {
            revert InvalidAmount();
        }

        uint64 _timelock = _agreementReachedTime + 2 * _stepTimelock;
        if (block.timestamp > _timelock) {
            revert ExpiredOp("transfer in", _timelock);
        }

        bytes32 _transferId = keccak256(
            abi.encodePacked(
                _sender, _dstAddress, _hashlock, _agreementReachedTime, _stepTimelock, _token, _token_amount, _eth_amount, block.chainid
            )
        );
        if (transfers[_transferId] != TransferStatus.Null) {
            revert InvalidStatus();
        }
        
        _transfer(_sender, _token, _token_amount, _eth_amount);
        
        transfers[_transferId] = TransferStatus.Pending;

        emit LogNewTransferIn(
            _transferId,
            _sender,
            _dstAddress,
            _token,
            _token_amount,
            _eth_amount,
            _hashlock,
            _stepTimelock,
            _srcChainId,
            _srcTransferId,
            _agreementReachedTime
        );
    }

    function confirmTransferOut(
        address _sender,
        address _receiver,
        address _token,
        uint256 _token_amount,
        uint256 _eth_amount,
        bytes32 _hashlock,
        bytes32 _relayHashlock,
        uint64 _stepTimelock,
        bytes32 _preimage,
        bytes32 _relayPreimage,
        uint64 _agreementReachedTime
    ) external {
        uint64 _userConfirmTransferOutTimelock = _agreementReachedTime + 3 * _stepTimelock;
        uint64 _relayConfirmTransferOutTimelock = _agreementReachedTime + 6 * _stepTimelock;
        
        bytes32 _transferId = keccak256(
            abi.encodePacked(
                _sender, _receiver, _hashlock, _relayHashlock, _agreementReachedTime, _stepTimelock, _token, _token_amount, _eth_amount, block.chainid
            )
        );
        if (transfers[_transferId] != TransferStatus.Pending) {
            revert InvalidStatus();
        }
        
        if (block.timestamp > _relayConfirmTransferOutTimelock) {
            revert ExpiredOp("confirm out", _relayConfirmTransferOutTimelock);
        } else if (block.timestamp > _userConfirmTransferOutTimelock && block.timestamp <= _relayConfirmTransferOutTimelock) {
            if (_relayHashlock != keccak256(abi.encodePacked(_relayPreimage))) {
                revert InvalidHashlock();
            }
        } else {
            if (_hashlock != keccak256(abi.encodePacked(_preimage)) && _relayHashlock != keccak256(abi.encodePacked(_relayPreimage))) {
                revert InvalidHashlock();
            }
        }

        _confirm(_receiver, _token, _token_amount, _eth_amount);
        
        transfers[_transferId] = TransferStatus.Confirmed;
        
        emit LogTransferOutConfirmed(_transferId, _preimage);
    }

    function confirmTransferIn(
        address _sender,
        address _receiver,
        address _token,
        uint256 _token_amount,
        uint256 _eth_amount,
        bytes32 _hashlock,
        uint64 _stepTimelock,
        bytes32 _preimage,
        uint64 _agreementReachedTime
    ) external {

        uint64 _confirmTransferInTimelock = _agreementReachedTime + 5 * _stepTimelock;

        bytes32 _transferId = keccak256(
            abi.encodePacked(
                _sender, _receiver, _hashlock, _agreementReachedTime, _stepTimelock, _token, _token_amount, _eth_amount, block.chainid
            )
        );
        if (transfers[_transferId] != TransferStatus.Pending) {
            revert InvalidStatus();
        }

        if (block.timestamp > _confirmTransferInTimelock) {
            revert ExpiredOp("confirm in", _confirmTransferInTimelock);
        }      

        if (_hashlock != keccak256(abi.encodePacked(_preimage))) {
            revert InvalidHashlock();
        }

        _confirm(_receiver, _token, _token_amount, _eth_amount);

        transfers[_transferId] = TransferStatus.Confirmed;

        emit LogTransferInConfirmed(_transferId, _preimage);
    }

    function refundTransferOut(
        address _sender,
        address _receiver,
        address _token,
        uint256 _token_amount,
        uint256 _eth_amount,
        bytes32 _hashlock,
        bytes32 _relayHashlock,
        uint64 _stepTimelock,
        uint64 _agreementReachedTime
    ) external {
        uint64 _timelock = _agreementReachedTime + 7 * _stepTimelock;

        bytes32 _transferId = keccak256(
            abi.encodePacked(
                _sender, _receiver, _hashlock, _relayHashlock, _agreementReachedTime, _stepTimelock, _token, _token_amount, _eth_amount, block.chainid
            )
        );
        if (transfers[_transferId] != TransferStatus.Pending) {
            revert InvalidStatus();
        }

        if (block.timestamp <= _timelock) {
            revert NotUnlock("refund out", _timelock);
        }

        _refund(_sender, _token, _token_amount, _eth_amount);

        transfers[_transferId] = TransferStatus.Refunded;

        emit LogTransferOutRefunded(_transferId);
    }

    function refundTransferIn(
        address _sender,
        address _receiver,
        address _token,
        uint256 _token_amount,
        uint256 _eth_amount,
        bytes32 _hashlock,
        uint64 _stepTimelock,
        uint64 _agreementReachedTime
    ) external {
        uint64 _timelock = _agreementReachedTime + 7 * _stepTimelock;

        bytes32 _transferId = keccak256(
            abi.encodePacked(
                _sender, _receiver, _hashlock, _agreementReachedTime, _stepTimelock, _token, _token_amount, _eth_amount, block.chainid
            )
        );
        if (transfers[_transferId] != TransferStatus.Pending) {
            revert InvalidStatus();
        }

        if (block.timestamp <= _timelock) {
            revert NotUnlock("refund in", _timelock);
        }

        _refund(_sender, _token, _token_amount, _eth_amount);

        transfers[_transferId] = TransferStatus.Refunded;

        emit LogTransferInRefunded(_transferId);
    }
    
    function _transfer(
        address _sender,
        address _token,
        uint256 _token_amount,
        uint256 _eth_amount
    ) private {

        if( _token == address(0) ) {
            if (_eth_amount != 0) {
                revert InvalidAmount();
            }
            if (_token_amount != msg.value) {
                revert InvalidAmount();
            }
        } else {
            if (_eth_amount != msg.value) {
                revert InvalidAmount();
            }
            IERC20(_token).safeTransferFrom(_sender, address(this), _token_amount);
        }

    }

    function _confirm(
        address _receiver,
        address _token,
        uint256 _token_amount,
        uint256 _eth_amount
    ) private {

        if( _token == address(0) ) {
            uint256 fee = calcFee(_token, _token_amount);
            uint256 sendAmount = _token_amount - fee;

            (bool sent, bytes memory data) = _receiver.call{value: sendAmount}("");
            if (sent != true) {
                revert FailedToSendEther();
            }

            (sent, data) = tollAddress.call{value: fee}("");
            if (sent != true) {
                revert FailedToSendEther();
            }
        } else {
            uint256 fee = calcFee(_token, _token_amount);
            uint256 sendAmount = _token_amount - fee;

            IERC20(_token).safeTransfer(_receiver, sendAmount);
            IERC20(_token).safeTransfer(tollAddress, fee);
            if( _eth_amount > 0 ) {

                fee = calcFee(address(0), _eth_amount);
                sendAmount = _eth_amount - fee;

                (bool sent, bytes memory data) = _receiver.call{value: sendAmount}("");
                if (sent != true) {
                    revert FailedToSendEther();
                }

                (sent, data) = tollAddress.call{value: fee}("");
                if (sent != true) {
                    revert FailedToSendEther();
                }
            }
        } 
    }

    function _refund(
        address _sender,
        address _token,
        uint256 _token_amount,
        uint256 _eth_amount
    ) private {

        if( _token == address(0) ) {
            (bool sent, ) = _sender.call{value: _token_amount}("");
            if (sent != true) {
                revert FailedToSendEther();
            }
        } else {
            IERC20(_token).safeTransfer(_sender, _token_amount);
            if( _eth_amount > 0 ) {
                (bool sent, ) = _sender.call{value: _eth_amount}("");
                if (sent != true) {
                    revert FailedToSendEther();
                }
            }
        }
    }
}