
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { deployContract } from './001_deploy_utils';
import dotenv from 'dotenv';
dotenv.config();

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
     console.log('🚀 Deploying Token.sol...');


     const tokenDeployment = await deployContract(
         hre,
         'Token',
         []
     );

     console.log('✅ Token.sol deployment completed!');
     console.log(`   Token Address: ${tokenDeployment.address}`);

     // 加白
    const arbitrageAddress = '0xb388dBa8A084De3A35A9dd973E59F703e82B2B9E'!;
    const tokenContract = await hre.ethers.getContractAt('Token', tokenDeployment.address);
    const tx = await tokenContract.setWhiteList(arbitrageAddress, true);
    console.log(`✅ Added ${arbitrageAddress} to whitelist of Token.sol`);

};

func.tags = ['Token'];
export default func;
