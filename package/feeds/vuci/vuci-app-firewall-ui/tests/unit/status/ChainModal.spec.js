import ChainModal from '../../../src/views/status/ChainModal.vue'
import createWrapper from '@tests/unit/mockFactory'
import { FormOptionKey } from '../../../src/views/status/IptablesCommon.ts'
import { ref } from 'vue'

describe('ChainModal.vue', () => {
  let wrapperOptions
  let wrapper
  beforeEach(() => {
    wrapperOptions = {
      global: {
        stubs: { 'tlt-modal': { template: '<div></div>' } },
        provide: {
          [FormOptionKey]: {
            firewallStatus: ref([{ table: 'nat', chains: [{ chain: 'zone_lan_helper', rules: [] }] }])
          }
        }
      }
    }
    wrapper = createWrapper(ChainModal, wrapperOptions)
    wrapper.vm.currentTableName = 'nat'
  })

  it('returns current chain when it exists', async () => {
    wrapper.vm.breadcrums = ['zone_lan_helper']
    wrapper.vm.currentTableName = 'nat'
    expect(wrapper.vm.currentChain).toEqual({ chain: 'zone_lan_helper', rules: [] })
  })
  it('returns null when there is no chains', () => {
    expect(wrapper.vm.currentChain).toEqual(null)
  })
  it('returns current table', () => {
    wrapper.vm.breadcrums = []
    wrapper.vm.currentTableName = 'nat'
    wrapper.vm.firewallStatus = [{ table: 'filter' }, { table: 'nat' }, { table: 'mangle' }]
    expect(wrapper.vm.currentTable).toEqual({ table: 'nat' })
  })
  it('returns current References', () => {
    wrapper.vm.breadcrums = ['INPUT']
    wrapper.vm.currentTableName = 'nat'
    wrapper.vm.firewallStatus = [
      {
        table: 'nat',
        chains: [
          { chain: 'POSTROUTING' },
          { chain: 'PREROUTING' },
          { chain: 'OUTPUT' },
          {
            chain: 'INPUT',
            references: [
              { chain: 'POSTROUTING', count: 1 },
              { chain: 'OUTPUT', count: 1 }
            ]
          }
        ]
      }
    ]
    expect(wrapper.vm.currentReference).toEqual([{ chain: 'POSTROUTING' }, { chain: 'OUTPUT' }])
  })
  it('returns breadcrumps used for display', () => {
    wrapper.vm.breadcrums = ['POSTROUTING', 'PREROUTING', 'OUTPUT']
    wrapper.vm.currentTableName = 'nat'

    expect(wrapper.vm.displayedBreadcrums).toEqual(['"Nat" table', '"POSTROUTING" chain', '"PREROUTING" chain', '"OUTPUT" chain'])
  })
  it('removes one breadcrum', () => {
    wrapper.vm.breadcrums = ['POSTROUTING', 'PREROUTING', 'OUTPUT']
    wrapper.vm.currentTableName = 'nat'

    wrapper.vm.closeModal()
    expect(wrapper.vm.breadcrums).toEqual(['POSTROUTING', 'PREROUTING'])
  })
  it('opens modal', () => {
    wrapper.vm.breadcrums = ['POSTROUTING', 'PREROUTING', 'OUTPUT']
    wrapper.vm.currentTableName = ''
    wrapper.vm.openModal({ chain: 'PREROUTING', table: 'nat' })
    expect(wrapper.vm.currentTableName).toEqual('nat')
    expect(wrapper.vm.breadcrums).toEqual(['POSTROUTING', 'PREROUTING'])
  })
  it('opens modal with hilight', () => {
    wrapper.vm.breadcrums = ['POSTROUTING', 'PREROUTING', 'OUTPUT']
    wrapper.vm.currentTableName = ''
    wrapper.vm.openModal({ chain: 'PREROUTING', table: 'nat', target: 'OUTPUT' }, true)
    expect(wrapper.vm.currentTableName).toEqual('nat')
    expect(wrapper.vm.highlightedRule).toEqual({ chain: 'PREROUTING', table: 'nat', target: 'OUTPUT' })
    expect(wrapper.vm.breadcrums).toEqual(['POSTROUTING', 'PREROUTING'])
  })
  it.each`
    value                                                              | expectedResult
    ${['POSTROUTING', 'PREROUTING', 'OUTPUT']}                         | ${['POSTROUTING', 'PREROUTING', 'OUTPUT']}
    ${['POSTROUTING', 'PREROUTING', 'OUTPUT', 'PREROUTING', 'OUTPUT']} | ${['POSTROUTING', 'PREROUTING']}
    ${['POSTROUTING', 'INPUT', 'OUTPUT', 'PREROUTING', 'OUTPUT']}      | ${['POSTROUTING', 'INPUT', 'OUTPUT']}
  `('prunes breadcrums #%#', ({ value, expectedResult }) => {
    wrapper.vm.breadcrums = value
    wrapper.vm.pruneBreadrums()
    expect(wrapper.vm.breadcrums).toEqual(expectedResult)
  })
  it('returns chain', () => {
    wrapper.vm.currentTableName = 'nat'
    wrapper.vm.firewallStatus = [
      {
        table: 'nat',
        chains: [{ chain: 'POSTROUTING' }, { chain: 'PREROUTING', references: [] }, { chain: 'OUTPUT' }]
      }
    ]
    expect(wrapper.vm.getChainByName('PREROUTING')).toEqual({ chain: 'PREROUTING', references: [] })
  })
})
