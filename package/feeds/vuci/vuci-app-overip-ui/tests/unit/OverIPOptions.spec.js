import { ref } from 'vue'
import OverIPOptions from '../../src/views/services/OverIPOptions.vue'
import createWrapper from '@tests/unit/mockFactory'
import TltTabs from '@ui-core/components/tabs/TltTabs.vue'

vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ path: 'test' })),
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn(),
      currentRoute: ref('')
    }))
  }
})

describe('OverIP options tests', () => {
  const props = {
    section: {
      id: 'test',
      name: 'new',
      enabled: '1',
      device: 'test'
    },
    certificates: [],
    firewallZones: [],
    serialDevices: []
  }
  it.each([
    ['fasd:vzxcv:fasdf:vzxc:afsd:213', 'fasd:vzxcv:fasdf:vzxc:afsd,213'],
    ['test:12', 'test,12'],
    ['192.168.1.1:4040', '192.168.1.1,4040']
  ])('returns formatted address', (v, response) => {
    const wrapper = createWrapper(OverIPOptions, { props })
    wrapper.vm.formatAddress(v)
    expect(wrapper.vm.formatAddress(v)).toEqual(response)
  })
  it.each([
    ['fasd:vzxcv:fasdf:vzxc:afsd:213', 'fasd:vzxcv:fasdf:vzxc:afsd,213'],
    ['test:12', 'test,12'],
    ['192.168.1.1:4040', '192.168.1.1,4040']
  ])('returns formatted address', (v, response) => {
    const wrapper = createWrapper(OverIPOptions, { props })
    wrapper.vm.formatAddress(v)
    expect(wrapper.vm.formatAddress(v)).toEqual(response)
  })
  it.each([
    ['6000', '5'],
    ['2400', '20']
  ])('returns mutated initial value value', (v, response) => {
    props.section.baudrate = v
    const self = {
      uciSection: {
        read_duration: '50'
      }
    }
    const wrapper = createWrapper(OverIPOptions, { props })
    wrapper.vm.setReadDurationValue(self)
    expect(self.uciSection.read_duration).toEqual(response)
  })
  it.each([
    [
      'client',
      [
        ['0', 'TCP'],
        ['1', 'UDP']
      ]
    ],
    ['bidirect', [['0', 'TCP']]]
  ])('returns protocol value', (v, response) => {
    props.section.mode = v
    const wrapper = createWrapper(OverIPOptions, { props: { ...props, formData: { overip: [{ id: 'test', mode: v }] } } })
    const val = wrapper.vm.protocol
    expect(val).toEqual(response)
  })
  it('updates addresses on connect on data', async () => {
    props.section.mode = 'bidirect'
    const wrapper = createWrapper(OverIPOptions, {
      props,
      shallow: false,
      global: {
        components: { TltTabs },
        provide: { vuciForm: {}, vuciSection: {} },
        mocks: {
          $router: { currentRoute: {} }
        },
        stubs: { 'vuci-form-item-custom': { template: '<div ref="custom"></div>' } }
      }
    })
    wrapper.vm.$refs.custom.modelValues = [
      ['test', 'test'],
      ['new', 'new']
    ]
    wrapper.vm.$refs.custom.rowIds = [1, 2]
    wrapper.vm.$refs.custom.nextId = () => 1
    wrapper.vm.updateAddress()
    expect(wrapper.vm.$refs.custom.modelValues).toEqual([['test', 'test']])
  })
  it('clears destination address values on bidirect', () => {
    props.section.mode = 'bidirect'
    const wrapper = createWrapper(OverIPOptions, {
      props,
      shallow: false,
      global: {
        components: { TltTabs },
        provide: { vuciForm: {}, vuciSection: {} },
        mocks: {
          $router: { currentRoute: {} }
        },
        stubs: { 'vuci-form-item-custom': { template: '<div ref="custom"></div>' }, vuciFormItemMixin: {} }
      }
    })
    wrapper.vm.$refs.custom.modelValues = ['test', 'test']
    wrapper.vm.$refs.custom.rowIds = [1, 2]
    wrapper.vm.$refs.custom.nextId = () => 1
    wrapper.vm.clearAddress()
    expect(wrapper.vm.$refs.custom.modelValues).toEqual(['test'])
  })
  it('updates addresses on enable click', () => {
    const wrapper = createWrapper(OverIPOptions, {
      props,
      shallow: false,
      global: {
        components: { TltTabs },
        provide: { vuciForm: {}, vuciSection: {} },
        mocks: {
          $router: { currentRoute: {} }
        },
        stubs: { 'vuci-form-item-custom': { template: '<div ref="custom"></div>' } }
      }
    })
    wrapper.vm.$refs.custom.modelValues = ['test', 'test']
    wrapper.vm.$refs.custom.rowIds = [1, 2]
    wrapper.vm.$refs.custom.nextId = () => 1
    wrapper.vm.updateAddress('test', '1')
    expect(wrapper.vm.$refs.custom.modelValues).toEqual(['test'])
  })
  it('returns client options', () => {
    const arr = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32']
    const wrapper = createWrapper(OverIPOptions, { props })
    const val = wrapper.vm.clientOptions
    expect(val).toEqual(arr)
  })
  it('returns serial options', async () => {
    const data = {
      baudRates: ['test'],
      flowControl: ['test'],
      dataBits: ['test'],
      parity: ['test'],
      duplex: ['test']
    }
    const wrapper = createWrapper(OverIPOptions, { props })
    wrapper.vm.$serial.filterOptions = vi.fn()
    wrapper.vm.$serial.filterOptions.mockResolvedValueOnce(data)
    const val = await wrapper.vm.serialOptions
    expect(val).toEqual(data)
  })
  it('returns device display value', async () => {
    props.section.device = '/dev/rs232'
    const wrapper = createWrapper(OverIPOptions, {
      props,
      global: {
        mocks: {
          $serial: {
            deviceDisplayValue: vi.fn().mockResolvedValueOnce('rs232')
          }
        }
      }
    })
    const val = await wrapper.vm.device
    expect(val).toEqual('rs232')
  })
})
