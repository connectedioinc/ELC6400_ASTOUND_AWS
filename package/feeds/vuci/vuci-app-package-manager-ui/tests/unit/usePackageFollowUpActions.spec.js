import createWrapper from '@tests/unit/mockFactory'
import { usePackageFollowUpActions } from '../../src/components/services/composables/actions/usePackageFollowUpActions'
import { defineComponent } from 'vue'
import { axios } from '@ui-core/plugins/axios'
import { useMainStore } from '@/stores/main'
import * as helper from '@ui-core/plugins/helper'
import { useMessages } from '@/stores/messages'

describe('useFollowUpActions', () => {
  let wrapper
  const TestComponent = defineComponent({
    setup() {
      return {
        ...usePackageFollowUpActions()
      }
    }
  })

  beforeEach(() => {
    wrapper = createWrapper(TestComponent)
  })

  it('should return follow up action list', () => {
    expect(wrapper.vm.followUpActionList).toEqual(['reboot', 'network_restart'])
  })

  it('should get follow up action', () => {
    expect(wrapper.vm.getFollowUpAction({ key1: 'val1', key2: 'val2', network_restart: true })).toEqual('network_restart')
  })

  it('should call axios.post and reconnect on success when handling follow up action', async () => {
    const store = useMainStore()
    store.spinning = 0

    vi.spyOn(axios, 'post').mockResolvedValueOnce({})
    const reconnectSpy = vi.spyOn(helper, 'reconnect')

    const actionOptions = {
      spinMessage: 'Reconnecting...',
      errorMessage: 'Error!',
      endpoint: '/api/followup'
    }

    await wrapper.vm.handleFollowUpAction(actionOptions)

    expect(store.spin).toHaveBeenCalledWith('Reconnecting...')
    expect(reconnectSpy).toHaveBeenCalledWith('Reconnecting...', { logout: false })
  })

  it('should show error when handling follow up action', async () => {
    const message = useMessages()
    vi.spyOn(axios, 'post').mockRejectedValueOnce({})
    const messageSpy = vi.spyOn(message, 'error')

    const actionOptions = {
      spinMessage: 'Reconnecting...',
      errorMessage: 'Error!',
      endpoint: '/api/followup'
    }

    await wrapper.vm.handleFollowUpAction(actionOptions)

    expect(messageSpy).toHaveBeenCalledWith('Error!')
  })
})
