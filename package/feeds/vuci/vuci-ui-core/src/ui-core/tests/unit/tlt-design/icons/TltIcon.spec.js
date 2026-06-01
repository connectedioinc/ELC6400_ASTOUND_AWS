import createWrapper from '../../mockFactory'
import TltIcon from '@ui-core/tlt-design/icons/TltIcon'

describe('TltIcon.vue', () => {
  const globalComponents = ['IconGlobalComponent', 'IconTest']
  it.each([
    { iconName: 'not-predef', res: false },
    { iconName: 'global-component', res: true }
  ])('isPredefinedIcon returns $res if icon is registered as Vue Component to root element', async ({ iconName, res }) => {
    const wrapper = createWrapper(TltIcon, {
      global: { stubs: globalComponents, components: ['IconGlobalComponent'] },
      props: {
        icon: iconName
      }
    })
    expect(wrapper.vm.isPredefinedIcon).toEqual(res)
  })
})
