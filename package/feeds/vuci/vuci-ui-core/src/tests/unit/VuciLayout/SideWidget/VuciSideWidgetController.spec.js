import VuciSideWidgetController from '@/components/VuciLayout/src/SideWidget/VuciSideWidgetController.vue'
import createWrapper from '../../mockFactory'

describe('VuciSideWidgetController.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(VuciSideWidgetController, {
      global: {
        mocks: {
          $route: {
            meta: { title: 'Overview' }
          }
        }
      }
    })
  })
  it('opens side widget and sets component', async () => {
    wrapper.vm.buttonClick('div')
    expect(wrapper.vm.opened).toBeTruthy()
    expect(wrapper.vm.widgetComponent).toBe('div')
  })
  it('closes widget', async () => {
    await wrapper.setData({ opened: true })
    wrapper.vm.closeWidget()
    expect(wrapper.vm.opened).toBeFalsy()
  })
  it('checks if widget is visible', () => {
    expect(wrapper.vm.visible).toBeTruthy()
  })
})
