import { ref } from 'vue'
import createWrapper from '@tests/unit/mockFactory'
import SMSUtilities from '../../src/views/services/SMSUtilities.vue'
import SMSUtilitiesEdit from '../../src/views/services/SMSUtilitiesEdit.vue'

vi.mock('@/plugins/io')

vi.mock('@/composables/useMobileUtilities', () => ({
  useMobileUtilitiesUtils: vi.fn(() => ({
    gpios: ref([{ type: 'gpio', direction: 'out', bi_dir: '1', id: 'gtest', io_name: 'io_gtest', block_pins: ['gwow', 'yes'] }]),
    relays: ref([{ type: 'relay', id: 'rtest', io_name: 'io_rtest', block_pins: ['rwow', 'yes'] }]),
    actions: ref(['iostatus'])
  }))
}))

describe('SMSUtilities.vue', () => {
  it('returns authorization value which exists in authorizationMethods', () => {
    const wrapper = createWrapper(SMSUtilities)
    const eVal = wrapper.vm.getAuthorizationTranslate('password')
    expect(eVal).toBe('By device admin password')
  })
  it('returns authorization value with no translations', () => {
    const wrapper = createWrapper(SMSUtilities)
    const eVal = wrapper.vm.getAuthorizationTranslate('bad')
    expect(eVal).toBe('bad')
  })
})

describe('SMSUtilitiesEdit.vue', () => {
  it('returns mapped outputs', () => {
    const wrapper = createWrapper(SMSUtilitiesEdit, {
      props: {
        section: { id: 'test', action: 'iostatus' }
      }
    })
    expect(wrapper.vm.outputs).toEqual([
      ['gtest', 'io_gtest (gwow,yes)'],
      ['rtest', 'io_rtest (rwow,yes)']
    ])
  })
  it.each`
    expectedResult | actions
    ${true}        | ${['iostatus']}
    ${false}       | ${['reboot']}
  `('returns $expectedResult when iomanExists', async ({ expectedResult, actions }) => {
    const wrapper = createWrapper(SMSUtilitiesEdit, {
      props: {
        section: { id: 'test', action: 'iostatus' }
      },
      global: {
        provide: {
          mobileUtilitiesOptions: ref({
            actions
          })
        }
      }
    })
    expect(wrapper.vm.iomanExists).toBe(expectedResult)
  })
  it('returns max sim count which is 2', () => {
    const wrapper = createWrapper(SMSUtilitiesEdit, {
      global: {
        provide: {
          mobileUtilitiesOptions: ref({
            mobileModems: [{ sim_count: '2' }, { sim_count: '1' }]
          })
        }
      },
      props: {
        section: { id: 'test' }
      }
    })
    wrapper.vm.$mobile.simCount = vi.fn().mockReturnValueOnce(2)
    expect(wrapper.vm.simCount).toBe(2)
  })
  it.each`
    script                  | isValid
    ${'#!/bin/sh\n'}        | ${true}
    ${'#!/bin/sh\n exit 0'} | ${true}
    ${'#!/bin/sh exit 0'}   | ${false}
    ${'#!/bin/sh'}          | ${false}
    ${'exit 0'}             | ${false}
  `('returns isValid: "$isValid" when script: $script', ({ script, isValid }) => {
    const wrapper = createWrapper(SMSUtilitiesEdit, {
      props: {
        section: { '.name': 'test', smstext: 'testText' }
      }
    })
    const result = wrapper.vm.validateScript(script)
    expect(result.isValid).toEqual(isValid)
  })
})
