import ProtoRip from '../../src/views/network/ProtoRip.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('ProtoRip network tests', () => {
  it.each([
    [
      { id: 'test1' },
      {
        access: [
          { target: 'test1', id: 'access1' },
          { target: 'test2', id: 'access2' },
          { target: 'test3', id: 'access3' }
        ]
      },
      {
        access: [
          { target: 'test2', id: 'access2' },
          { target: 'test3', id: 'access3' }
        ]
      }
    ],
    [
      { id: 'test15' },
      {
        access: [
          { target: 'test1', id: 'access1' },
          { target: 'test2', id: 'access2' },
          { target: 'test3', id: 'access3' }
        ]
      },
      {
        access: [
          { target: 'test1', id: 'access1' },
          { target: 'test2', id: 'access2' },
          { target: 'test3', id: 'access3' }
        ]
      }
    ]
  ])('deletes related filters with id %s', (id, uciData, expectedUciData) => {
    const wrapper = createWrapper(ProtoRip)
    wrapper.vm.deleteFiltersWithSameId(id, uciData)
    expect(uciData).toEqual(expectedUciData)
  })
})
