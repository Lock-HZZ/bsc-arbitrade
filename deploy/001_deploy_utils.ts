import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

export const deployContract = async (
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  args: any[] = [],
  waitConfirmations: number = 1,
  overrides: any = {}
) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log(`Deploying ${contractName}...`);

  const result = await deploy(contractName, {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations,
    ...overrides
  });

  console.log(`${contractName} deployed at: ${result.address}`);
  return result;
};
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {

};

export default func;

