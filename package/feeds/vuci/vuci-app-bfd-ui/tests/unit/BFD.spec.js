import BFD from '../../src/views/network/BFD.vue'
import BFDPeerEdit from '../../src/views/network/BFDPeerEdit.vue'
import createWrapper from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'

describe('BFD.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(BFD)
  })

  it('loads getStatus data', async () => {
    const status = [
      {
        status: 'up',
        diagnostic: 'ok',
        peer: '192.168.1.1',
        detect_multiplier: 3,
        receive_interval: 300,
        transmit_interval: 300,
        uptime: 0,
        downtime: 0
      }
    ]
    axios.get = vi.fn().mockResolvedValueOnce({ success: true, data: status })
    await wrapper.vm.getStatus()
    expect(wrapper.vm.bfdStatus).toEqual(status)
  })

  it('checks if getStatus return error message', async () => {
    const message = useMessages()
    axios.get = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(message, 'error')
    await wrapper.vm.getStatus()
    expect(spy).toHaveBeenCalledWith('Failed to load BFD status')
  })

  it('parses card status', () => {
    wrapper.vm.formData.bfd_peer = Array.from({ length: 12 }, (_, i) => ({ ip: `192.168.1.${i + 1}`, enabled: '1' }))
    wrapper.vm.bfdStatus = [
      { status: 'up', diagnostic: 'ok', peer: '192.168.1.1', detect_multiplier: 3, remote_receive_interval: 300, remote_transmit_interval: 300, uptime: 33452 },
      { status: 'init', diagnostic: 'ok', peer: '192.168.1.2', detect_multiplier: 3, remote_receive_interval: 300, remote_transmit_interval: 300, uptime: 221 },
      { status: 'down', diagnostic: 'control detection time expired', peer: '192.168.1.3', detect_multiplier: 3, remote_receive_interval: 300, remote_transmit_interval: 300, downtime: 221 },
      { status: 'down', diagnostic: 'echo function failed', peer: '192.168.1.4', detect_multiplier: 200, remote_receive_interval: 300, remote_transmit_interval: 300, downtime: 221 },
      { status: 'down', diagnostic: 'neighbor signaled session down', peer: '192.168.1.5', detect_multiplier: 3, remote_receive_interval: 600, remote_transmit_interval: 900, downtime: 221 },
      { status: 'down', diagnostic: 'forwarding plane reset', peer: '192.168.1.6', detect_multiplier: 123, remote_receive_interval: 300, remote_transmit_interval: 300, downtime: 10000 },
      { status: 'down', diagnostic: 'path down', peer: '192.168.1.7', detect_multiplier: 3, remote_receive_interval: 300, remote_transmit_interval: 500, downtime: 10000 },
      { status: 'down', diagnostic: 'concatenated path down', peer: '192.168.1.8', detect_multiplier: 78, remote_receive_interval: 300, remote_transmit_interval: 300, downtime: 10000 },
      { status: 'down', diagnostic: 'administratively down', peer: '192.168.1.9', detect_multiplier: 3, remote_receive_interval: 300, remote_transmit_interval: 300, downtime: 10000 },
      { status: 'down', diagnostic: 'reverse concatenated path down', peer: '192.168.1.10', detect_multiplier: 1, remote_receive_interval: 300, remote_transmit_interval: 300, downtime: 10000 },
      {
        diagnostic: 'reverse concatenated path down',
        peer: '192.168.1.11',
        detect_multiplier: 15,
        remote_receive_interval: 300,
        remote_transmit_interval: 300,
        downtime: 241,
        session_up: 10,
        session_down: 9
      },
      { status: 'down', peer: '192.168.1.12', detect_multiplier: 10, remote_receive_interval: 100, remote_transmit_interval: 100, downtime: 0 }
    ]
    expect(wrapper.vm.parsedCardStatus).toEqual([
      {
        content: [
          { info: 'Up (Ok)', style: 'success', title: 'Status' },
          { info: '300ms', title: 'Remote receive interval' },
          { info: '300ms', title: 'Remote transmit interval' },
          { info: '9h 17m 32s (up / down: 0 / 0)', title: 'Uptime' }
        ],
        title: '192.168.1.1',
        type: 'basic'
      },
      {
        content: [
          { info: 'Establishing (Ok)', title: 'Status' },
          { info: '300ms', title: 'Remote receive interval' },
          { info: '300ms', title: 'Remote transmit interval' },
          { info: '0h 3m 41s (up / down: 0 / 0)', title: 'Uptime' }
        ],
        title: '192.168.1.2',
        type: 'basic'
      },
      {
        content: [
          { info: 'Down (Control detection time expired)', style: 'error', title: 'Status' },
          { info: '300ms', title: 'Remote receive interval' },
          { info: '300ms', title: 'Remote transmit interval' },
          { info: '0h 3m 41s (up / down: 0 / 0)', title: 'Downtime' }
        ],
        title: '192.168.1.3',
        type: 'basic'
      },
      {
        content: [
          { info: 'Down (Echo function failed)', style: 'error', title: 'Status' },
          { info: '300ms', title: 'Remote receive interval' },
          { info: '300ms', title: 'Remote transmit interval' },
          { info: '0h 3m 41s (up / down: 0 / 0)', title: 'Downtime' }
        ],
        title: '192.168.1.4',
        type: 'basic'
      },
      {
        content: [
          { info: 'Down (Neighbor signaled session down)', style: 'error', title: 'Status' },
          { info: '600ms', title: 'Remote receive interval' },
          { info: '900ms', title: 'Remote transmit interval' },
          { info: '0h 3m 41s (up / down: 0 / 0)', title: 'Downtime' }
        ],
        title: '192.168.1.5',
        type: 'basic'
      },
      {
        content: [
          { info: 'Down (Forwarding plane reset)', style: 'error', title: 'Status' },
          { info: '300ms', title: 'Remote receive interval' },
          { info: '300ms', title: 'Remote transmit interval' },
          { info: '2h 46m 40s (up / down: 0 / 0)', title: 'Downtime' }
        ],
        title: '192.168.1.6',
        type: 'basic'
      },
      {
        content: [
          { info: 'Down (Path down)', style: 'error', title: 'Status' },
          { info: '300ms', title: 'Remote receive interval' },
          { info: '500ms', title: 'Remote transmit interval' },
          { info: '2h 46m 40s (up / down: 0 / 0)', title: 'Downtime' }
        ],
        title: '192.168.1.7',
        type: 'basic'
      },
      {
        content: [
          { info: 'Down (Concatenated path down)', style: 'error', title: 'Status' },
          { info: '300ms', title: 'Remote receive interval' },
          { info: '300ms', title: 'Remote transmit interval' },
          { info: '2h 46m 40s (up / down: 0 / 0)', title: 'Downtime' }
        ],
        title: '192.168.1.8',
        type: 'basic'
      },
      {
        content: [
          { info: 'Down (Administratively down)', style: 'error', title: 'Status' },
          { info: '300ms', title: 'Remote receive interval' },
          { info: '300ms', title: 'Remote transmit interval' },
          { info: '2h 46m 40s (up / down: 0 / 0)', title: 'Downtime' }
        ],
        title: '192.168.1.9',
        type: 'basic'
      },
      {
        content: [
          { info: 'Down (Reverse concatenated path down)', style: 'error', title: 'Status' },
          { info: '300ms', title: 'Remote receive interval' },
          { info: '300ms', title: 'Remote transmit interval' },
          { info: '2h 46m 40s (up / down: 0 / 0)', title: 'Downtime' }
        ],
        title: '192.168.1.10',
        type: 'basic'
      },
      {
        content: [
          { info: '- (Reverse concatenated path down)', title: 'Status' },
          { info: '300ms', title: 'Remote receive interval' },
          { info: '300ms', title: 'Remote transmit interval' },
          { info: '0h 4m 1s (up / down: 10 / 9)', title: 'Downtime' }
        ],
        title: '192.168.1.11',
        type: 'basic'
      },
      {
        content: [
          { info: 'Down', style: 'error', title: 'Status' },
          { info: '100ms', title: 'Remote receive interval' },
          { info: '100ms', title: 'Remote transmit interval' },
          { info: '0h 0m 0s (up / down: 0 / 0)', title: 'Downtime' }
        ],
        title: '192.168.1.12',
        type: 'basic'
      }
    ])
  })
})

describe('BFDPeerEdit.vue', () => {
  let wrapper
  let wrapperData = {}
  beforeEach(() => {
    wrapperData = {
      props: {
        section: { id: '1', ip: '192.168.1.1' }
      }
    }
    wrapper = createWrapper(BFDPeerEdit, wrapperData)
  })

  it('computes profile options', () => {
    wrapper.vm.formData.bfd_profile = [
      { id: '1', name: 'profile1' },
      { id: '2', name: 'profile2' }
    ]
    const result = [
      ['', '-- No profile --'],
      ['1', 'profile1'],
      ['2', 'profile2']
    ]
    expect(wrapper.vm.profileOptions).toEqual(result)
  })
})
