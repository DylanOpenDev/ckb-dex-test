const fetch = require('node-fetch')
const CKB = require('@nervosnetwork/ckb-sdk-core').default
const { scriptToHash } = require('@nervosnetwork/ckb-sdk-utils')
const { CKB_NODE_RPC, CKB_NODE_INDEX } = require('../utils/const')

const ckb = new CKB(CKB_NODE_RPC)
const FEE = BigInt(1000)

const secp256k1LockScript = async args => {
  const secp256k1Dep = (await ckb.loadDeps()).secp256k1Dep
  return {
    codeHash: secp256k1Dep.codeHash,
    hashType: secp256k1Dep.hashType,
    args,
  }
}

const generateLockArgs = privateKey => {
  const pubKey = ckb.utils.privateKeyToPublicKey(privateKey)
  return '0x' + ckb.utils.blake160(pubKey, 'hex')
}

const secp256k1LockHash = async args => {
  const lock = await secp256k1LockScript(args)
  return scriptToHash(lock)
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
      '0x64',
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

const getSUDTCells = async type => {
  let payload = {
    id: 1,
    jsonrpc: '2.0',
    method: 'get_cells',
    params: [
      {
        script: {
          code_hash: type.codeHash,
          hash_type: type.hashType,
          args: type.args,
        },
        script_type: 'type',
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
    console.log(res)
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

module.exports = {
  secp256k1LockScript,
  generateLockArgs,
  secp256k1LockHash,
  secp256k1Dep,
  getCells,
  getSUDTCells,
  collectInputs,
}
