const { createBuyOrderTx, createSellOrderTx, createDealMakerTx, cancelOrderTx } = require('./rpc')
const { generateLockArgs } = require('./rpc/helper')
const { u128ToLEHex, u64ToLEHex } = require('./utils/buffer')
const { DEAL_MAKER_PRIVATE_KEY, ALICE_PRIVATE_KEY, BOB_PRIVATE_KEY } = require('./utils/config')

const SUDT_DECIMAL = BigInt(10) ** BigInt(8)
const CKB_DECIMAL = BigInt(10) ** BigInt(8)
const orderPrice = BigInt(5) * BigInt(10) ** BigInt(10)

// alice tx hash: 0x54991d91f50127f03ee55f6155af45bbdae13addb5000333796e17dd68d8c0e7
// bob tx hash: 0x21604d40733bc96795e93a403cc58264dff44be439a4d96d289a6d450d3a07da
const creatOrderTxs = async () => {
  const aliceBuyerCellData = `0x${u128ToLEHex(BigInt(0))}${u128ToLEHex(BigInt(40) * SUDT_DECIMAL)}${u64ToLEHex(orderPrice)}00`
  const bobSellerCellData = `0x${u128ToLEHex(BigInt(100) * SUDT_DECIMAL)}${u128ToLEHex(BigInt(200) * CKB_DECIMAL)}${u64ToLEHex(
    orderPrice,
  )}01`
  await createBuyOrderTx(ALICE_PRIVATE_KEY, aliceBuyerCellData)
  await createSellOrderTx(BOB_PRIVATE_KEY, bobSellerCellData)
}

const createDealMakerOrderTx = async () => {
  const buyerOutPoint = {
    txHash: '0x54991d91f50127f03ee55f6155af45bbdae13addb5000333796e17dd68d8c0e7',
    index: '0x0',
  }
  const sellerOutPoint = {
    txHash: '0x21604d40733bc96795e93a403cc58264dff44be439a4d96d289a6d450d3a07da',
    index: '0x0',
  }
  const aliceBuyerCellData = `0x${u128ToLEHex(BigInt(40) * SUDT_DECIMAL)}${u128ToLEHex(BigInt(0))}${u64ToLEHex(orderPrice)}00`
  // seller sudt_amount = (100 - 40*1.003)*10^8 = 5988000000
  const bobSellerCellData = `0x${u128ToLEHex(BigInt(5988000000))}${u128ToLEHex(BigInt(0))}${u64ToLEHex(orderPrice)}01`
  const diffCapacity = BigInt(200) * CKB_DECIMAL

  const aliceArgs = generateLockArgs(ALICE_PRIVATE_KEY)
  const bobArgs = generateLockArgs(BOB_PRIVATE_KEY)

  await createDealMakerTx(
    DEAL_MAKER_PRIVATE_KEY,
    aliceArgs,
    bobArgs,
    buyerOutPoint,
    sellerOutPoint,
    aliceBuyerCellData,
    bobSellerCellData,
    diffCapacity,
  )
}

const cancelSellerOrderTx = async () => {
  const sellerOutPoint = {
    txHash: '0xe51f09022db2e26ac675eeb7c91c3cc07f69268a5996b25dd7504aa661750fd8',
    index: '0x2',
  }
  await cancelOrderTx(BOB_PRIVATE_KEY, sellerOutPoint, BigInt(600) * CKB_DECIMAL)
}

cancelSellerOrderTx()
