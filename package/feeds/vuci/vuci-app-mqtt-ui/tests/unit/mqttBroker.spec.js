import MqttBroker from '../../src/views/services/MqttBroker.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('MqttBroker.vue', () => {
  const bulkData = [
    {
      success: true,
      data: {
        id: 'cfg04e304',
        topic: '/dataTEST'
      }
    }
  ]
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MqttBroker)
  })
  it('loadData load fails', async () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue([{ success: false }])
    await wrapper.vm.loadData({ bridgeData: [{ id: 'cfg02c6b2', '.index': 0 }] })
    expect(spy).toHaveBeenCalledWith('Failed to load topic data.')
  })
  it('checks if enabled can be turned off', () => {
    expect(wrapper.vm.validateEnable({ model: '0' })).toEqual(undefined)
  })
  it('invokes message when data load fails', async () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValue({})
    await wrapper.vm.loadData({ bridgeData: [] })
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('loads data when response is successful ', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue([...bulkData])
    const form = {
      bridgeData: [{ '.type': 'mqtt', id: 'cfg02c6b2', remote_password: 'set' }],
      brokerData: [{ psk: 'set' }]
    }
    const result = await wrapper.vm.loadData(form)
    expect(result).toEqual({ cfg02c6b2: bulkData[0].data })
    expect(form).toEqual({
      bridgeData: [{ '.type': 'mqtt', id: 'cfg02c6b2', remote_password: 'set' }],
      brokerData: [{ psk: 'set' }]
    })
  })
  it('returns deletes children', () => {
    const uciData = {
      cfg02c6b2: [{}]
    }
    const section = {
      id: 'cfg02c6b2'
    }
    wrapper.vm.afterDelete(section, uciData)
    expect(uciData.cfg02c6b2).toBeUndefined()
  })
  it.each([
    [[{ connection_name: 'te' }], 'te', { message: 'Bridge with connection name te already exists', valid: false }],
    [[{ connection_name: 'te' }], 'test', { valid: true }]
  ])('returns validation results', (data, name, result) => {
    wrapper.vm.formData = { bridgeData: data }
    expect(wrapper.vm.addValidate({ connection_name: name })).toEqual(result)
  })

  it.each([
    [true, 'topic does not exist', [{ id: 'test1', client_enabled: '1' }], { test1: [] }],
    [false, 'bridge is not enabled', [{ id: 'test1' }], { test1: [{ id: 'topic' }] }],
    [false, 'bridge enabled and has a topic', [{ id: 'test1', client_enabled: '1' }], { test1: [{ id: 'topic' }] }]
  ])('returns %s when %s', (returns, text, bridgeData, topicData) => {
    expect(wrapper.vm.validateTopics(bridgeData, topicData)).toEqual(returns)
  })
  it.each([
    ['remote address and remote port options are empty', 'Missing required options: Remote address, Remote port', false, '', ''],
    ['there is no topic', 'At least one topic is required to enable MQTT bridge', true, '', '1.1.1.1']
  ])('returns error message when %s', (text, message, topic, cert, remoteAddr) => {
    const wrapper = createWrapper(MqttBroker)
    wrapper.vm.validateTopics = vi.fn().mockReturnValueOnce(topic)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const self = {
      uciSection: {
        model: '1',
        client_enabled: '1',
        use_remote_tls: '1',
        bridge_cafile: '',
        bridge_certfile: '',
        bridge_keyfile: '',
        remote_addr: remoteAddr
      }
    }
    wrapper.vm.validateEnable(self)
    expect(spy).toHaveBeenCalledWith(message)
  })
  it('returns nothing if switch is disabled', async () => {
    const self = {
      model: '0'
    }
    expect(wrapper.vm.validateEnable(self)).toEqual()
  })
})
