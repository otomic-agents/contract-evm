# Otmoic EVM contract 

## Intro

The `Otmoic` contract is the actual place where swap happens. The `Otmoic` contract is usually deployed at all supported blockchains. When a swap agreement is established at foregoing components, user and LP will interact with the Otmoic at their own chains and do the following operations in order:

- User call `Otmoic:transferOut` at source token chain, source token goes from `user` to `Otmoic` contract.
- Lp call `Otmoic:transferIn` at destination token chain, destination token goes from `lp` to `Otmoic` contract.
- User call `Otmoic:confirmTransferOut` at source token chain, source token goes from `Otmoic` contract to `Lp`.
- Lp call `Otmoic:confirmTransferIn` at destination token chain, destination token goes from `Otmoic` contract to `user`.

By following order, the swap can be made successfully.

The Otmoic contract provides some mechanism to ensure the operations go smoothly.

- Refund: if user wants to stop swap, `Otmoic:refundTransferOut` can help to take token back from Otmoic contract. And lp can call `Otmoic:refundTransferIn` to take token back if lp want to stop.
- Timelock: the operations can be called at certain time slots.
- Hashlock: only users who are called transferOut can call confirmTransferOut by hashlock and preimage.


## Usage

This project is built based on Hardhat, including a contract file, a test script, and a deployment script

### Before starting
```
npm install
```
or
```
yarn install
```

### Show node information
```
npx hardhat node
```

### Test
```
npx hardhat compile
npx hardhat test
```


### Deploy
```
npx hardhat compile
npx hardhat run scripts/deploy.js
```

### Deploy to GOERLI

Replace INFURA_API_KEY and GOERLI_PRIVATE_KEY in hardhat.config.js

```
npx hardhat compile
npx hardhat run scripts/deploy.js --network goerli
```

### Deploy to BSC Testnet

```
npx hardhat compile
npx hardhat run scripts/deploy.js --network bsc_testnet
npx hardhat verify --network bsc_testnet <contract_address>
```

## Release History

- [v2.1.0: add fine-grained timelocks to control process](https://github.com/otmoic/otmoic-contract-evm/releases/tag/v2.1.0)

- [v2.0.0: implement Otmoic contract](https://github.com/otmoic/otmoic-contract-evm/releases/tag/v2.0.0) 


## Contract

- [Discord](https://discord.com/invite/mPcNppqcAd)

- [Otomic X](https://twitter.com/otomic_org)