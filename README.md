# ckb-dex-test

The test for the DEX on Nervos CKB

### How to Work

- Place orders: `src/index.js#createOrderTxs`

- Match orders: `src/index.js#createDealMakerOrderTx`

- Claim orders: `src/index.js#cancelOrClaimOrderTx`

- Cancel orders: `src/index.js#cancelOrClaimOrderTx`

- Place orders in bulk: `src/batch/index.js#batchBuyOrders` / `src/batch/index.js#batchSellOrders`

> Note: Every transaction needs time to wait to join the blockchain and subsequent transactions rely on previous transactions to be chained.
