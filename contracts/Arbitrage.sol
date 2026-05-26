// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./interfaces/IRouter02.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Arbitrage {
    address public immutable owner;
    IRouter02 public pancakeRouter = IRouter02(0x10ED43C718714eb63d5aA57B78B54704E256024E);
    IRouter02 public uniswapRouter = IRouter02(0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    /// @param tokenIn        输入代币（如 BUSD/USDT）
    /// @param tokenOut       套利目标代币
    /// @param amountIn       投入数量
    /// @param minProfit      最低利润（单位：tokenIn），不达到则回滚
    /// @param buyOnPancake true = Pancake买/Uniswap卖，false = Uniswap买/Pancake卖
    function arbitrage(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minProfit,
        bool buyOnPancake
    ) external onlyOwner {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        (IRouter02 buyRouter, IRouter02 sellRouter) = buyOnPancake
            ? (pancakeRouter, uniswapRouter)
            : (uniswapRouter, pancakeRouter);

        IERC20(tokenIn).approve(address(buyRouter), amountIn);
        address[] memory path1 = new address[](2);
        path1[0] = tokenIn;
        path1[1] = tokenOut;
        uint256[] memory amounts1 = buyRouter.swapExactTokensForTokens(
            amountIn, 0, path1, address(this), block.timestamp
        );
        uint256 tokenOutAmount = amounts1[amounts1.length - 1];

        IERC20(tokenOut).approve(address(sellRouter), tokenOutAmount);
        address[] memory path2 = new address[](2);
        path2[0] = tokenOut;
        path2[1] = tokenIn;
        uint256[] memory amounts2 = sellRouter.swapExactTokensForTokens(
            tokenOutAmount, 0, path2, address(this), block.timestamp
        );
        uint256 amountOut = amounts2[amounts2.length - 1];

        require(amountOut > amountIn + minProfit, "no profit");

        IERC20(tokenIn).transfer(msg.sender, amountOut);
    }

    // 紧急提取合约内代币
    function withdraw(address token) external onlyOwner {
        uint256 bal = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(owner, bal);
    }
}
