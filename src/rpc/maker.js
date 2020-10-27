const CKB = require('@nervosnetwork/ckb-sdk-core').default
const { scriptToHash, rawTransactionToHash } = require('@nervosnetwork/ckb-sdk-utils')
const { secp256k1LockScript, secp256k1Dep, getCells, collectInputs, generateLockArgs, secp256k1LockHash } = require('./helper')
const { CKB_NODE_RPC, SUDTTypeScript, SUDTDep, OrderBookLockScript, OrderBookDep } = require('../utils/const')

const ckb = new CKB(CKB_NODE_RPC)
const FEE = BigInt(1000)
const ORDER_CAPACITY = BigInt(400) * BigInt(100000000)
const FEE_CAPACITY = BigInt(100) * BigInt(100000000)

const generateDealMakerInputsOutputs = async (buyerArgs, sellerArgs, buyerOutPoint, sellerOutPoint, diffCapacity) => {
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
      lock: { ...OrderBookLockScript, args: await secp256k1LockHash(buyerArgs) },
      type: SUDTTypeScript,
    },
    {
      capacity: `0x${(ORDER_CAPACITY + diffCapacity).toString(16)}`,
      lock: { ...OrderBookLockScript, args: await secp256k1LockHash(sellerArgs) },
      type: SUDTTypeScript,
    },
  ]
  return { orderInputs, orderOutputs }
}

const createDealMakerTx = async (
  privateKey,
  buyerArgs,
  sellerArgs,
  buyerOutPoint,
  sellerOutPoint,
  buyerCellData,
  sellerCellData,
  diffCapacity,
) => {
  const dealMakerArgs = generateLockArgs(privateKey)
  const dealMakerLock = await secp256k1LockScript(dealMakerArgs)
  const liveCells = await getCells(dealMakerLock)
  const { orderInputs, orderOutputs } = await generateDealMakerInputsOutputs(
    buyerArgs,
    sellerArgs,
    buyerOutPoint,
    sellerOutPoint,
    diffCapacity,
  )
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
  createDealMakerTx,
}
