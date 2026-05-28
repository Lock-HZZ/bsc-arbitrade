import { ethers } from "ethers";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { TOKENS, USDT } from "./tokens";

const PORT = 3000;

const ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
];
const ARBITRAGE_ABI = [
  "function arbitrage(address tokenIn, address tokenOut, uint256 amountIn, uint256 minProfit, bool buyOnPancake) external",
];
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

const PANCAKE_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const UNISWAP_ROUTER = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
const ARB_CONTRACT = '0x90fdaAeeecc83100c88e34785c5217C8f3E60CBf';

interface Config {
  rpc: string;
  tokenOut: string;
  maxAmountIn: string;
  minProfit: string;
  pollMs: number;
  walletAddress: string;
}

const PAIR_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32)",
  "function token0() external view returns (address)",
];
const FACTORY_ABI = [
  "function getPair(address, address) external view returns (address)",
];
const PANCAKE_FACTORY = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
const UNISWAP_FACTORY = "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6";

// V2 解析公式：给定两个 pair 的 reserves，计算最优投入量
// 方向：buyRouter(USDT->TOKEN) -> sellRouter(TOKEN->USDT)
// 公式推导自 Uniswap V2 利润最大化
function calcOptimalAmountIn(
  rIn0: bigint,  // buyRouter: USDT reserve
  rOut0: bigint, // buyRouter: TOKEN reserve
  rIn1: bigint,  // sellRouter: TOKEN reserve
  rOut1: bigint, // sellRouter: USDT reserve
  maxIn: bigint
): bigint {
  // 997/1000 fee
  const FEE = 997n;
  const BASE = 1000n;
  // optimal = (sqrt(rIn0 * rOut0 * rIn1 * rOut1 * FEE^2) - rIn0 * rIn1 * BASE) / (rIn1 * BASE + rOut0 * FEE)
  // 使用整数 sqrt
  const a = rIn0 * rOut0 * rIn1 * rOut1 * FEE * FEE;
  const sqrtA = sqrt(a);
  const numerator = sqrtA - rIn0 * rIn1 * BASE;
  const denominator = rIn1 * BASE + rOut0 * FEE;
  if (numerator <= 0n || denominator <= 0n) return 0n;
  const opt = numerator / denominator;
  return opt > maxIn ? maxIn : opt;
}

function sqrt(n: bigint): bigint {
  if (n < 0n) return 0n;
  if (n < 4n) return n === 0n ? 0n : 1n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) { x = y; y = (x + n / x) / 2n; }
  return x;
}

async function getPairReserves(
  factory: ethers.Contract,
  provider: ethers.Provider,
  tokenA: string,
  tokenB: string
): Promise<{ rA: bigint; rB: bigint } | null> {
  const pairAddr: string = await factory.getPair(tokenA, tokenB);
  if (pairAddr === ethers.ZeroAddress) return null;
  const pair = new ethers.Contract(pairAddr, PAIR_ABI, provider);
  const [r0, r1] = await pair.getReserves();
  const token0: string = await pair.token0();
  return token0.toLowerCase() === tokenA.toLowerCase()
    ? { rA: r0, rB: r1 }
    : { rA: r1, rB: r0 };
}

const sessions = new Map<WebSocket, { stop: () => void }>();

const STATS_DIR = join(__dirname, "stats");
if (!existsSync(STATS_DIR)) require("fs").mkdirSync(STATS_DIR);

function saveRecord(address: string, tokenOut: string, record: object) {
  const addrDir = join(STATS_DIR, address.toLowerCase());
  if (!existsSync(addrDir)) require("fs").mkdirSync(addrDir);
  const file = join(addrDir, `${tokenOut.toLowerCase()}.json`);
  const history = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
  history.push(record);
  writeFileSync(file, JSON.stringify(history, null, 2));
}

function broadcast(ws: WebSocket, type: string, data: object) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, ...data }));
}

