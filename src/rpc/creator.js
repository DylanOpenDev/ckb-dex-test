const CKB = require('@nervosnetwork/ckb-sdk-core').default
const { secp256k1LockScript, secp256k1Dep, getCells, collectInputs } = require('./helper')
const { CKB_NODE_RPC, SUDTTypeScript, SUDTDep, OrderBookLockScript, OrderBookDep } = require('../utils/const')

const ckb = new CKB(CKB_NODE_RPC)
const FEE = BigInt(1000)
const ORDER_CAPACITY = BigInt(400) * BigInt(100000000)
const NORMAL_MIN_CAPACITY = BigInt(61) * BigInt(100000000)

const generateOrderOutputs = async (args, inputCapacity) => {
  const secp256k1Lock = await secp256k1LockScript(args)
  const orderLock = { ...OrderBookLockScript, args }
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
  const orderLock = { ...OrderBookLockScript, args }
  cells.forEach(cell => {
    if (cell.output.type && cell.output.type.code_hash === SUDTTypeScript.codeHash) {
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
      return
    }
  })
  let normalInputs = []
  let sum = BigInt(0)
  cells.forEach(cell => {
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
        return
      }
    }
  })
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

const createBuyOrderTx = async (privateKey, args, orderData) => {
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

const createSellOrderTx = async (privateKey, args, orderData) => {
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

const cancelOrderTx = async (privateKey, args, sellerOutPoint, inputCapacity) => {
  const cellDeps = [OrderBookDep, await secp256k1Dep(), SUDTDep]
  const secp256k1Lock = await secp256k1LockScript(args)
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
    ],
    outputs: [
      {
        capacity: `0x${(inputCapacity - FEE).toString(16)}`,
        lock: secp256k1Lock,
        type: null,
      },
    ],
    outputsData: ['0x'],
  }
  rawTx.witnesses = rawTx.inputs.map((_, i) => (i > 0 ? '0x' : { lock: '', inputType: '', outputType: '' }))
  const signedTx = ckb.signTransaction(privateKey)(rawTx)
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
