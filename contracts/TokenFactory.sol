// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Token.sol";

interface IArbContract {
    function registerToken(address tokenAddress) external;
}

contract TokenFactory {
    address[] public deployedTokens;
    mapping(address => address[]) public userTokens;
    address public arbContract;

    event TokenCreated(address indexed owner, address indexed tokenAddress, string symbol);

    function setArbContract(address _arbContract) external {
        arbContract = _arbContract;
    }

    function createToken(string memory name, string memory symbol, uint256 initialSupply) external returns (address) {
        Token newToken = new Token(msg.sender, name, symbol, initialSupply);
        address tokenAddress = address(newToken);

        deployedTokens.push(tokenAddress);
        userTokens[msg.sender].push(tokenAddress);

        if (arbContract != address(0)) {
            newToken.setArbAddress(arbContract);
            IArbContract(arbContract).registerToken(tokenAddress);
        }

        emit TokenCreated(msg.sender, tokenAddress, symbol);
        return tokenAddress;
    }

    function getUserTokens(address user) external view returns (address[] memory) {
        return userTokens[user];
    }

    function getDeployedTokensCount() external view returns (uint256) {
        return deployedTokens.length;
    }
}
