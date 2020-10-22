const U128_MAX = BigInt(2) ** BigInt(128) - BigInt(1)
const U128_MIN = BigInt(0)

const u64ToLEHex = u64 => {
  if (typeof u64 !== 'bigint') {
    throw new Error('u64 must be bigint')
  }
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(u64, 0)
  return buf.toString('hex')
}

const leHexToU64 = hex => {
  if (typeof hex !== 'string') {
    throw new Error('Little endian hex must be string')
  }
  if (hex.length !== 18 || !hex.startsWith('0x')) {
    throw new Error('Little endian hex format error')
  }
  const buf = Buffer.from(hex.slice(2), 'hex')
  return buf.readBigUInt64LE(0)
}

const u128ToLEHex = u128 => {
  if (typeof u128 !== 'bigint') {
    throw new Error('u128 must be bigint')
  }
  if (u128 < U128_MIN) {
    throw new Error(`u128 ${u128} too small`)
  }
  if (u128 > U128_MAX) {
    throw new Error(`u128 ${u128} too large`)
  }
  const buf = Buffer.alloc(16)
  buf.writeBigUInt64LE(u128 & BigInt('0xFFFFFFFFFFFFFFFF'), 0)
  buf.writeBigUInt64LE(u128 >> BigInt(64), 8)
  return buf.toString('hex')
}

const leHexToU128 = hex => {
  if (typeof hex !== 'string') {
    throw new Error('Little endian hex must be string')
  }
  if (hex.length !== 34 || !hex.startsWith('0x')) {
    throw new Error('Little endian hex format error')
  }
  const buf = Buffer.from(hex.slice(2), 'hex')
  return (buf.readBigUInt64LE(8) << BigInt(64)) + buf.readBigUInt64LE(0)
}

const getAmountFromCellData = hex => {
  try {
    return leHexToU128(hex.slice(0, 34))
  } catch (error) {
    return BigInt(0)
  }
}

module.exports = {
  u64ToLEHex,
  leHexToU64,
  u128ToLEHex,
  leHexToU128,
  getAmountFromCellData,
}
