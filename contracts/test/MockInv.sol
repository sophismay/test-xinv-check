pragma solidity ^0.5.16;

import "../ERC20.sol";

contract MockInv is ERC20 {
    constructor() public ERC20("Inverse DAO", "INV", 18) {}

    /*function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function godApprove(
        address from,
        address to,
        uint256 amount
    ) public {
        _approve(from, to, amount);
    }*/
}