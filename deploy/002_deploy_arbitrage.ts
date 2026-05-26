
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { deployContract } from './001_deploy_utils';
import dotenv from 'dotenv';
import {ethers} from "ethers";
dotenv.config();

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
     console.log('🚀 Deploying Arbitrage.sol...');


     const tokenDeployment = await deployContract(
         hre,
         'Arbitrage',
         []
     );

     console.log('✅ Arbitrage.sol deployment completed!');
     console.log(`   Arbitrage Address: ${tokenDeployment.address}`);


};

func.tags = ['arb'];
export default func;