async function runMonitor(ws: WebSocket, cfg: Config) {
  let running = true;
  sessions.set(ws, { stop: () => { running = false; } });

  const provider = new ethers.JsonRpcProvider(cfg.rpc);
  const usdtContract = new ethers.Contract(USDT, ERC20_ABI, provider);
  const tokenOutContract = new ethers.Contract(cfg.tokenOut, ERC20_ABI, provider);
  const pancakeFactory = new ethers.Contract(PANCAKE_FACTORY, FACTORY_ABI, provider);
  const uniswapFactory = new ethers.Contract(UNISWAP_FACTORY, FACTORY_ABI, provider);
  const pancakeRouter = new ethers.Contract(PANCAKE_ROUTER, ROUTER_ABI, provider);

  const [usdtDecimals, tokenOutDecimals] = await Promise.all([
    usdtContract.decimals(),
    tokenOutContract.decimals(),
  ]);

  const tokenOutSymbol = TOKENS.find(t => t.address.toLowerCase() === cfg.tokenOut.toLowerCase())?.symbol ?? cfg.tokenOut.slice(0, 8);
  const maxAmountIn = ethers.parseUnits(cfg.maxAmountIn, usdtDecimals);
  const minProfit = ethers.parseUnits(cfg.minProfit, usdtDecimals);

  broadcast(ws, "info", { msg: `监控 USDT → ${tokenOutSymbol}，每 ${cfg.pollMs}ms 轮询，最大投入 ${cfg.maxAmountIn} USDT` });

  while (running) {
    try {
      const [pRes, uRes] = await Promise.all([
        getPairReserves(pancakeFactory, provider, USDT, cfg.tokenOut),
        getPairReserves(uniswapFactory, provider, USDT, cfg.tokenOut),
      ]);

      if (!pRes || !uRes) {
        broadcast(ws, "error", { msg: "pair 不存在" });
        await new Promise((r) => setTimeout(r, cfg.pollMs));
        continue;
      }

      const probe = ethers.parseUnits("1", usdtDecimals);
      const pancakePrice1 = (probe * 997n * pRes.rB) / (pRes.rA * 1000n + probe * 997n);
      const uniswapPrice1 = (probe * 997n * uRes.rB) / (uRes.rA * 1000n + probe * 997n);

      const opt0 = calcOptimalAmountIn(pRes.rA, pRes.rB, uRes.rB, uRes.rA, maxAmountIn);
      const opt1 = calcOptimalAmountIn(uRes.rA, uRes.rB, pRes.rB, pRes.rA, maxAmountIn);

      let profit0 = 0n, profit1 = 0n;
      if (opt0 > 0n) {
        try {
          const mid = await pancakeRouter.getAmountsOut(opt0, [USDT, cfg.tokenOut]);
          const uniswapRouter = new ethers.Contract(UNISWAP_ROUTER, ROUTER_ABI, provider);
          const out = await uniswapRouter.getAmountsOut(mid[1], [cfg.tokenOut, USDT]);
          profit0 = out[1] - opt0;
        } catch {}
      }
      if (opt1 > 0n) {
        try {
          const uniswapRouter = new ethers.Contract(UNISWAP_ROUTER, ROUTER_ABI, provider);
          const mid = await uniswapRouter.getAmountsOut(opt1, [USDT, cfg.tokenOut]);
          const out = await pancakeRouter.getAmountsOut(mid[1], [cfg.tokenOut, USDT]);
          profit1 = out[1] - opt1;
        } catch {}
      }

      broadcast(ws, "price", {
        pancakePrice: ethers.formatUnits(pancakePrice1, tokenOutDecimals),
        uniswapPrice: ethers.formatUnits(uniswapPrice1, tokenOutDecimals),
        profit0: ethers.formatUnits(profit0, usdtDecimals),
        profit1: ethers.formatUnits(profit1, usdtDecimals),
        optimalIn: profit0 > profit1
          ? ethers.formatUnits(opt0, usdtDecimals)
          : ethers.formatUnits(opt1, usdtDecimals),
        tokenOutSymbol,
        ts: Date.now(),
      });

      const hasProfitable = profit0 > minProfit || profit1 > minProfit;
      if (hasProfitable) {
        const buyOnPancake = profit0 >= profit1;
        const optimalIn = buyOnPancake ? opt0 : opt1;
        const profit = buyOnPancake ? profit0 : profit1;
        if (profit <= minProfit) {
          await new Promise((r) => setTimeout(r, cfg.pollMs));
          continue;
        }
        const direction = buyOnPancake ? "Pancake买→Uniswap卖" : "Uniswap买→Pancake卖";
        broadcast(ws, "arb_signal", {
          direction,
          profit: ethers.formatUnits(profit, usdtDecimals),
          optimalIn: ethers.formatUnits(optimalIn, usdtDecimals),
          amountIn: optimalIn.toString(),
          buyOnPancake,
          tokenOut: cfg.tokenOut,
        });
      }
    } catch (e: any) {
      broadcast(ws, "error", { msg: e.shortMessage || e.message });
    }
    await new Promise((r) => setTimeout(r, cfg.pollMs));
  }
}

