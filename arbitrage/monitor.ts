import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const UNISWAP_ROUTER = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
const ARBITRAGE_CONTRACT = process.env.ARBITRAGE_CONTRACT!;

// 监控的代币对：USDT -> TOKEN
const TOKEN_IN  = "0x55d398326f99059fF775485246999027B3197955"; // USDT
const TOKEN_OUT = process.env.TOKEN_OUT!;                       // 套利目标代币

const AMOUNT_IN   = ethers.parseUnits(process.env.AMOUNT_IN || "100", 18);
const MIN_PROFIT  = ethers.parseUnits(process.env.MIN_PROFIT || "0.5", 18);
const POLL_MS     = Number(process.env.POLL_MS || 3000);

const ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
];
const ARBITRAGE_ABI = [
  "function arbitrage(address tokenIn, address tokenOut, uint256 amountIn, uint256 minProfit, bool buyOnPancake) external",
];
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

async function getAmountOut(
  router: ethers.Contract,
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint
): Promise<bigint> {
  const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
  return amounts[1] as bigint;
}

async function ensureApproval(
  signer: ethers.Signer,
  token: string,
  spender: string,
  amount: bigint
) {
  const erc20 = new ethers.Contract(token, ERC20_ABI, signer);
  const addr = await signer.getAddress();
  const allowance: bigint = await erc20.allowance(addr, spender);
  if (allowance < amount) {
    console.log("Approving token...");
    const tx = await erc20.approve(spender, ethers.MaxUint256);
    await tx.wait();
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.BSC_RPC || "https://bsc.blockrazor.xyz"
  );
  const signer = new ethers.Wallet(process.env.ACCOUNTS!.split(",")[0], provider);

  const pancake  = new ethers.Contract(PANCAKE_ROUTER, ROUTER_ABI, provider);
  const uniswap  = new ethers.Contract(UNISWAP_ROUTER, ROUTER_ABI, provider);
  const arb      = new ethers.Contract(ARBITRAGE_CONTRACT, ARBITRAGE_ABI, signer);

  await ensureApproval(signer, TOKEN_IN, ARBITRAGE_CONTRACT, ethers.MaxUint256);

  console.log(`Monitoring ${TOKEN_OUT} every ${POLL_MS}ms...`);

  while (true) {
    try {
      const [pancakeOut, uniswapOut] = await Promise.all([
        getAmountOut(pancake, TOKEN_IN, TOKEN_OUT, AMOUNT_IN),
        getAmountOut(uniswap, TOKEN_IN, TOKEN_OUT, AMOUNT_IN),
      ]);

      // 模拟两个方向的最终 tokenIn 产出
      const [pancakeSellBack, uniswapSellBack] = await Promise.all([
        getAmountOut(uniswap, TOKEN_OUT, TOKEN_IN, pancakeOut),   // Pancake买 -> Uniswap卖
        getAmountOut(pancake, TOKEN_OUT, TOKEN_IN, uniswapOut),   // Uniswap买 -> Pancake卖
      ]);

      const profit0 = pancakeSellBack - AMOUNT_IN; // Pancake买/Uniswap卖
      const profit1 = uniswapSellBack - AMOUNT_IN; // Uniswap买/Pancake卖

      console.log(
        `[${new Date().toLocaleTimeString()}] ` +
        `Pancake→Uniswap profit: ${ethers.formatUnits(profit0, 18)} USDT | ` +
        `Uniswap→Pancake profit: ${ethers.formatUnits(profit1, 18)} USDT`
      );

      let buyOnPancake: boolean | null = null;
      if (profit0 > MIN_PROFIT) buyOnPancake = true;
      else if (profit1 > MIN_PROFIT) buyOnPancake = false;

      if (buyOnPancake !== null) {
        console.log(`>>> Arbitrage triggered! buyOnPancake=${buyOnPancake}`);
        const tx = await arb.arbitrage(TOKEN_IN, TOKEN_OUT, AMOUNT_IN, MIN_PROFIT, buyOnPancake);
        const receipt = await tx.wait();
        console.log(`<<< Done. tx: ${receipt.hash}`);
      }
    } catch (e: any) {
      console.error("Error:", e.shortMessage || e.message);
    }

    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main();
