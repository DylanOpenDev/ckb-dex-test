const CKB_NODE_RPC = 'http://localhost:8114'
const CKB_NODE_INDEX = 'https://testnet.ckb.dev/indexer_rpc'

const SUDTTypeScript = {
  codeHash: '0xc5e5dcf215925f7ef4dfaf5f4b4f105bc321c02776d6e7d52a1db3fcd9d011a4',
  hashType: 'type',
  args: '0xb74a976e3ceab91f27690b27473731d7ccdff45302bb082394a03cb97641edaa',
}

const SUDTDep = {
  outPoint: { txHash: '0xe12877ebd2c3c364dc46c5c992bcfaf4fee33fa13eebdf82c591fc9825aab769', index: '0x0' },
  depType: 'code',
}

const OrderBookLockScript = {
  codeHash: '0x6cfc6d734321ec13fcc90872158bcffa9e2b58482d76349c574178bcb22be6aa',
  hashType: 'type',
  args: '',
}

const OrderBookDep = {
  outPoint: { txHash: '0xcbb8c9e0b8756c868eac3e4c31fe7ea2d7f7c378d4761c557051f5cd8728a701', index: '0x0' },
  depType: 'depGroup',
}

module.exports = {
  CKB_NODE_RPC,
  CKB_NODE_INDEX,
  SUDTTypeScript,
  SUDTDep,
  OrderBookLockScript,
  OrderBookDep,
}
