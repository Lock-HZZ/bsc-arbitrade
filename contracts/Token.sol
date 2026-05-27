// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IFactory.sol";
import "./interfaces/IPair.sol";
import "./interfaces/IRouter02.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract Token is IERC20, Ownable {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    string private _name;
    string private _symbol;
    uint8 private _decimals = 18;
    uint256 private _totalSupply;
    bool public buyStatus = false;
    mapping(address => bool) public whiteList;
    address public arbAddress;

    address public immutable pair0;
    address public immutable pair1;
    address public constant USDT = 0x55d398326f99059fF775485246999027B3197955;
    IRouter02 public pancakeRouter = IRouter02(0x10ED43C718714eb63d5aA57B78B54704E256024E);
    IRouter02 public uniswapRouter = IRouter02(0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24);

    constructor(address owner, string memory name_, string memory symbol_, uint256 initialSupply) Ownable(owner) {
        _name = name_;
        _symbol = symbol_;
        _totalSupply = initialSupply * 10**uint256(_decimals);
        IFactory pancakeFactory = IFactory(pancakeRouter.factory());
        pair0 = pancakeFactory.createPair(address(this), USDT);

        IFactory uniswapFactory = IFactory(uniswapRouter.factory());
        pair1 = uniswapFactory.createPair(address(this), USDT);

        _balances[msg.sender] = _totalSupply;
        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    function setWhiteList(address account, bool status) external onlyOwner {
        whiteList[account] = status;
    }

    function setArbAddress(address _arbAddress) external onlyOwner {
        arbAddress = _arbAddress;
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function decimals() public view returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        _transfer(sender, recipient, amount);
        uint256 currentAllowance = _allowances[sender][msg.sender];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        _approve(sender, msg.sender, currentAllowance - amount);
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        require(_balances[sender] >= amount, "ERC20: transfer amount exceeds balance");

        _balances[sender] -= amount;

        uint256 transferAmount = amount;

        if (sender == pair0 || sender == pair1) {
            if (!whiteList[recipient] && recipient != arbAddress) {
                require(buyStatus, "Access denied: can't buy INT");
            }
        }
        _balances[recipient] += transferAmount;
        emit Transfer(sender, recipient, transferAmount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }


}
