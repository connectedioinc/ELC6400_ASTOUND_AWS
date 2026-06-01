import VuciSideWidgetCard from '@conditional/vuci-app-side-widget-ui/VuciSideWidgetCard.vue'
import createWrapper from '@tests/unit/mockFactory'

const mobileCard = {
  type: 'mobile',
  content: {
    connection: 'connection',
    sim: 1,
    sim_count: 2,
    simArr: [1, 2],
    signal: 0,
    state: 'state',
    pinstate: 'pinstate',
    flightMode: 'Off'
  }
}
const systemCard = {
  type: 'system',
  content: {
    memory: {
      loadavg: 0.249,
      ram_used: 0
    }
  }
}
const rmsCard = {
  type: 'rms',
  content: {
    connectionStateText: 'Connected',
    status: 'status'
  }
}
const wifiCard = {
  type: 'wifi',
  content: {
    up: true,
    ssid: 'ssid',
    num_assoc: 'num_assoc'
  }
}

describe('VuciSideWidgetCard.vue', () => {
  it('renders mobile card', () => {
    const wrapper = createWrapper(VuciSideWidgetCard, { props: mobileCard, global: { stubs: { 'tlt-signal-bar': true } } })
    expect(wrapper.find('.status').text()).toBe(mobileCard.content.connection)
    expect(wrapper.findAll('.sim').length).toBe(mobileCard.content.sim_count)
    expect(wrapper.find('#connection span').text()).toBe(mobileCard.content.signal + ' dBm')
    expect(wrapper.findAll('.param').at(0).text()).toBe('Status: %s'.format(mobileCard.content.flightMode))
    expect(wrapper.findAll('.param').at(1).text()).toBe(mobileCard.content.state)
    expect(wrapper.findAll('.param').at(2).text()).toBe(mobileCard.content.pinstate)
  })
  it('renders system card with three progress bars', () => {
    const wrapper = createWrapper(VuciSideWidgetCard, { props: { ...systemCard } })
    expect(wrapper.findAllComponents({ name: 'tlt-progress-bar' }).length).toBe(3)
  })
  it('renders rms card', () => {
    const wrapper = createWrapper(VuciSideWidgetCard, { props: { ...rmsCard } })
    expect(wrapper.find('.status').text()).toBe(rmsCard.content.connectionStateText)
    expect(wrapper.find('.param').text()).toBe(rmsCard.content.status)
  })
  it('renders wifi card', () => {
    const wrapper = createWrapper(VuciSideWidgetCard, { props: { ...wifiCard } })
    expect(wrapper.find('.status').text()).toBe('Enabled')
    expect(wrapper.findAll('.param').at(0).text()).toBe(wifiCard.content.ssid)
    expect(wrapper.findAll('.param').at(1).text()).toBe(wifiCard.content.num_assoc)
  })
  it.each([
    ['active', 1, 'text-theme-text-success'],
    ['inactive', 2, 'text-theme-text-subtle']
  ])('gets %s sim icon class', (text, targetSim, res) => {
    const wrapper = createWrapper(VuciSideWidgetCard, {
      props: {
        content: {
          sim_count: 2,
          sim: 1
        }
      }
    })
    const icon = wrapper.vm.getSimIconClass(targetSim)
    expect(icon).toBe(res)
  })
})
