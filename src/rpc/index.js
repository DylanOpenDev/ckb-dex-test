const fetch = require('node-fetch')
const CKB = require('@nervosnetwork/ckb-sdk-core').default
const { scriptToHash, rawTransactionToHash } = require('@nervosnetwork/ckb-sdk-utils')
const { CKB_NODE_RPC, CKB_NODE_INDEX, SUDTTypeScript, SUDTDep, OrderBookLockScript, OrderBookDep } = require('../utils/const')

const ckb = new CKB(CKB_NODE_RPC)
const FEE = BigInt(1000)
const ORDER_CAPACITY = BigInt(400) * BigInt(100000000)
const FEE_CAPACITY = BigInt(100) * BigInt(100000000)
const NORMAL_MIN_CAPACITY = BigInt(61) * BigInt(100000000)

const secp256k1LockScript = async args => {
  const secp256k1Dep = (await ckb.loadDeps()).secp256k1Dep
  return {
    codeHash: secp256k1Dep.codeHash,
    hashType: secp256k1Dep.hashType,
    args,
  }
}

const secp256k1Dep = async () => {
  const secp256k1Dep = (await ckb.loadDeps()).secp256k1Dep
  return { outPoint: secp256k1Dep.outPoint, depType: 'depGroup' }
}

const getCells = async lock => {
  let payload = {
    id: 1,
    jsonrpc: '2.0',
    method: 'get_cells',
    params: [
      {
        script: {
          code_hash: lock.codeHash,
          hash_type: lock.hashType,
          args: lock.args,
        },
        script_type: 'lock',
      },
      'asc',
      '0x3e8',
    ],
  }
  const body = JSON.stringify(payload, null, '  ')
  try {
    let res = await fetch(CKB_NODE_INDEX, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })
    res = await res.json()
    return res.result.objects
  } catch (error) {
    console.error('error', error)
  }
}

const collectInputs = (cells, needCapacity) => {
  let inputs = []
  let sum = BigInt(0)
  cells.forEach(cell => {
    inputs.push({
      previousOutput: {
        txHash: cell.out_point.tx_hash,
        index: cell.out_point.index,
      },
      since: '0x0',
    })
    sum = sum + BigInt(cell.output.capacity)
    if (sum >= needCapacity + FEE) {
      return
    }
  })
  if (sum < needCapacity + FEE) {
    throw Error('Capacity not enough')
  }
  return { inputs, capacity: sum }
}

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

const generateDealMakerInputsOutputs = (buyerArgs, sellerArgs, buyerOutPoint, sellerOutPoint, diffCapacity) => {
  const orderInputs = [
    {
      previousOutput: {
        txHash: buyerOutPoint.txHash,
        index: buyerOutPoint.index,
      },
      since: '0x0',
    },
    {
      previousOutput: {
        txHash: sellerOutPoint.txHash,
        index: sellerOutPoint.index,
      },
      since: '0x0',
    },
  ]
  // buyer capacity reduce 0.3%
  const orderOutputs = [
    {
      capacity: `0x${(ORDER_CAPACITY - (diffCapacity * BigInt(1003)) / BigInt(1000)).toString(16)}`,
      lock: { ...OrderBookLockScript, args: buyerArgs },
      type: SUDTTypeScript,
    },
    {
      capacity: `0x${(ORDER_CAPACITY + diffCapacity).toString(16)}`,
      lock: { ...OrderBookLockScript, args: sellerArgs },
      type: SUDTTypeScript,
    },
  ]
  return { orderInputs, orderOutputs }
}

const createDealMakerTx = async (
  privateKey,
  args,
  buyerArgs,
  sellerArgs,
  buyerOutPoint,
  sellerOutPoint,
  buyerCellData,
  sellerCellData,
  diffCapacity,
) => {
  const dealMakerLock = await secp256k1LockScript(args)
  const liveCells = await getCells(dealMakerLock)
  const { orderInputs, orderOutputs } = generateDealMakerInputsOutputs(buyerArgs, sellerArgs, buyerOutPoint, sellerOutPoint, diffCapacity)
  const { inputs: normalInputs, capacity } = collectInputs(liveCells, FEE_CAPACITY)
  const normalOutput = {
    capacity: `0x${(capacity - FEE).toString(16)}`,
    lock: dealMakerLock,
    type: null,
  }
  const cellDeps = [SUDTDep, OrderBookDep, await secp256k1Dep()]
  const rawTx = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs: [...normalInputs, ...orderInputs],
    outputs: [normalOutput, ...orderOutputs],
    outputsData: ['0x', buyerCellData, sellerCellData],
  }
  rawTx.witnesses = rawTx.inputs.map((_, i) => (i > 0 ? '0x' : { lock: '', inputType: '', outputType: '' }))
  const keys = new Map()
  keys.set(scriptToHash(dealMakerLock), privateKey)
  keys.set(scriptToHash({ ...OrderBookLockScript, args: buyerArgs }), null)
  keys.set(scriptToHash({ ...OrderBookLockScript, args: sellerArgs }), null)
  const signedWitnesses = ckb.signWitnesses(keys)({
    transactionHash: rawTransactionToHash(rawTx),
    witnesses: rawTx.witnesses,
    inputCells: rawTx.inputs.map((input, index) => {
      return {
        outPoint: input.previousOutput,
        lock: index === 0 ? dealMakerLock : { ...OrderBookLockScript, args: buyerArgs },
      }
    }),
    skipMissingKeys: true,
  })
  const signedTx = { ...rawTx, witnesses: signedWitnesses }
  console.log(JSON.stringify(signedTx))
  const txHash = await ckb.rpc.sendTransaction(signedTx)
  console.info(`Creating deal maker tx has been sent with tx hash ${txHash}`)
  return txHash
}

module.exports = {
  createBuyOrderTx,
  createSellOrderTx,
  createDealMakerTx,
}