const httpServer = createServer((req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(readFileSync(join(__dirname, "index.html")));
  } else if (req.url === "/arbitrage.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(readFileSync(join(__dirname, "arbitrage.html")));
  } else if (req.url === "/token-creation.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(readFileSync(join(__dirname, "token-creation.html")));
  } else if (req.url === "/token-whitelist.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(readFileSync(join(__dirname, "token-whitelist.html")));
  } else if (req.url === "/token-management.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(readFileSync(join(__dirname, "token-management.html")));
  } else if (req.url?.endsWith(".js")) {
    const file = join(__dirname, req.url);
    if (existsSync(file)) {
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      res.end(readFileSync(file));
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
  } else if (req.url === "/tokens") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(TOKENS));
  } else if (req.url?.startsWith("/stats/")) {
    const parts = req.url.slice(7).split('/').filter(p => p);
    const addr = parts[0].toLowerCase();
    const token = parts[1]?.toLowerCase();

    if (token) {
      const file = join(STATS_DIR, addr, `${token}.json`);
      const data = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
      const count = data.length;
      const total = data.reduce((s: number, r: any) => s + parseFloat(r.profit || "0"), 0);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ count, total }));
    } else {
      const addrDir = join(STATS_DIR, addr);
      let totalCount = 0, totalProfit = 0;
      if (existsSync(addrDir)) {
        const files = require("fs").readdirSync(addrDir);
        files.forEach((f: string) => {
          const data = JSON.parse(readFileSync(join(addrDir, f), "utf8"));
          totalCount += data.length;
          totalProfit += data.reduce((s: number, r: any) => s + parseFloat(r.profit || "0"), 0);
        });
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ count: totalCount, total: totalProfit }));
    }
  } else if (req.url === "/api/add-whitelist" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const { token, addresses } = JSON.parse(body);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, message: "Whitelist updated" }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid request" }));
      }
    });
  } else if (req.url === "/api/create-token" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const { factory, name, symbol, supply } = JSON.parse(body);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, address: "0x" + Math.random().toString(16).slice(2) }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid request" }));
      }
    });
  } else if (req.url?.startsWith("/api/user-tokens")) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const factory = url.searchParams.get("factory");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify([]));
  } else {
    res.writeHead(404); res.end();
  }
});

const wss = new WebSocketServer({ server: httpServer });
wss.on("connection", (ws) => {
  ws.on("message", async (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === "start") {
      sessions.get(ws)?.stop();
      runMonitor(ws, msg.config).catch((e) => broadcast(ws, "error", { msg: e.message }));
    }
    if (msg.type === "stop") {
      sessions.get(ws)?.stop();
      sessions.delete(ws);
      broadcast(ws, "info", { msg: "已停止监控" });
    }
    if (msg.type === "arb_done") {
      saveRecord(msg.config?.walletAddress || msg.walletAddress || "unknown", msg.tokenOut, {
        ts: new Date().toISOString(),
        hash: msg.hash,
        direction: msg.direction,
        tokenOut: msg.tokenOut,
        profit: msg.profit,
        gasUsed: msg.gasUsed,
      });
    }
  });
  ws.on("close", () => { sessions.get(ws)?.stop(); sessions.delete(ws); });
});

httpServer.listen(PORT, () => console.log(`http://localhost:${PORT}`));
