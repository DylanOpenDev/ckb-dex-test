# ckb-dex-test

The test for the DEX on Nervos CKB

### How to Work

- Edit .env file

You need to copy .env file from .env.example and input your own private keys.

```shell
git clone https://github.com/DylanOpenDev/ckb-dex-test.git
cd ckb-dex-test
mv .env.example .env
```

- Installation

```shell
yarn install   # install dependency libraries
```

- Running

```shell
createOrderTxs()
// createDealMakerOrderTx()
// cancelOrClaimOrderTx()
```

Uncomment the function you want to execute in `src/index.js` and run `yarn start`

Run `yarn batch` to batch generate transaction buy and sell orders

### Development

- Place orders: `src/index.js#createOrderTxs`

- Match orders: `src/index.js#createDealMakerOrderTx`

- Claim orders: `src/index.js#cancelOrClaimOrderTx`

- Cancel orders: `src/index.js#cancelOrClaimOrderTx`

- Place orders in bulk: `src/batch/index.js#batchBuyOrders` / `src/batch/index.js#batchSellOrders`

> Note: Every transaction needs time to wait to join the blockchain and subsequent transactions rely on previous transactions to be chained.
