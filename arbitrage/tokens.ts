export interface Token {
  symbol: string;
  address: string;
  createdAt?: number;
  buyWhitelist?: string[];
}

export const TOKENS: Token[] = [
  { symbol: "ONLY", address: "0xf98fa163c25C0Cf30EA5E98A9D4Ce35045855b1F" },
];

export const USDT = "0x55d398326f99059fF775485246999027B3197955";

export function createToken(symbol: string, address: string, buyWhitelist: string[] = []): Token {
  return {
    symbol,
    address,
    createdAt: Date.now(),
    buyWhitelist,
  };
}

export function addTokenRealtime(token: Token): void {
  const existing = TOKENS.find(t => t.address.toLowerCase() === token.address.toLowerCase());
  if (!existing) {
    TOKENS.push(token);
  }
}

export function addBuyWhitelist(tokenAddress: string, addresses: string[]): void {
  const token = TOKENS.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
  if (token) {
    token.buyWhitelist = [...new Set([...(token.buyWhitelist || []), ...addresses])];
  }
}

export function isBuyWhitelisted(tokenAddress: string, buyerAddress: string): boolean {
  const token = TOKENS.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
  if (!token?.buyWhitelist) return true;
  return token.buyWhitelist.some(addr => addr.toLowerCase() === buyerAddress.toLowerCase());
}
