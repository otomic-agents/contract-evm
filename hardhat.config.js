require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Go to https://infura.io/, sign up, create
// a new App in its dashboard, and replace "KEY" with its key

// Replace this private key with your Goerli account private key
// To export your private key from Metamask, open Metamask and
// go to Account Details > Export Private Key
// Be aware of NEVER putting real Ether into testing accounts
const PRIV_KEY = process.env.PRIVATE_KEY;
const PRIV_KEY2 = process.env.PRIVATE_KEY2;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.17",
        settings: {
            viaIR: true,
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    // networks: {
    //   goerli: {
    //     url: `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`,
    //     accounts: [`0x${GOERLI_PRIVATE_KEY}`]
    //   }
    // }
    networks: {
        bsc_testnet: {
            url: `https://data-seed-prebsc-1-s3.binance.org:8545/`,
            accounts: [PRIV_KEY, PRIV_KEY2],
        },
        eth_sepolia: {
            url: `https://ethereum-sepolia-rpc.publicnode.com`,
            accounts: [PRIV_KEY, PRIV_KEY2],
        },
        polygon_mumbai: {
            url: `https://polygon-mumbai-bor-rpc.publicnode.com`,
            accounts: [PRIV_KEY, PRIV_KEY2],
        },
        avax_fuji: {
            url: "https://api.avax-test.network/ext/bc/C/rpc",
            accounts: [PRIV_KEY, PRIV_KEY2],
        },
        op_sepolia: {
            url: `https://sepolia.optimism.io`,
            accounts: [PRIV_KEY, PRIV_KEY2],
        },
        bsc: {
            url: `https://bsc-dataseed.bnbchain.org`,
            accounts: [PRIV_KEY],
        },
        op: {
            url: `https://optimism.llamarpc.com`,
            accounts: [PRIV_KEY],
        },
        mainnet: {
            url: `https://eth.drpc.org`,
            accounts: [PRIV_KEY],
        },
    },
    etherscan: {
        apiKey: {
            bscTestnet: "N7IS8JC3BRGM2G667A2N3V5IZHH3XUKG84",
            sepolia: "QA8SAPQZVKZJ6W684VQZJ3PZH6AB5TX9BA",
            polygonMumbai: "E744ADWCRTQ2E5NGK4HWB7JQDIQE9GB3N1",
            avax_fuji: "snowtrace", // apiKey is not required, just set a placeholder
            op_sepolia: "ISUHZJG8JF1XQ4M3YPBVGHG7K812CI1FFB",
            optimisticEthereum: "ISUHZJG8JF1XQ4M3YPBVGHG7K812CI1FFB",
            bsc: "N7IS8JC3BRGM2G667A2N3V5IZHH3XUKG84",
            mainnet: "BJIA288DDAYW3FXF7YR9E7MKBYKQS8J39K",
        },
        customChains: [
            {
                network: "avax_fuji",
                chainId: 43113,
                urls: {
                    apiURL: "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan",
                    browserURL: "https://testnet.snowtrace.io",
                },
            },
            {
                network: "op_sepolia",
                chainId: 11155420,
                urls: {
                    apiURL: "https://api-sepolia-optimism.etherscan.io/api",
                    browserURL: "https://sepolia-optimism.etherscan.io/",
                },
            },
        ],
    },
};
