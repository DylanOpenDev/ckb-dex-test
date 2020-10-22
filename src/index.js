const CKB = require('@nervosnetwork/ckb-sdk-core').default
const { createBuyOrderTx, createSellOrderTx, createDealMakerTx } = require('./rpc')
const { u128ToLEHex, u64ToLEHex } = require('./utils/buffer')
const { DEAL_MAKER_PRIVATE_KEY, ALICE_PRIVATE_KEY, BOB_PRIVATE_KEY } = require('./utils/config')

const SUDT_DECIMAL = BigInt(10) ** BigInt(8)
const CKB_DECIMAL = BigInt(10) ** BigInt(8)
const orderPrice = BigInt(5) * BigInt(10) ** BigInt(10)

const ckb = new CKB(null)
let pubKey = ckb.utils.privateKeyToPublicKey(DEAL_MAKER_PRIVATE_KEY)
const dealMakerArgs = '0x' + ckb.utils.blake160(pubKey, 'hex')

pubKey = ckb.utils.privateKeyToPublicKey(ALICE_PRIVATE_KEY)
const aliceArgs = '0x' + ckb.utils.blake160(pubKey, 'hex')

pubKey = ckb.utils.privateKeyToPublicKey(BOB_PRIVATE_KEY)
const bobArgs = '0x' + ckb.utils.blake160(pubKey, 'hex')

// alice tx hash: 0x1257da73397a888a401822737371160d646db67a2b8fa0ce9f66004068042ee3
// bob tx hash: 0x856fc6ce34fe5c9a5aedb16ebe5a2a59b6f9858c02bc064d105eaf45ce4ba7f7
const creatOrderTxs = async () => {
  const aliceBuyerCellData = `0x${u128ToLEHex(BigInt(0))}${u128ToLEHex(BigInt(40) * SUDT_DECIMAL)}${u64ToLEHex(orderPrice)}00`
  const bobSellerCellData = `0x${u128ToLEHex(BigInt(100) * SUDT_DECIMAL)}${u128ToLEHex(BigInt(200) * CKB_DECIMAL)}${u64ToLEHex(
    orderPrice,
  )}01`
  await createBuyOrderTx(ALICE_PRIVATE_KEY, aliceArgs, aliceBuyerCellData)
  await createSellOrderTx(BOB_PRIVATE_KEY, bobArgs, bobSellerCellData)
}

const createDealMakerOrderTx = async () => {
  const buyerOutPoint = {
    txHash: '0x1257da73397a888a401822737371160d646db67a2b8fa0ce9f66004068042ee3',
    index: '0x0',
  }
  const sellerOutPoint = {
    txHash: '0x856fc6ce34fe5c9a5aedb16ebe5a2a59b6f9858c02bc064d105eaf45ce4ba7f7',
    index: '0x0',
  }
  const aliceBuyerCellData = `0x${u128ToLEHex(BigInt(40) * SUDT_DECIMAL)}${u128ToLEHex(BigInt(0))}${u64ToLEHex(orderPrice)}00`
  // seller sudt_amount = 100 - 4*1.003*10^8 = 5988000000
  const bobSellerCellData = `0x${u128ToLEHex(BigInt(5988000000))}${u128ToLEHex(BigInt(0))}${u64ToLEHex(orderPrice)}01`
  const diffCapacity = BigInt(200) * CKB_DECIMAL

  await createDealMakerTx(
    DEAL_MAKER_PRIVATE_KEY,
    dealMakerArgs,
    aliceArgs,
    bobArgs,
    buyerOutPoint,
    sellerOutPoint,
    aliceBuyerCellData,
    bobSellerCellData,
    diffCapacity,
  )
}

createDealMakerOrderTx()
