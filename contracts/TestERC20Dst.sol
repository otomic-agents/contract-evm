// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20Dst is ERC20 {
    constructor(uint256 initialSupply) ERC20("OtmoicTestTokenB", "OTTB") {
        _mint(msg.sender, initialSupply);
    }
}
