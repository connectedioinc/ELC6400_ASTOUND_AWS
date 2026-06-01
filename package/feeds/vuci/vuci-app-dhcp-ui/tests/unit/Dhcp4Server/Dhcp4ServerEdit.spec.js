import view from '../../../src/views/network/Dhcp4Server/Dhcp4ServerEdit.vue'
import createWrapper, { combineDeep } from '@tests/unit/mockFactory'
import { ref } from 'vue'
import { FormOptionKey } from '../../../src/views/network/Dhcp4Server/Dhcp4ServerCommon'

let wrapper
const wrapperOptions = {
  global: {
    provide: {
      [FormOptionKey]: {
        interfaceData: ref([])
      }
    }
  },
  props: { section: {} }
}
beforeEach(() => {
  wrapper = createWrapper(view, wrapperOptions)
})

describe('Dhcp4ServerEdit.vue', () => {
  it('returns interface section', () => {
    wrapper = createWrapper(
      view,
      combineDeep(wrapperOptions, {
        global: {
          provide: {
            [FormOptionKey]: {
              interfaceData: ref([
                { id: 'lan', proto: 'static' },
                { id: 'lan1', proto: 'static' }
              ])
            }
          }
        },
        props: { section: { id: 'lan1' } }
      })
    )
    expect(wrapper.vm.interfaceSection).toEqual({ id: 'lan1', proto: 'static' })
  })
  it.each`
    hasPackages | isSwitch
    ${true}     | ${false}
    ${false}    | ${false}
  `('returns tabs when all shows #%#', async ({ hasPackages, isSwitch }) => {
    wrapper.vm.$store.hasPackages = vi.fn().mockReturnValue(hasPackages)
    wrapper.vm.$store.isSwitch = isSwitch
    await wrapper.setProps({ section: { mode: 'server', enable_dhcpv4: '1' } })
    expect(wrapper.vm.tabs).toEqual([
      {
        name: 'general',
        title: 'General Setup'
      },
      {
        show: true,
        name: 'advanced',
        title: 'Advanced Settings'
      }
    ])
  })

  it.each`
    hasPackages | isSwitch
    ${true}     | ${true}
    ${true}     | ${false}
    ${false}    | ${true}
  `('returns tabs when all show: false #%#', async ({ hasPackages, isSwitch }) => {
    wrapper.vm.$store.hasPackages = vi.fn().mockReturnValue(hasPackages)
    wrapper.vm.$store.isSwitch = isSwitch
    await wrapper.setProps({ section: { enable_dhcpv4: '0' } })
    expect(wrapper.vm.tabs).toEqual([
      {
        name: 'general',
        title: 'General Setup'
      },
      {
        show: false,
        name: 'advanced',
        title: 'Advanced Settings'
      }
    ])
  })
})
