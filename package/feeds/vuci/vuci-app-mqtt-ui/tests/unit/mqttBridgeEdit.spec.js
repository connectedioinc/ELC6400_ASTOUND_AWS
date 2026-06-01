import MqttBridgeEdit from '../../src/views/services/MqttBridgeEdit.vue'
import MqttTopicEdit from '../../src/views/services/MqttTopicEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('MqttBridgeEdit.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(MqttBridgeEdit, { props: { section: { id: '' } } })
  })
  it('displays topic direction', () => {
    const result = wrapper.vm.displayDirection('out')
    expect(result).toEqual('OUT')
  })
  it('displays QoS', () => {
    const result = wrapper.vm.displayQoS('0')
    expect(result).toEqual('At most once (0)')
  })
  it.each([
    [[{ topic: 'te' }], 'te', { message: 'Topic with name te already exists', valid: false }],
    [[{ topic: 'te' }], 'test', { valid: true }]
  ])('returns validation results', (data, name, result) => {
    const props = {
      section: {
        id: 'te'
      }
    }
    const wrapper = createWrapper(MqttBridgeEdit, { props })
    wrapper.vm.formData = { te: data }
    expect(wrapper.vm.addValidate({ topic: name })).toEqual(result)
  })
  it('rejects promise when conf name already exists', async () => {
    const props = {
      section: {
        connection_name: 'test',
        id: 'test2'
      }
    }
    const wrapper = createWrapper(MqttBridgeEdit, { props })
    wrapper.vm.formData = { bridgeData: [{ connection_name: 'test', id: 'test1' }] }
    await expect(wrapper.vm.onBeforeSave()).rejects.toEqual('Configuration with connection name test already exists')
  })
  it('rejects promise when enabled instance does not have topic created', async () => {
    const props = {
      section: {
        connection_name: 'test',
        id: 'test2'
      }
    }
    const wrapper = createWrapper(MqttBridgeEdit, { props })
    wrapper.vm.formData = { bridgeData: [{ connection_name: 'testas', id: 'test1' }] }
    wrapper.vm.validateTopics = vi.fn().mockReturnValueOnce(true)
    await expect(wrapper.vm.onBeforeSave()).rejects.toEqual('At least one topic is required to enable MQTT bridge')
  })
  it('rejects promise', async () => {
    const props = {
      section: {
        connection_name: 'test',
        id: 'test2',
        client_enabled: '1'
      }
    }
    const wrapper = createWrapper(MqttBridgeEdit, { props })
    wrapper.vm.formData = { bridgeData: [{ connection_name: 'test1', id: 'test1' }] }
    await expect(wrapper.vm.onBeforeSave()).rejects.toEqual('At least one topic is required to enable MQTT bridge')
  })
  it('returns validation message', async () => {
    const props = {
      section: {
        connection_name: 'test',
        id: 'test2'
      }
    }
    const wrapper = createWrapper(MqttBridgeEdit, { props })
    wrapper.vm.formData = { bridgeData: [{ connection_name: 'test3', id: 'test1' }] }
    await expect(wrapper.vm.onBeforeSave()).resolves.toEqual()
  })
  it.each([
    [true, 'topic does not exist', { id: 'test1', client_enabled: '1' }, { test1: [] }],
    [false, 'bridge is not enabled', { id: 'test1' }, { test1: [{ id: 'topic' }] }],
    [false, 'bridge enabled and has a topic', { id: 'test1', client_enabled: '1' }, { test1: [{ id: 'topic' }] }]
  ])('returns %s when %s', (returns, text, section, formData) => {
    const props = { section }
    const wrapper = createWrapper(MqttBridgeEdit, { props })
    wrapper.vm.formData = formData
    expect(wrapper.vm.validateTopics()).toEqual(returns)
  })

  describe('MqttTopicEdit tests', () => {
    const props = {
      section: {
        topic: 'test',
        id: 'test2'
      },
      father: 'yay'
    }
    it('rejects promise', async () => {
      const wrapper = createWrapper(MqttTopicEdit, { props })
      wrapper.vm.formData = { yay: [{ topic: 'test', id: 'test1' }] }
      await expect(wrapper.vm.onBeforeSave()).rejects.toEqual('Configuration with name test already exists')
    })
    it('returns validation message', async () => {
      const wrapper = createWrapper(MqttTopicEdit, { props })
      wrapper.vm.formData = { yay: [{ topic: 'test3', id: 'test1' }] }
      await expect(wrapper.vm.onBeforeSave()).resolves.toEqual()
    })
    it('Checks initial directionOpts and qosOpts data', () => {
      const wrapper = createWrapper(MqttTopicEdit, { props })
      expect(wrapper.vm.directionOpts).toEqual([
        ['out', 'OUT'],
        ['in', 'IN'],
        ['both', 'BOTH']
      ])
      expect(wrapper.vm.qosOpts).toEqual([
        ['0', 'At most once (0)'],
        ['1', 'At least once (1)'],
        ['2', 'Exactly once (2)']
      ])
    })
  })
})
