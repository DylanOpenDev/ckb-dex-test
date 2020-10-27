const CKB = require('@nervosnetwork/ckb-sdk-core').default
const { secp256k1LockScript, secp256k1Dep, getCells, getSUDTCells, collectInputs, secp256k1LockHash } = require('../rpc/helper')
const { CKB_NODE_RPC, SUDTDep, SUDTTypeScript, OrderBookLockScript } = require('../utils/const')
const { u128ToLEHex, u64ToLEHex, leHexToU128 } = require('../utils/buffer')

const ckb = new CKB(CKB_NODE_RPC)
const FEE = BigInt(10000)
const BUYER_CAPACITY = BigInt(400) * BigInt(100000000)
const SELLER_CAPACITY = BigInt(200) * BigInt(100000000)
const SUDT_DECIMAL = BigInt(10) ** BigInt(8)
const CKB_DECIMAL = BigInt(10) ** BigInt(8)
const PRICE_DECIMAL = BigInt(10) ** BigInt(10)
const SPLIT_COUNT = 10

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

const splitBuyOrderCells = async privateKey => {
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
  console.log(JSON.stringify(signedTx))
  const txHash = await ckb.rpc.sendTransaction(signedTx)
  console.info(`Split cells has been sent with tx hash ${txHash}`)
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

const splitSellOrderCells = async privateKey => {
  let pubKey = ckb.utils.privateKeyToPublicKey(privateKey)
  const args = '0x' + ckb.utils.blake160(pubKey, 'hex')
  const udtLiveCells = (await getSUDTCells(batchUDTType)).filter(cell => cell.output.capacity > SELLER_CAPACITY * BigInt(SPLIT_COUNT))
  const udtCell = udtLiveCells[0]
  console.log(udtCell)
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
  console.log(JSON.stringify(rawTx))
  const signedTx = ckb.signTransaction(privateKey)(rawTx)
  const txHash = await ckb.rpc.sendTransaction(signedTx)
  console.info(`Creating order tx has been sent with tx hash ${txHash}`)
  return txHash
}

// splitBuyOrderCells('0xa664b96648920d1b8bed64f166ceba73069270ecc832ab6eda45f57e90945987')
splitSellOrderCells('0xc4c217576b0b3e908be7460745768bf18691199b6d9541af1a361f4cfe313a94')
