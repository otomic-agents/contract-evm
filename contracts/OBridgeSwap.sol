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

    function approveOwnership() public {
        require(nextOwner == msg.sender);
        owner = nextOwner;
    }

    function _setOwner(address newOwner) private {
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

contract BridgeFee is Ownable {
    uint256 public basisPointsRate = 0;
    mapping(address => uint256) public maximumFee;
    address public tollAddress;

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor() {
        tollAddress = _msgSender();
    }

    function setBasisPointsRate(uint256 rate) external onlyOwner {
        basisPointsRate = rate;
    }

    function setMaximumFee(address token, uint256 fee) external onlyOwner {
        maximumFee[token] = fee;
    }

    function setTollAddress(address toll) external onlyOwner {
        tollAddress = toll;
    }

    function calcFee(address token, uint256 value) internal view returns (uint256) {
        uint256 fee = (value * basisPointsRate) / 10000;

        uint256 maxFee = maximumFee[token];
        if (maxFee > 0 && fee > maxFee) {
            fee = maxFee;
        }

        return fee;
    }
}

contract OtmoicSwap is BridgeFee {
    using SafeERC20 for IERC20;

    enum TransferStatus {
        Null,
        Pending,
        Confirmed,
        Refunded
    }

    struct SwapStatus {
        TransferStatus transferStatus;
        uint256 srcTokenFee;
        uint256 dstTokenFee;
    }

    mapping(bytes32 => SwapStatus) public swapStatus;

    event LogSwapSubmitted(
        bytes32 transferId,
        address sender,
        address receiver,
        address srcToken,
        uint256 srcAmount,
        address dstToken,
        uint256 dstAmount,
        uint64 stepTime,
        uint64 agreementReachedTime,
        bytes32 bidId,
        string requestor,
        string lpId,
        string userSign,
        string lpSign
    );
    event LogSwapConfirmed(bytes32 transferId);
    event LogSwapRefunded(bytes32 transferId);

    error InvalidSender();
    error InvalidAmount();
    error ExpiredOp(string op, uint64 expiredAt);
    error NotUnlock(string op, uint64 lockedUntil);
    error InvalidStatus();
    error FailedToSendEther();

    receive() external payable {}

    function submitSwap(
        address _sender,
        address _receiver,
        address _srcToken,
        uint256 _srcAmount,
        address _dstToken,
        uint256 _dstAmount,
        uint64 _stepTime,
        uint64 _agreementReachedTime,
        bytes32 _bidId,
        string calldata _requestor,
        string calldata _lpId,
        string calldata _userSign,
        string calldata _lpSign
    ) external payable {
        if (msg.sender != _sender) {
            revert InvalidSender();
        }

        if (_srcAmount <= 0 || _dstAmount <= 0) {
            revert InvalidAmount();
        }

        uint64 _timelock = _agreementReachedTime + 1 * _stepTime;
        if (block.timestamp >= _timelock) {
            revert ExpiredOp("submitSwap", _timelock);
        }

        bytes32 _transferId = keccak256(
            abi.encodePacked(
                _sender,
                _receiver,
                _srcToken,
                _srcAmount,
                _dstToken,
                _dstAmount,
                _stepTime,
                _agreementReachedTime,
                block.chainid
            )
        );
        if (swapStatus[_transferId].transferStatus != TransferStatus.Null) {
            revert InvalidStatus();
        }

        _transfer(_sender, _srcToken, _srcAmount);

        swapStatus[_transferId].transferStatus = TransferStatus.Pending;
        swapStatus[_transferId].srcTokenFee = calcFee(_srcToken, _srcAmount);
        swapStatus[_transferId].dstTokenFee = calcFee(_dstToken, _dstAmount);

        emit LogSwapSubmitted(
            _transferId,
            _sender,
            _receiver,
            _srcToken,
            _srcAmount,
            _dstToken,
            _dstAmount,
            _stepTime,
            _agreementReachedTime,
            _bidId,
            _requestor,
            _lpId,
            _userSign,
            _lpSign
        );
    }

    function confirmSwap(
        address _sender,
        address _receiver,
        address _srcToken,
        uint256 _srcAmount,
        address _dstToken,
        uint256 _dstAmount,
        uint64 _stepTime,
        uint64 _agreementReachedTime
    ) external payable {
        if (msg.sender != _receiver) {
            revert InvalidSender();
        }

        uint64 _timelock = _agreementReachedTime + 2 * _stepTime;
        if (block.timestamp >= _timelock) {
            revert ExpiredOp("confirmSwap", _timelock);
        }

        bytes32 _transferId = keccak256(
            abi.encodePacked(
                _sender,
                _receiver,
                _srcToken,
                _srcAmount,
                _dstToken,
                _dstAmount,
                _stepTime,
                _agreementReachedTime,
                block.chainid
            )
        );
        if (swapStatus[_transferId].transferStatus != TransferStatus.Pending) {
            revert InvalidStatus();
        }

        _confirm(_transferId, _sender, _receiver, _srcToken, _srcAmount, _dstToken, _dstAmount);

        delete swapStatus[_transferId];
        emit LogSwapConfirmed(_transferId);
    }

    function refundSwap(
        address _sender,
        address _receiver,
        address _srcToken,
        uint256 _srcAmount,
        address _dstToken,
        uint256 _dstAmount,
        uint64 _stepTime,
        uint64 _agreementReachedTime
    ) external {
        uint64 _timelock = _agreementReachedTime + 2 * _stepTime;
        if (block.timestamp <= _timelock) {
            revert NotUnlock("refundSwap", _timelock);
        }

        bytes32 _transferId = keccak256(
            abi.encodePacked(
                _sender,
                _receiver,
                _srcToken,
                _srcAmount,
                _dstToken,
                _dstAmount,
                _stepTime,
                _agreementReachedTime,
                block.chainid
            )
        );
        if (swapStatus[_transferId].transferStatus != TransferStatus.Pending) {
            revert InvalidStatus();
        }

        _refund(_sender, _srcToken, _srcAmount);

        delete swapStatus[_transferId];

        emit LogSwapRefunded(_transferId);
    }

    function _transfer(address _sender, address _token, uint256 _amount) private {
        // lock src token (from sender to contract)
        if (_token == address(0)) {
            if (msg.value != _amount) {
                revert InvalidAmount();
            }
        } else {
            if (msg.value != 0) {
                revert InvalidAmount();
            }
            IERC20(_token).safeTransferFrom(_sender, address(this), _amount);
        }
    }

    function _confirm(
        bytes32 _transferId,
        address _sender,
        address _receiver,
        address _srcToken,
        uint256 _srcAmount,
        address _dstToken,
        uint256 _dstAmount
    ) private {
        // release src token (from contract to receiver)
        uint256 srcTokenFee = swapStatus[_transferId].srcTokenFee;
        uint256 srcSendAmount = _srcAmount - srcTokenFee;
        if (_srcToken == address(0)) {
            (bool sent, ) = _receiver.call{ value: srcSendAmount }("");
            if (sent != true) {
                revert FailedToSendEther();
            }

            (sent, ) = tollAddress.call{ value: srcTokenFee }("");
            if (sent != true) {
                revert FailedToSendEther();
            }
        } else {
            IERC20(_srcToken).safeTransfer(_receiver, srcSendAmount);
            IERC20(_srcToken).safeTransfer(tollAddress, srcTokenFee);
        }

        // send dst token (from receiver to sender)
        uint256 dstTokenFee = swapStatus[_transferId].dstTokenFee;
        uint256 dstSendAmount = _dstAmount - dstTokenFee;
        if (_dstToken == address(0)) {
            if (msg.value != _dstAmount) {
                revert InvalidAmount();
            }
            (bool sent, ) = _sender.call{ value: dstSendAmount }("");
            if (sent != true) {
                revert FailedToSendEther();
            }
            (sent, ) = tollAddress.call{ value: dstTokenFee }("");
            if (sent != true) {
                revert FailedToSendEther();
            }
        } else {
            IERC20(_dstToken).safeTransferFrom(_receiver, _sender, dstSendAmount);
            IERC20(_dstToken).safeTransferFrom(_receiver, tollAddress, dstTokenFee);
        }
    }

    function _refund(address _sender, address _token, uint256 _amount) private {
        // refund src token (from contract to sender)
        if (_token == address(0)) {
            (bool sent, ) = _sender.call{ value: _amount }("");
            if (sent != true) {
                revert FailedToSendEther();
            }
        } else {
            IERC20(_token).safeTransfer(_sender, _amount);
        }
    }
}
