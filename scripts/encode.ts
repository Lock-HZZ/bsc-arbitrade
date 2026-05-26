import { ethers } from "hardhat";

async function main() {
  const tokenArgs = [
    "0xfd1897865981037A6075786917A6fBdC70219279"
  ];
  const tokenType = ["address"];

  const abiCoder = new ethers.AbiCoder();
  const encoded = abiCoder.encode(
      tokenType,
      tokenArgs
  );

  console.log("Encoded constructor arguments:", encoded.slice(2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
