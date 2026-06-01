import PrimaryMenuItem from '@/components/VuciLayout/src/VuciSideNavBar/PrimaryMenuItem.vue'
import createWrapper from '../../mockFactory'
describe('PrimaryMenuItem.vue', () => {
  it('calls _setSelected', () => {
    const wrapper = createWrapper(PrimaryMenuItem, {
      propsData: {
        name: 'System',
        path: 'test'
      }
    })
    expect(wrapper.vm.menuIcon).toEqual('system')
  })
})
