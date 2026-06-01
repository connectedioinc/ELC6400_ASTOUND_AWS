import VuciSideWidget from '@conditional/vuci-app-side-widget-ui/VuciSideWidget.vue'
import createWrapper from '@tests/unit/mockFactory'
import { rms } from '@/utils/rms'

vi.mock('@/utils/rms', () => {
  const rms = vi.fn()
  rms.parseConnectionState = vi.fn()
  rms.parseStatus = vi.fn()
  return { rms }
})

const dndStub = {
  'tlt-dnd': {
    template: '<div></div>'
  }
}
const cards = [
  { position: '4', content: {}, enabled: '1' },
  { position: '3', content: {}, enabled: '1' },
  { position: '2', content: {}, enabled: '1' },
  { position: '1', content: {}, enabled: '0' }
]
const sortedCards = [
  { position: '2', content: {}, enabled: '1' },
  { position: '3', content: {}, enabled: '1' },
  { position: '4', content: {}, enabled: '1' }
]
const sections = [
  { position: '1', enabled: '1' },
  { position: '2', enabled: '1' },
  { position: '3', enabled: '1' },
  { position: '4', enabled: '1' }
]

describe('VuciSideWidget.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(VuciSideWidget, { props: { opened: true }, global: { stubs: dndStub } })
  })
  it('opens and fetches data', async () => {
    const wrapper = createWrapper(VuciSideWidget, { props: { opened: false } })
    wrapper.vm.fetchData = vi.fn()
    await wrapper.setProps({ opened: true })
    expect(wrapper.find('.side-widget-wrapper').exists()).toBeTruthy()
    expect(wrapper.vm.fetchData).toHaveBeenCalledOnce()
  })
  it('returns sorted cards', () => {
    wrapper.vm.cards = [...cards, { position: '5', content: [] }]
    const sorted = wrapper.vm.sortedArray
    expect(sorted).toEqual(sortedCards)
  })
  it.each([
    [{ pinstate: '', active_sim: 1 }, '-'],
    [{ pinstate: 'test', active_sim: 1 }, 'SIM1 - test']
  ])('returns formatted pin state (%s, %s, %s)', (modem, result) => {
    wrapper.vm.$mobile.getSimstate = vi.fn().mockImplementation(value => {
      return value?.pinstate || 'N/A'
    })
    wrapper.vm.$mobile.getSimLabel = vi.fn().mockReturnValueOnce('1')
    expect(wrapper.vm.formatPinState(modem)).toBe(result)
  })
  it('changes widget positions after dragging', async () => {
    wrapper.vm.savePosition = vi.fn()
    wrapper.vm.handleDragEnd()
    expect(wrapper.vm.savePosition).toHaveBeenCalled()
    expect(wrapper.emitted()['data-change']).toBeTruthy()
  })
  it('fetches widget data', async () => {
    wrapper.vm.$axios.get = vi.fn().mockResolvedValue({ success: true, data: sections })
    const timerSpy = vi.spyOn(wrapper.vm.$timer, 'start')
    wrapper.vm.initButtons = vi.fn()
    await wrapper.vm.fetchData()
    expect(wrapper.vm.loading).toBeTruthy()
    expect(wrapper.vm.sections).toEqual(sections)
    expect(wrapper.vm.cards).toHaveLength(4)
    expect(timerSpy).toHaveBeenCalled()
    expect(wrapper.vm.initButtons).toHaveBeenCalledOnce()
  })
  it('fails to fetch widget data', async () => {
    wrapper.vm.$axios.get = vi.fn().mockRejectedValue()
    const messageSpy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.fetchData()
    expect(messageSpy).toHaveBeenCalled()
  })
  it('inits side widget buttons', () => {
    const wrapper = createWrapper(VuciSideWidget, {
      global: {
        mocks: {
          $store: {
            board: {
              hwinfo: {
                mobile: true,
                bluetooth: true,
                wifi: true
              }
            }
          }
        }
      }
    })
    wrapper.vm.sections = [{ card_id: 'rms' }]
    wrapper.vm.checkIfEnabled = vi.fn()
    wrapper.vm.initButtons()
    expect(wrapper.vm.sideButtons.buttonMobile.exist).toBeTruthy()
    expect(wrapper.vm.sideButtons.buttonBluetooth.exist).toBeTruthy()
    expect(wrapper.vm.sideButtons.buttonWifi.exist).toBeTruthy()
    expect(wrapper.vm.sideButtons.buttonRms.exist).toBeTruthy()
  })
  it('checks if services are enabled', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue([
      { success: true, data: { enabled: '1' } },
      { success: true, data: [{ enabled: '1' }] },
      { success: true, data: [{ proto: 'wwan', enabled: '1' }] },
      { success: true, data: { enable: '1' } }
    ])
    await wrapper.vm.checkIfEnabled()
    expect(wrapper.vm.sideButtons.buttonBluetooth.active).toBeTruthy()
    expect(wrapper.vm.sideButtons.buttonWifi.active).toBeTruthy()
    expect(wrapper.vm.sideButtons.buttonMobile.active).toBeTruthy()
    expect(wrapper.vm.sideButtons.buttonRms.active).toBeTruthy()
  })
  it('fails when checking services', async () => {
    const messageSpy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue([
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] }
    ])
    await wrapper.vm.checkIfEnabled()
    expect(messageSpy).toHaveBeenCalledTimes(4)
  })
  it('fails to check services', async () => {
    const messageSpy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValue()
    await wrapper.vm.checkIfEnabled()
    expect(messageSpy).toHaveBeenCalled()
  })
  it('gets status data', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue([
      { success: true, data: [] },
      { success: true, data: [] },
      { success: true, data: [] },
      { success: true, data: [] },
      { success: true, data: [] }
    ])
    wrapper.vm.parseSystemData = vi.fn()
    wrapper.vm.parseWifiData = vi.fn()
    wrapper.vm.parseMobileData = vi.fn()
    wrapper.vm.$mobile.parseModems = vi.fn()
    wrapper.vm.parseRmsData = vi.fn()
    wrapper.vm.parsePortData = vi.fn()
    await wrapper.vm.getStatusData()
    expect(wrapper.vm.parseSystemData).toHaveBeenCalled()
    expect(wrapper.vm.parseWifiData).toHaveBeenCalled()
    expect(wrapper.vm.parseMobileData).toHaveBeenCalled()
    expect(wrapper.vm.parseRmsData).toHaveBeenCalled()
    expect(wrapper.vm.parsePortData).toHaveBeenCalled()
  })
  it('fails when getting status data', async () => {
    const messageSpy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue([
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] }
    ])
    await wrapper.vm.getStatusData()
    expect(messageSpy).toHaveBeenCalledTimes(5)
  })
  it('fails to get status data', async () => {
    const messageSpy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValue()
    await wrapper.vm.getStatusData()
    expect(messageSpy).toHaveBeenCalled()
  })
  const modem1 = {
    id: '1-1.2',
    data_conn_state: 'state',
    operator_state: 'netstate',
    operator: 'oper',
    conntype: 'conntype',
    active_sim: 1
  }
  const parsedModem1 = {
    id: '1-1.2',
    connection: 'state',
    state: 'netstate; oper; conntype',
    pinstate: '-',
    sim: 1,
    simArr: [],
    flightMode: 'On'
  }
  const modem2 = {
    id: '3-1',
    data_conn_state: 'state',
    operator_state: 'netstate',
    operator: 'oper',
    conntype: 'conntype',
    active_sim: 2
  }
  const parsedModem21 = {
    id: '1-1.2',
    connection: 'state',
    state: 'netstate; oper; conntype',
    pinstate: '-',
    sim: 1,
    simArr: [],
    flightMode: 'On'
  }
  const parsedModem22 = {
    id: '3-1',
    connection: 'state',
    state: 'netstate; oper; conntype',
    pinstate: '-',
    sim: 2,
    simArr: [],
    flightMode: 'On'
  }
  const modemUnreachable = {
    blocked: '0',
    offline: '1',
    name: 'Internal modem',
    id: '1-1'
  }
  const parsedModemUnreachable = {
    connection: '-',
    state: '-',
    pinstate: '-',
    blocked: '0',
    offline: '1',
    name: 'Internal modem',
    id: '1-1',
    signal: '-',
    simArr: [],
    flightMode: 'On'
  }
  it.each([
    ['there are no modems', [], [], [], []],
    ['there is 1 modem', [modem1], [{ type: 'mobile', name: '1-1.2' }], [{ success: true, data: [{ id: '1', primary: '1', position: '1' }] }], [parsedModem1]],
    [
      'there are 2 modems',
      [modem1, modem2],
      [
        { type: 'mobile', name: '1-1.2' },
        { type: 'mobile', name: '3-1' }
      ],
      [
        { success: true, data: [{ id: '1', primary: '1', position: '1' }] },
        {
          success: true,
          data: [
            { id: '1', primary: '0', position: '1' },
            { id: '2', primary: '1', position: '2' }
          ]
        }
      ],
      [parsedModem21, parsedModem22]
    ],
    ['there is 1 modem and it is unreachable', [modemUnreachable], [{ type: 'mobile', name: '1-1' }], [{ success: true, data: [{ id: '1', primary: '1', position: '1' }] }], [parsedModemUnreachable]]
  ])('parses mobile data when %s', async (text, data, cards, mock, res) => {
    wrapper.vm.cards = cards
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue(mock)
    const na = vi.fn().mockImplementation(value => {
      return value || 'N/A'
    })
    wrapper.vm.$mobile.getOperatorState = na
    wrapper.vm.$mobile.getConntype = na
    wrapper.vm.$mobile.getDataConnState = vi.fn().mockImplementation(value => {
      return value || '-'
    })
    wrapper.vm.$mobile.getBlockedText = vi.fn().mockImplementation(() => {
      return 'unreachable'
    })
    wrapper.vm.$mobile.modemOffline = vi.fn().mockReturnValue(data[0]?.offline === '1')

    wrapper.vm.$mobile.adjustSimNumber = vi.fn().mockImplementation(value => {
      return value
    })
    wrapper.vm.$mobile.getFlightMode = vi.fn().mockReturnValue('On')
    await wrapper.vm.parseMobileData(data)
    wrapper.vm.cards.forEach((card, index) => {
      expect(card.content.content).toEqual(res[index])
    })
  })
  it('parses system data on first load', () => {
    wrapper.vm.cards = [{ type: 'system' }]
    wrapper.vm.parseSystemData({ data: 'data' })
    expect(wrapper.vm.cards[0].content).toEqual({
      title: 'System status',
      path: '/status/system',
      content: { data: 'data', loadavg: 0.4 }
    })
  })
  it('parses system data', () => {
    wrapper.vm.cards = [{ type: 'system' }]
    wrapper.vm.firstCpuStatusLoad = false
    wrapper.vm.parseSystemData({ data: 'data' })
    expect(wrapper.vm.cards[0].content).toEqual({
      title: 'System status',
      path: '/status/system',
      content: { data: 'data' }
    })
  })
  it('parses rms data', () => {
    wrapper.vm.cards = [{ type: 'rms' }]
    rms.parseConnectionState = vi.fn().mockReturnValue({ text: 'text', color: 'color' })
    rms.parseStatus = vi.fn().mockReturnValue('status')
    wrapper.vm.parseRmsData()
    expect(rms.parseConnectionState).toHaveBeenCalled()
    expect(rms.parseStatus).toHaveBeenCalled()
    expect(wrapper.vm.cards[0].content).toEqual({
      title: 'RMS status',
      path: '/services/cloud_solutions/rms',
      content: {
        connectionStateText: 'text',
        connectionStateColor: 'color',
        status: 'status'
      }
    })
  })
  const wifi1 = { id: '1', mode: 'ap', num_assoc: 0, up: false, link: 'name1', ssid: 'ssid1', devices: [{ band: 'band1', quality: 0 }] }
  const wifi2 = { id: '2', mode: 'ap', num_assoc: 2, up: true, link: 'name2', ssid: 'ssid2', devices: [{ band: 'band2', quality: 100 }] }
  const parsedWifi1 = {
    title: 'WiFi ssid1 (band1) status',
    path: '/network/wireless/ssids?edit=1',
    content: { num_assoc: 0, quality: [[0, 'band1']], ssid: 'ssid1', up: false }
  }
  const parsedWifi2 = {
    title: 'WiFi ssid2 (band2) status',
    path: '/network/wireless/ssids?edit=2',
    content: { num_assoc: 2, quality: [[100, 'band2']], ssid: 'ssid2', up: true }
  }
  it.each([
    ['there are no wifi networks', [], []],
    ['there is 1 wifi network', [wifi1], [parsedWifi1]],
    ['there are 2 wifi networks', [wifi1, wifi2], [parsedWifi1, parsedWifi2]]
  ])('parses wifi data when %s', (text, data, res) => {
    wrapper.vm.cards = [
      { type: 'wifi', name: 'name1' },
      { type: 'wifi', name: 'name2' }
    ]
    wrapper.vm.parseWifiData(data)
    wrapper.vm.cards.forEach((card, index) => {
      expect(card.content).toEqual(res[index])
    })
  })
  it.each([
    ['bluetooth', { active: false, id: 'bluetooth' }, []],
    ['wireless', { active: false, id: 'wifi' }, { data: [] }],
    ['mobile', { active: false, id: 'sim' }, { data: [{ proto: 'wwan' }] }],
    ['rms', { active: false, id: 'cloud' }, []]
  ])('toggles %s service', async (text, item, mock) => {
    wrapper.vm.$axios.get = vi.fn().mockResolvedValue(mock)
    wrapper.vm.$axios.put = vi.fn().mockResolvedValue(mock)
    await wrapper.vm.toggleService(item)
    expect(item.active).toBeTruthy()
    expect(wrapper.vm.$axios.put).toHaveBeenCalledOnce()
  })
  it.each([
    ['bluetooth', { active: false, id: 'bluetooth' }],
    ['wireless', { active: false, id: 'wifi' }],
    ['mobile', { active: false, id: 'sim' }],
    ['rms', { active: false, id: 'cloud' }]
  ])('fails to toggle %s service', async (text, item) => {
    wrapper.vm.$axios.put = vi.fn().mockRejectedValue()
    wrapper.vm.$axios.get = vi.fn().mockRejectedValue()
    wrapper.vm.$message.error = vi.fn()
    await wrapper.vm.toggleService(item)
    expect(item.active).toBeFalsy()
    expect(wrapper.vm.$message.error).toHaveBeenCalled()
  })
  it('saves widget positions', async () => {
    wrapper.vm.$axios.put = vi.fn()
    // This test is scuffed because ethernet card is not yet implemented
    wrapper.vm.cards = [{ id: '1', type: 'ethernet', position: '5', content: [] }]
    wrapper.vm.sections = [{ position: '5', id: '1' }, { position: '4' }, { position: '3' }, { position: '2' }, { position: '1' }]
    await wrapper.vm.savePosition(cards)
    expect(wrapper.vm.$axios.put.mock.calls[0][1]).toEqual({
      data: [
        { position: '5', id: '1', enabled: undefined },
        { position: '4', id: undefined, enabled: undefined },
        { position: '3', id: undefined, enabled: undefined },
        { position: '2', id: undefined, enabled: undefined },
        { position: '1', id: undefined, enabled: undefined }
      ]
    })
  })
  it('toggles widget visibility', () => {
    const item = { id: '1', enabled: '1' }
    wrapper.vm.$axios.put = vi.fn().mockResolvedValue()
    wrapper.vm.sections = [{ id: '1', enabled: '1' }]
    wrapper.vm.checkCheckBox(item)
    expect(item.enabled).toBe('0')
    expect(wrapper.vm.sections[0].enabled).toBe('0')
  })
  it('fails to toggle widget visibility', async () => {
    const item = { id: '1', enabled: '1' }
    wrapper.vm.loading = false
    wrapper.vm.sections = [{ id: '1', enabled: '1' }]
    wrapper.vm.$axios.put = vi.fn().mockRejectedValue()
    wrapper.vm.$message.error = vi.fn()
    await wrapper.vm.checkCheckBox(item)
    expect(item.enabled).toBe('1')
    expect(wrapper.vm.sections[0].enabled).toBe('1')
    expect(wrapper.vm.$message.error).toHaveBeenCalled()
  })
  it('parses port data', () => {
    wrapper.vm.cards = [{ type: 'ports', name: 'name1' }]
    const status = [{ id: '_lan2', enabled: '0', state: 'down', name: 'LAN', description: 'LAN', position: 2, num: 2 }]
    wrapper.vm.parsePortData(status)
    expect(wrapper.vm.cards[0].content.content.getPortData('_lan2')).toEqual({
      hint: [
        { info: '', title: 'LAN' },
        { info: 'Disabled', title: 'Status' }
      ],
      type: 'disabled',
      poe: 'none'
    })
  })

  it.each`
    item                     | title                                                 | content
    ${{ name: 'Wifi' }}      | ${"Are you sure you want to disconnect 'Wifi'?"}      | ${'Wifi connection will be lost.'}
    ${{ name: 'Bluetooth' }} | ${"Are you sure you want to disconnect 'Bluetooth'?"} | ${'Bluetooth connection will be lost.'}
    ${{ name: 'Mobile' }}    | ${"Are you sure you want to disconnect 'Mobile'?"}    | ${'Mobile connection will be lost.'}
    ${{ name: 'RMS' }}       | ${"Are you sure you want to disconnect 'RMS'?"}       | ${'RMS connection will be lost.'}
  `('toggleServicePrompt', ({ item, title, content }) => {
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    wrapper.vm.toggleServicePrompt(item)
    expect(spy).toBeCalledWith({
      title: title,
      content: content,
      okText: 'Disconnect',
      cancelText: 'Cancel',
      onOk: expect.any(Function)
    })
  })
})
