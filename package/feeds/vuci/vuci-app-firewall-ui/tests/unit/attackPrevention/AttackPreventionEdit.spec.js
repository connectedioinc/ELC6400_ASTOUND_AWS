import AttackPreventionEdit from '../../../src/views/network/attackPrevention/AttackPreventionEdit.vue'
import { FormOptionKey } from '../../../src/views/network/attackPrevention/AttackPreventionCommon'
import createWrapper from '@tests/unit/mockFactory'
import { ref, nextTick } from 'vue'

describe('AttackPreventionEdit.vue', () => {
  let wrapper
  let wrapperOptions = {
    props: {
      modelValue: {},
      'onUpdate:modelValue': e => wrapper.setProps({ modelValue: e }),
      type: 'http'
    },
    global: {
      provide: {
        [FormOptionKey]: {
          zones: ref(['lan', 'wan'])
        }
      }
    }
  }
  beforeEach(() => {
    wrapper = createWrapper(AttackPreventionEdit, wrapperOptions)
  })
  it('fixes data after load', async () => {
    await wrapper.setProps({ type: 'http', modelValue: { http: { limit_http: '1' } } })
    expect(wrapper.vm.afterLoad()).toEqual({ http: [{ limit_http: '1', id: 'general', '.type': 'defaults' }] })
  })
  it('fixes data after save', async () => {
    await wrapper.setProps({ type: 'http', modelValue: { http: { limit_http: '1', id: 'http' }, https: { limit_https: '1', id: 'https' } } })
    wrapper.vm.afterSave(undefined, { data: { limit_http: '0', id: 'general' } })
    await nextTick()
    expect(wrapper.props('modelValue')).toEqual({ http: { limit_http: '0', id: 'http' }, https: { limit_https: '1', id: 'https' } })
  })
})
