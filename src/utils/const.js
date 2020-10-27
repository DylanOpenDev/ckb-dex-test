const CKB_NODE_RPC = 'http://localhost:8114'
const CKB_NODE_INDEX = 'http://prototype.ckbapp.dev/testnet/indexer'

const SUDTTypeScript = {
  codeHash: '0xc5e5dcf215925f7ef4dfaf5f4b4f105bc321c02776d6e7d52a1db3fcd9d011a4',
  hashType: 'type',
  args: '0x6fe3733cd9df22d05b8a70f7b505d0fb67fb58fb88693217135ff5079713e902',
}

const SUDTDep = {
  outPoint: { txHash: '0xe12877ebd2c3c364dc46c5c992bcfaf4fee33fa13eebdf82c591fc9825aab769', index: '0x0' },
  depType: 'code',
}

const OrderBookLockScript = {
  codeHash: '0x9c833b9ebd4259ca044d2c47c5e51b7fc25380b07291e54b248d3808f08ed7fd',
  hashType: 'type',
  args: '',
}

const OrderBookDep = {
  outPoint: { txHash: '0xcdfd397823f6a130294c72fbe397c469d459b83db401296c291db7b170b15839', index: '0x0' },
  depType: 'code',
}

module.exports = {
  CKB_NODE_RPC,
  CKB_NODE_INDEX,
  SUDTTypeScript,
  SUDTDep,
  OrderBookLockScript,
  OrderBookDep,
}
