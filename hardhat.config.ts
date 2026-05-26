import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-verify';
import '@nomicfoundation/hardhat-ethers';
import 'hardhat-deploy';
import { CHAINID } from './constants/constants';
import * as dotenv from 'dotenv'
import '@openzeppelin/hardhat-upgrades';
import '@typechain/hardhat';

// 根据 NODE_ENV 选择不同的环境文件
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: envFile })

const config: HardhatUserConfig = {
  paths: {
    tests: "./test",
    sources: "./contracts",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    hardhat: {
      chainId: CHAINID.HARDHAT_NETWORK,
      allowUnlimitedContractSize: true,
      mining: {
        auto: true,
        interval: 0
      },
      accounts: {
        mnemonic: process.env.MNEMONIC || "test test test test test test test test test test test junk",
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        accountsBalance: "10000000000000000000000"
      }
    },
    local: {
      chainId: 31337,
      url: "http://localhost:8545",
      accounts: {
        mnemonic: process.env.MNEMONIC || "test test test test test test test test test test test junk",
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        accountsBalance: "10000000000000000000000"
      }
    },
    goerli: {
      chainId: 0x5,
      url: "https://rpc.ankr.com/eth_goerli",
      accounts: process.env.ACCOUNTS?.split(",")
    },
    arbitrum: {
      chainId: 0xa4b1,
      url: "https://arb1.arbitrum.io/rpc",
      accounts: process.env.ACCOUNTS?.split(",")
    },
    linea_testnet: {
      chainId: 0xe704,
      url: "https://rpc.goerli.linea.build",
      accounts: process.env.ACCOUNTS?.split(",")
    },
    linea: {
      chainId: 0xe708,
      url: "https://1rpc.io/linea",
      accounts: process.env.ACCOUNTS?.split(",")
    },
    polygon: {
      chainId: 0x89,
      url: "https://rpc-mainnet.matic.quiknode.pro",
      accounts: process.env.ACCOUNTS?.split(",")
    },
    base_sepolia: {
        chainId: 0x14a34,
        url: "https://sepolia.base.org",
        accounts: process.env.ACCOUNTS?.split(",")
    },
    base_mainnet: {
        chainId: 0x2105,
        url: "https://base.gateway.tenderly.co/3UwfQ6qxibPgEXAkP1hwEY",
        accounts: process.env.ACCOUNTS?.split(",")
    },
    bsc_mainnet:  {
      chainId: 0x38,
      url: "https://bsc.blockrazor.xyz",
      accounts: process.env.ACCOUNTS?.split(",")
    },
    bsc_test:  {
      chainId: 0x61,
          url: "https://bsc-testnet.public.blastapi.io",
          accounts: process.env.ACCOUNTS?.split(",")
    },
    ju_test:  {
      chainId: 0x31767,
      url: "https://testnet-rpc.juchain.org",
      accounts: process.env.ACCOUNTS?.split(",")
    },
    ju:  {
      chainId: 0x33450,
      url: "https://rpc.juchain.org",
      accounts: process.env.ACCOUNTS?.split(",")
    },
    ju_main:  {
      chainId: 0x33450,
      url: "https://rpc.juchain.org",
      accounts: process.env.ACCOUNTS?.split(",")
    }
  },
  etherscan: {
    apiKey: "4WDKHWQFHJXBPB282F5PGIJCFYZJSABNW6",
    customChains: [
      {
        network: "bsc_mainnet",
        chainId: 56,
        urls: {
          apiURL: "https://api.bscscan.com/api",
          browserURL: "https://bscscan.com"
        }
      }
    ]
  },
  namedAccounts: {
    deployer: 0,
  },
  solidity: {
    compilers: [
      {
        version: "0.8.22",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
          metadata: {
            bytecodeHash: "none"
          }
        }
      }
    ]
  },
  mocha: {
    timeout: 60000
  },
};

export default config;
