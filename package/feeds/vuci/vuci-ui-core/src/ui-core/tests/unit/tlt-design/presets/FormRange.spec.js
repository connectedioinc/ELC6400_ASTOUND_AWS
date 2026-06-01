import createWrapper from '../../mockFactory'
import FormRange from '@ui-core/tlt-design/presets/FormRange.vue'

describe('FormRange.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(FormRange, {
      global: {
        stubs: {
          'tlt-form-item-input': true
        }
      },
      props: {
        column: {
          dataIndex: 'test',
          actions: { filter: {} }
        },
        filters: {
          selected: {
            from: '',
            to: ''
          }
        }
      }
    })
  })
  afterAll(() => vi.resetAllMocks())

  it('onSubmit emits apply event', () => {
    wrapper.vm.selected = {
      from: 15,
      to: 25
    }
    wrapper.vm.onSubmit()
    expect(wrapper.emitted()['apply'][0]).toEqual([{ from: 15, to: 25 }])
  })
  it('onReset sets function in filters object to null', () => {
    wrapper.vm.onReset()
    expect(wrapper.emitted('reset')).toBeTruthy()
  })
})
