
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { deployContract } from './001_deploy_utils';
import dotenv from 'dotenv';
dotenv.config();

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
     console.log('🚀 Deploying TokenFactory.sol...');


     const tokenDeployment = await deployContract(
         hre,
         'TokenFactory',
         ["0x90fdaAeeecc83100c88e34785c5217C8f3E60CBf"]
     );

     console.log('✅ TokenFactory.sol deployment completed!');
     if (tokenDeployment?.address) {
       console.log(`   TokenFactory Address: ${tokenDeployment.address}`);
     }
};

func.tags = ['TokenFactory'];
export default func;
