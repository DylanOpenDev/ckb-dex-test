const CKB = require('@nervosnetwork/ckb-sdk-core').default
const { scriptToHash, rawTransactionToHash } = require('@nervosnetwork/ckb-sdk-utils')
const { secp256k1LockScript, secp256k1Dep, getCells, collectInputs, generateLockArgs, secp256k1LockHash } = require('./helper')
const { CKB_NODE_RPC, SUDTTypeScript, SUDTDep, OrderBookLockScript, OrderBookDep } = require('../utils/const')

const ckb = new CKB(CKB_NODE_RPC)
const FEE = BigInt(1000)
const ORDER_CAPACITY = BigInt(400) * BigInt(100000000)
const NORMAL_MIN_CAPACITY = BigInt(61) * BigInt(100000000)

const generateOrderOutputs = async (args, inputCapacity) => {
  const secp256k1Lock = await secp256k1LockScript(args)
  const orderLock = { ...OrderBookLockScript, args: await secp256k1LockHash(args) }
  let outputs = [
    {
      capacity: `0x${ORDER_CAPACITY.toString(16)}`,
      lock: orderLock,
      type: SUDTTypeScript,
    },
  ]
  const changeCapacity = inputCapacity - FEE - ORDER_CAPACITY
  outputs.push({
    capacity: `0x${changeCapacity.toString(16)}`,
    lock: secp256k1Lock,
    type: null,
  })
  return outputs
}

const generateSUDTOrderInputsOutputs = async (args, cells) => {
  let inputs = []
  let outputs = []
  const orderLock = { ...OrderBookLockScript, args: await secp256k1LockHash(args) }
  for (let cell of cells) {
    if (cell.output.type && cell.output.type.code_hash === SUDTTypeScript.codeHash && BigInt(cell.output.capacity) === ORDER_CAPACITY) {
      inputs.push({
        previousOutput: {
          txHash: cell.out_point.tx_hash,
          index: cell.out_point.index,
        },
        since: '0x0',
      })
      outputs.push({
        capacity: cell.output.capacity,
        lock: orderLock,
        type: SUDTTypeScript,
      })
      break
    }
  }
  let normalInputs = []
  let sum = BigInt(0)
  for (let cell of cells) {
    if (cell.output.type == null) {
      normalInputs.push({
        previousOutput: {
          txHash: cell.out_point.tx_hash,
          index: cell.out_point.index,
        },
        since: '0x0',
      })
      sum = sum + BigInt(cell.output.capacity)
      if (sum >= NORMAL_MIN_CAPACITY + FEE) {
        break
      }
    }
  }
  if (sum < NORMAL_MIN_CAPACITY + FEE) {
    throw Error('Capacity not enough')
  }
  inputs = [...inputs, ...normalInputs]
  const secp256k1Lock = await secp256k1LockScript(args)
  outputs.push({
    capacity: `0x${(sum - FEE).toString(16)}`,
    lock: secp256k1Lock,
    type: null,
  })
  return { inputs, outputs }
}

const createBuyOrderTx = async (privateKey, orderData) => {
  const args = generateLockArgs(privateKey)
  const liveCells = await getCells(await secp256k1LockScript(args))
  const { inputs, capacity } = collectInputs(liveCells, ORDER_CAPACITY)
  const outputs = await generateOrderOutputs(args, capacity)
  const cellDeps = [SUDTDep, await secp256k1Dep()]
  const rawTx = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData: [orderData, '0x'],
  }
  rawTx.witnesses = rawTx.inputs.map((_, i) => (i > 0 ? '0x' : { lock: '', inputType: '', outputType: '' }))
  const signedTx = ckb.signTransaction(privateKey)(rawTx)
  console.log(JSON.stringify(signedTx))
  const txHash = await ckb.rpc.sendTransaction(signedTx)
  console.info(`Creating order tx has been sent with tx hash ${txHash}`)
  return txHash
}

const createSellOrderTx = async (privateKey, orderData) => {
  const args = generateLockArgs(privateKey)
  const liveCells = await getCells(await secp256k1LockScript(args))
  const { inputs, outputs } = await generateSUDTOrderInputsOutputs(args, liveCells)
  const cellDeps = [SUDTDep, await secp256k1Dep()]
  const rawTx = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData: [orderData, '0x'],
  }
  rawTx.witnesses = rawTx.inputs.map((_, i) => (i > 0 ? '0x' : { lock: '', inputType: '', outputType: '' }))
  console.log(JSON.stringify(rawTx))
  const signedTx = ckb.signTransaction(privateKey)(rawTx)
  const txHash = await ckb.rpc.sendTransaction(signedTx)
  console.info(`Creating order tx has been sent with tx hash ${txHash}`)
  return txHash
}

const cancelOrderTx = async (privateKey, sellerOutPoint, inputCapacity) => {
  const args = generateLockArgs(privateKey)
  const liveCells = await getCells(await secp256k1LockScript(args))
  const { inputs, capacity } = collectInputs(liveCells, NORMAL_MIN_CAPACITY)
  const secp256k1Lock = await secp256k1LockScript(args)
  const orderLock = { ...OrderBookLockScript, args: await secp256k1LockHash(args) }
  const cellDeps = [OrderBookDep, await secp256k1Dep(), SUDTDep]
  const rawTx = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs: [
      {
        previousOutput: {
          txHash: sellerOutPoint.txHash,
          index: sellerOutPoint.index,
        },
        since: '0x0',
      },
      ...inputs,
    ],
    outputs: [
      {
        capacity: `0x${(inputCapacity + capacity - FEE).toString(16)}`,
        lock: secp256k1Lock,
        type: null,
      },
    ],
    outputsData: ['0x'],
  }
  rawTx.witnesses = rawTx.inputs.map((_, i) => (i === 1 ? { lock: '', inputType: '', outputType: '' } : '0x'))

  const keys = new Map()
  keys.set(scriptToHash(orderLock), null)
  keys.set(scriptToHash(secp256k1Lock), privateKey)
  const signedWitnesses = ckb.signWitnesses(keys)({
    transactionHash: rawTransactionToHash(rawTx),
    witnesses: rawTx.witnesses,
    inputCells: rawTx.inputs.map((input, index) => {
      return {
        outPoint: input.previousOutput,
        lock: index === 0 ? orderLock : secp256k1Lock,
      }
    }),
    skipMissingKeys: true,
  })
  const signedTx = { ...rawTx, witnesses: signedWitnesses }
  console.log(JSON.stringify(signedTx))
  const txHash = await ckb.rpc.sendTransaction(signedTx)
  console.info(`Cancel order tx has been sent with tx hash ${txHash}`)
  return txHash
}

module.exports = {
  createBuyOrderTx,
  createSellOrderTx,
  cancelOrderTx,
}
