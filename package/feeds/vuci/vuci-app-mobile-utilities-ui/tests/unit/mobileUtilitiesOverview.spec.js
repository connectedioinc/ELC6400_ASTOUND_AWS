import createWrapper from '@tests/unit/mockFactory'
import UtilitiesOverview from '@/components/shared/MobileUtilities/MobileUtilitiesOverviewSection.vue'

describe('UtilitiesOverview.vue', () => {
  const props = {
    uciData: {
      sms_utilities: [
        { id: 'rule1', enabled: '1' },
        { id: 'rule2', enabled: '0' },
        { id: 'rule3', enabled: '1' }
      ],
      call_utilities: [
        { id: 'ruleA', enabled: '0' },
        { id: 'ruleB', enabled: '1' }
      ]
    },
    dataKey: 'sms_utilities' // Mock dataKey
  }
  it('should disable all selected rules if they are all enabled', () => {
    const wrapper = createWrapper(UtilitiesOverview, {
      props
    })
    const selectedIds = ['rule1', 'rule3']
    wrapper.vm.toggleRulesSwitch(selectedIds)
    expect(wrapper.vm.uciData.sms_utilities.find(rule => rule.id === 'rule1')?.enabled).toBe('0')
    expect(wrapper.vm.uciData.sms_utilities.find(rule => rule.id === 'rule3')?.enabled).toBe('0')
  })
  it('should enable all selected rules if at least one is disabled', () => {
    const wrapper = createWrapper(UtilitiesOverview, {
      props
    })
    const selectedIds = ['rule1', 'rule2']
    wrapper.vm.toggleRulesSwitch(selectedIds)
    expect(wrapper.vm.uciData.sms_utilities.find(rule => rule.id === 'rule1')?.enabled).toBe('1')
    expect(wrapper.vm.uciData.sms_utilities.find(rule => rule.id === 'rule2')?.enabled).toBe('1')
  })

  it('should work with call utilities', () => {
    const wrapper = createWrapper(UtilitiesOverview, {
      props: {
        uciData: props.uciData,
        dataKey: 'call_utilities'
      }
    })
    const selectedIds = ['ruleA', 'ruleB']
    wrapper.vm.toggleRulesSwitch(selectedIds)
    expect(wrapper.vm.uciData.call_utilities.find(rule => rule.id === 'ruleA')?.enabled).toBe('1')
    expect(wrapper.vm.uciData.call_utilities.find(rule => rule.id === 'ruleB')?.enabled).toBe('1')
  })
})
