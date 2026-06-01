import Starlink from '../../src/views/status/Starlink.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'
import { useMessages, useNotifications, usePrompt } from '@/stores/messages'

vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ path: 'test' })),
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn()
    }))
  }
})

describe('Starlink.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(Starlink)
  })

  const status = {
    id: '0000-0000-0000-0000',
    hardware_version: 'rev3_proto2',
    software_version: '2025.07.09.mr59287.26677',
    currently_obstructed: true,
    fraction_obstructed: 0.5,
    boresight_azimuth_deg: 45.0,
    boresight_elevation_deg: 30.0,
    downlink_throughput: 1000000,
    uplink_throughput: 20000,
    pop_ping_latency_ms: 50,
    pop_ping_drop_rate: 2,
    mobility_class: 'mobile',
    alerts: {
      installPending: true,
      lowMotorCurrent: true
    }
  }

  it('computes cards data', () => {
    wrapper.vm.status = status
    const data = {
      antenna_card: {
        columns: [
          {
            hint: 'Whether the dish is currently obstructed.',
            label: 'Currently obstructed',
            name: 'currently_obstructed',
            value: 'Yes'
          },
          {
            hint: 'Fraction of the dish that is obstructed.',
            label: 'Fraction obstructed',
            name: 'fraction_obstructed',
            value: '50.00 %'
          },
          {
            hint: 'Boresight azimuth of the dish in degrees.',
            label: 'Boresight azimuth',
            name: 'boresight_azimuth_deg',
            value: '45.00 °'
          },
          {
            hint: 'Boresight elevation of the dish in degrees.',
            label: 'Boresight elevation',
            name: 'boresight_elevation_deg',
            value: '30.00 °'
          }
        ],
        name: 'antenna',
        title: 'Antenna'
      },
      hw_card: {
        columns: [
          {
            hint: 'ID of the Starlink dish.',
            label: 'ID',
            name: 'id',
            value: '0000-0000-0000-0000'
          },
          {
            hint: 'Hardware version of the Starlink dish.',
            label: 'Hardware version',
            name: 'hardware_version',
            value: 'rev3_proto2'
          },
          {
            hint: 'Software version of the Starlink dish.',
            label: 'Software version',
            name: 'software_version',
            value: '2025.07.09.mr59287.26677'
          }
        ],
        name: 'hardware_info',
        title: 'Hardware'
      },

      misc_card: {
        columns: [
          {
            hint: 'Mobility class of the Starlink dish.',
            label: 'Mobility class',
            name: 'mobility_class',
            value: 'Mobile'
          }
        ],
        name: 'misc',
        title: 'Misc'
      },
      network_card: {
        columns: [
          {
            hint: 'Downlink throughput of the Starlink dish.',
            label: 'Downlink throughput',
            name: 'downlink_throughput',
            value: '1 Mbps'
          },
          {
            hint: 'Uplink throughput of the Starlink dish.',
            label: 'Uplink throughput',
            name: 'uplink_throughput',
            value: '20 Kbps'
          },
          {
            hint: 'Ping latency to the Starlink Point of Presence (PoP) in milliseconds.',
            label: 'Pop ping latency',
            name: 'pop_ping_latency',
            value: 'N/A'
          },
          {
            hint: 'Drop rate of pings to the Starlink Point of Presence (PoP).',
            label: 'Pop ping drop rate',
            name: 'pop_ping_drop_rate',
            value: 2
          }
        ],
        name: 'network_info',
        title: 'Network'
      }
    }

    expect(wrapper.vm.cards).toEqual(data)
  })

  describe('loads getStatus', () => {
    it('loads getStatus data', async () => {
      const notification = useNotifications()
      axios.get = vi.fn().mockResolvedValueOnce({ success: true, data: status })
      const spy = vi.spyOn(notification, 'info')
      const spy2 = vi.spyOn(notification, 'warning')
      await wrapper.vm.getStatus()
      expect(wrapper.vm.status).toEqual(status)
      expect(spy).toHaveBeenCalledWith({
        id: 'starlink-alert-installPending',
        text: 'Dish update installation is pending'
      })
      expect(spy2).toHaveBeenCalledWith({
        id: 'starlink-alert-lowMotorCurrent',
        text: 'Dish is experiencing low motor current'
      })
    })

    it('checks if getStatus return error message', async () => {
      const message = useMessages()
      axios.get = vi.fn().mockRejectedValueOnce()
      const spy = vi.spyOn(message, 'error')
      await wrapper.vm.getStatus()
      expect(spy).toHaveBeenCalledWith('Failed to retrieve Starlink status')
      expect(wrapper.vm.errorCount).toBe(1)
    })

    it('checks if getStatus return error message', async () => {
      axios.get = vi.fn().mockRejectedValueOnce()
      wrapper.vm.errorCount = 10
      await wrapper.vm.getStatus()
      expect(wrapper.vm.errorCount).toBe(11)
    })
  })

  describe('handles prompt', () => {
    it('shows prompt for reboot action', () => {
      const action = {
        name: 'reboot',
        buttonColor: 'primary',
        title: 'Reboot',
        success: 'The dish is being rebooted',
        error: 'Failed to reboot the dish'
      }
      const prompt = usePrompt()
      const spy = vi.spyOn(prompt, 'show')
      wrapper.vm.promptAction(action)
      expect(spy).toHaveBeenCalledWith({
        title: 'Are you sure you want to reboot the Starlink?',
        content: 'The Starlink dish will be rebooted shortly.',
        okText: 'Confirm',
        cancelText: 'Cancel',
        onOk: expect.any(Function)
      })
    })
    it('performs action without prompt', () => {
      const action = {
        name: 'stow',
        buttonColor: 'primary',
        title: 'Stow',
        success: 'The dish is being stowed',
        error: 'Failed to stow the dish'
      }
      const prompt = usePrompt()
      const spy = vi.spyOn(prompt, 'show')
      wrapper.vm.promptAction(action)
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('performs action', () => {
    const action = {
      name: 'unstow',
      buttonColor: 'secondary',
      title: 'Unstow',
      success: 'The dish is being unstowed',
      error: 'Failed to unstow the dish'
    }
    it('performs action successfully', async () => {
      const message = useMessages()
      const spy = vi.spyOn(message, 'success')
      axios.post = vi.fn().mockResolvedValueOnce({ success: true })
      await wrapper.vm.performAction(action)
      expect(spy).toHaveBeenCalledWith(action.success)
    })
    it('fails to perform action', async () => {
      const message = useMessages()
      const spy = vi.spyOn(message, 'error')
      axios.post = vi.fn().mockRejectedValueOnce({ success: false })
      await wrapper.vm.performAction(action)
      expect(spy).toHaveBeenCalledWith(action.error)
    })
  })
})
