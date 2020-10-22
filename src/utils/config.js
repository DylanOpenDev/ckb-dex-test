require('dotenv').config()
const DEAL_MAKER_PRIVATE_KEY = process.env.DEAL_MAKER_PRIVATE_KEY || '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
const ALICE_PRIVATE_KEY = process.env.ALICE_PRIVATE_KEY || '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
const BOB_PRIVATE_KEY = process.env.BOB_PRIVATE_KEY || '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

module.exports = {
  DEAL_MAKER_PRIVATE_KEY,
  ALICE_PRIVATE_KEY,
  BOB_PRIVATE_KEY,
}
