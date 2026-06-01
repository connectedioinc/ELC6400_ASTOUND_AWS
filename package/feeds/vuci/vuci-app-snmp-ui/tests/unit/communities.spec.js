import createWrapper from '@tests/unit/mockFactory'
import CommunitiesEdit from '../../src/views/services/CommunitiesEdit.vue'
import Communities from '../../src/views/services/Communities.vue'

describe('CommunitiesEdit.vue', () => {
  it.each`
    res      | type
    ${false} | ${'com2sec'}
    ${true}  | ${'com2sec6'}
  `('returns $res when type is $type', ({ res, type }) => {
    const wrapper = createWrapper(CommunitiesEdit, {
      props: { section: { '.type': type } }
    })
    expect(wrapper.vm.isSec6).toBe(res)
  })
  it.each`
    res         | isSec6
    ${'SNMPv6'} | ${true}
    ${'SNMP'}   | ${false}
  `('returns section title $res when section isSec6 is $isSec6', ({ res, isSec6 }) => {
    const wrapper = createWrapper(CommunitiesEdit, {
      props: { section: {} },
      computed: { ...CommunitiesEdit.computed, isSec6: () => isSec6 }
    })
    expect(wrapper.vm.sectionTitle).toBe(res)
  })
  it.each`
    res                 | isSec6
    ${'communities_v6'} | ${true}
    ${'communities'}    | ${false}
  `('returns section key $res when section isSec6 is $isSec6', ({ res, isSec6 }) => {
    const wrapper = createWrapper(CommunitiesEdit, {
      props: { section: {} },
      computed: { ...CommunitiesEdit.computed, isSec6: () => isSec6 }
    })
    expect(wrapper.vm.sectionKey).toBe(res)
  })
})
describe('Communities.vue', () => {
  it.each([
    [{ data: { errors: [{ code: 1 }] } }, 'SNMP service requires at least one community instance when it is enabled.'],
    [{ data: { errors: [{ code: 69420 }] } }, 'Failed to delete configuration']
  ])('returns device delete error messages', (error, response) => {
    const wrapper = createWrapper(Communities)
    expect(wrapper.vm.returnErrorMessage(error)).toEqual(response)
  })
})
