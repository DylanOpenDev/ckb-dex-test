const CKB = require('@nervosnetwork/ckb-sdk-core').default
const { secp256k1LockScript, secp256k1Dep, getCells, getSUDTCells, collectInputs, secp256k1LockHash } = require('../rpc/helper')
const { CKB_NODE_RPC, SUDTDep, SUDTTypeScript, OrderBookLockScript } = require('../utils/const')
const { u128ToLEHex, u64ToLEHex, leHexToU128 } = require('../utils/buffer')
const { BATCH_ALICE_PRIVATE_KEY, BATCH_BOB_PRIVATE_KEY } = require('../utils/config')

const ckb = new CKB(CKB_NODE_RPC)
const FEE = BigInt(100000)
const BUYER_CAPACITY = BigInt(400) * BigInt(100000000)
const SELLER_CAPACITY = BigInt(200) * BigInt(100000000)
const SUDT_DECIMAL = BigInt(10) ** BigInt(8)
const CKB_DECIMAL = BigInt(10) ** BigInt(8)
const PRICE_DECIMAL = BigInt(10) ** BigInt(10)
const SPLIT_COUNT = 2

const batchUDTType = { ...SUDTTypeScript, args: '0xa1b0cb1a3e2c49ff91bfc884a2cb428bae8cac5eea8152629612673cef9d1940' }

const getRandomInt = max => {
  return Math.floor(Math.random() * Math.floor(max - 1)) + 1
}

const multiOutputs = async (args, count, inputCapacity) => {
  const lock = await secp256k1LockScript(args)
  const orderLock = { ...OrderBookLockScript, args: await secp256k1LockHash(args) }
  if (count <= 0) return []
  let outputs = []
  let len = count
  while (len--) {
    outputs.push({ capacity: `0x${BUYER_CAPACITY.toString(16)}`, lock: orderLock, type: batchUDTType })
  }
  outputs.push({ capacity: `0x${(inputCapacity - BUYER_CAPACITY * BigInt(count) - FEE).toString(16)}`, lock, type: null })
  return outputs
}

const multiBuyOrderData = count => {
  let orderDataList = []
  for (let index = 0; index < count; index++) {
    const data = `0x${u128ToLEHex(BigInt(0))}${u128ToLEHex(BigInt(getRandomInt(10)) * SUDT_DECIMAL)}${u64ToLEHex(
      BigInt(getRandomInt(10)) * PRICE_DECIMAL,
    )}00`
    orderDataList.push(data)
  }
  return orderDataList
}

const batchBuyOrders = async privateKey => {
  let pubKey = ckb.utils.privateKeyToPublicKey(privateKey)
  const args = '0x' + ckb.utils.blake160(pubKey, 'hex')
  const liveCells = await getCells(await secp256k1LockScript(args))
  const { inputs, capacity } = collectInputs(liveCells, BUYER_CAPACITY * BigInt(SPLIT_COUNT))
  const outputs = await multiOutputs(args, SPLIT_COUNT, capacity)
  const cellDeps = [await secp256k1Dep(), SUDTDep]
  const rawTx = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData: [...multiBuyOrderData(SPLIT_COUNT), '0x'],
  }
  rawTx.witnesses = rawTx.inputs.map((_, i) => (i > 0 ? '0x' : { lock: '', inputType: '', outputType: '' }))
  const signedTx = ckb.signTransaction(privateKey)(rawTx)
  const txHash = await ckb.rpc.sendTransaction(signedTx)
  console.info(`Creating buy orders has been sent with tx hash ${txHash}`)
  return txHash
}

const multiSellerOutputs = async (args, count, inputCapacity) => {
  const lock = await secp256k1LockScript(args)
  const orderLock = { ...OrderBookLockScript, args: await secp256k1LockHash(args) }
  if (count <= 0) return []
  let outputs = []
  let len = count
  while (len--) {
    outputs.push({ capacity: `0x${SELLER_CAPACITY.toString(16)}`, lock: orderLock, type: batchUDTType })
  }
  outputs.push({ capacity: `0x${(inputCapacity - SELLER_CAPACITY * BigInt(count) - FEE).toString(16)}`, lock, type: batchUDTType })
  return outputs
}

const multiSellOrderData = (count, sudtAmount) => {
  let orderDataList = []
  for (let index = 0; index < count; index++) {
    const data = `0x${u128ToLEHex(BigInt(20) * SUDT_DECIMAL)}${u128ToLEHex(BigInt(getRandomInt(10)) * CKB_DECIMAL)}${u64ToLEHex(
      BigInt(getRandomInt(10)) * PRICE_DECIMAL,
    )}01`
    orderDataList.push(data)
  }
  orderDataList.push(`0x${u128ToLEHex(sudtAmount - BigInt(20 * count))}`)
  return orderDataList
}

const batchSellOrders = async privateKey => {
  let pubKey = ckb.utils.privateKeyToPublicKey(privateKey)
  const args = '0x' + ckb.utils.blake160(pubKey, 'hex')
  const udtLiveCells = (await getSUDTCells(batchUDTType)).filter(cell => cell.output.capacity > SELLER_CAPACITY * BigInt(SPLIT_COUNT))
  const udtCell = udtLiveCells[0]
  const sudtAmount = leHexToU128(udtCell.output_data)
  const inputs = [
    {
      previousOutput: {
        txHash: udtCell.out_point.tx_hash,
        index: udtCell.out_point.index,
      },
      since: '0x0',
    },
  ]
  const outputs = await multiSellerOutputs(args, SPLIT_COUNT, BigInt(udtCell.output.capacity))
  const cellDeps = [SUDTDep, await secp256k1Dep()]
  const rawTx = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData: multiSellOrderData(SPLIT_COUNT, sudtAmount),
  }
  rawTx.witnesses = rawTx.inputs.map((_, i) => (i > 0 ? '0x' : { lock: '', inputType: '', outputType: '' }))
  const signedTx = ckb.signTransaction(privateKey)(rawTx)
  const txHash = await ckb.rpc.sendTransaction(signedTx)
  console.info(`Creating sell orders has been sent with tx hash ${txHash}`)
  return txHash
}

batchBuyOrders(BATCH_ALICE_PRIVATE_KEY)
batchSellOrders(BATCH_BOB_PRIVATE_KEY)
