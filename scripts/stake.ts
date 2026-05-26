import { ethers } from 'hardhat';
import dotenv from 'dotenv';
import {bigint} from "hardhat/internal/core/params/argumentTypes";
dotenv.config();

async function stake() {
    const staking = await ethers.getContractAt('Staking', "0xCe742D86e85184ab2EFdC3aF86eB0641508a887B");
    const tx = await staking.stake(BigInt("10000000000000000"));
    await (tx as any).wait();
}

stake()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });
