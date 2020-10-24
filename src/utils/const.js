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
  codeHash: '0x6982301f72a13f64ed63cbb8985ca22f8f38f90405f86bf6b661f69a01a1dedf',
  hashType: 'type',
  args: '',
}

const OrderBookDep = {
  outPoint: { txHash: '0x32f425601393d0162ac7f30f9c637f33ce3a64599d18108f65f98c27659d7be9', index: '0x0' },
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
