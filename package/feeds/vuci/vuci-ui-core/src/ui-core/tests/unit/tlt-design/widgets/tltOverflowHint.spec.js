import createWrapper from '../../mockFactory'
import tltOverflowHint from '@ui-core/tlt-design/widgets/tltOverflowHint.vue'

describe('TltOverflowHint.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(tltOverflowHint, {
      slots: { default: '<div>test1</div><div>test2</div><div>test3</div>' },
      global: {
        stubs: {
          TltPopover: true,
          TltHint: { template: '<div><slot /></div>' }
        }
      }
    })
  })
  it('returns concatenated text content of element children', () => {
    expect(wrapper.vm.textElement.textContent).toEqual('test1test2test3')
  })
})
