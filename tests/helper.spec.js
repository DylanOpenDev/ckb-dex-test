const { generateLockArgs } = require('../src/rpc/helper')

describe('RPC helper', () => {
  test('generateLockArgs', () => {
    expect(generateLockArgs('0xd366683d8e9297e1649eb02fbd1dac523f6daa234d355d1ac6ee2735f646bdce')).toBe(
      '0x4be6cd2624ae852900ed3d65447c5ad8327f3ed9',
    )
  })
})
