import { ethers } from "ethers";

const FACTORY_ABI = [
  "function createToken(string name, string symbol, uint256 initialSupply) returns (address)",
  "function getUserTokens(address user) view returns (address[])",
];

const TOKEN_ABI = [
  "function setWhiteList(address account, bool status)",
  "function buyStatus() view returns (bool)",
  "function owner() view returns (address)",
];

export async function createToken(
  factoryAddress: string,
  name: string,
  symbol: string,
  initialSupply: string,
  signer: ethers.Signer
): Promise<string> {
  const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, signer);
  const tx = await factory.createToken(name, symbol, ethers.parseEther(initialSupply));
  const receipt = await tx.wait();

  const event = receipt?.logs
    .map(log => {
      try {
        return factory.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find(e => e?.name === "TokenCreated");

  return event?.args[1] || "";
}

export async function addWhitelist(
  tokenAddress: string,
  addresses: string[],
  signer: ethers.Signer
): Promise<void> {
  const token = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);

  for (const addr of addresses) {
    const tx = await token.setWhiteList(addr, true);
    await tx.wait();
  }
}

export async function getUserTokens(
  factoryAddress: string,
  userAddress: string,
  provider: ethers.Provider
): Promise<string[]> {
  const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
  return factory.getUserTokens(userAddress);
}
