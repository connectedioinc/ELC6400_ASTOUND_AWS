import AttackPrevention from '../../../src/views/network/attackPrevention/AttackPrevention.vue'
import createWrapper from '@tests/unit/mockFactory'

import { axios } from '@ui-core/plugins/axios'

vi.mock('vue-router', async importActual => {
  const actual = await importActual()
  return {
    ...actual,
    useRoute: vi.fn(() => ({ path: 'test' })),
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn()
    })
  }
})

describe('AttackPrevention.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(AttackPrevention)
  })
  describe('load()', () => {
    it('loads data', async () => {
      const sshData = { ssh_limit: '0', id: 'general' }
      const httpData = { http_limit: '0', id: 'general' }
      const httpsData = { https_limit: '0', id: 'general' }
      const icmpData = { icmp_limit: '0', id: 'general' }
      const portData = { port_scan: '0', id: 'general' }
      const synData = { syn_flood: '0', id: 'general' }
      const dataArr = [sshData, httpData, httpsData, icmpData, portData, synData]
      vi.spyOn(axios, 'bulkGet').mockResolvedValue(dataArr.map(e => ({ success: true, data: e })))
      await wrapper.vm.load()
      expect(wrapper.vm.formData).toEqual({
        http: {
          id: 'http',
          http_limit: '0',
          limit: '120',
          limit_burst: '120',
          period: 'minute'
        },
        https: {
          id: 'https',
          https_limit: '0',
          limit: '120',
          limit_burst: '120',
          period: 'minute'
        },
        icmp: {
          id: 'icmp',
          icmp_limit: '0',
          limit: '60',
          limit_burst: '60',
          period: 'minute'
        },
        port_scan: {
          id: 'port_scan',
          port_scan: '0',
          hitcount: '120',
          seconds: '60'
        },
        ssh: {
          id: 'ssh',
          ssh_limit: '0',
          limit: '100',
          limit_burst: '100',
          period: 'day'
        },
        syn_flood: {
          id: 'syn_flood',
          syn_flood: '0',
          synflood_burst: '50',
          synflood_rate: '25'
        }
      })
    })
    it('fail to load data with errors', async () => {
      const spy = vi.spyOn(wrapper.vm.message, 'error')
      vi.spyOn(axios, 'bulkGet').mockResolvedValue(Array.from({ length: 6 }, () => ({ success: false })))
      await wrapper.vm.load()
      expect(spy).toHaveBeenCalledWith('Failed to load SSH flood, HTTP flood, HTTPS flood, Ping flood, Port scan, and SYN flood attack prevention rules')
    })
    it('bulk error', async () => {
      const spy = vi.spyOn(wrapper.vm.message, 'error')
      vi.spyOn(axios, 'bulkGet').mockRejectedValue()
      await wrapper.vm.load()
      expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
    })
  })
  describe('save()', () => {
    it('loads data', async () => {
      const sshData = { ssh_limit: '0', id: 'general' }
      const httpData = { http_limit: '0', id: 'general' }
      const httpsData = { https_limit: '0', id: 'general' }
      const icmpData = { icmp_limit: '0', id: 'general' }
      const portData = { port_scan: '0', id: 'general' }
      const synData = { syn_flood: '0', id: 'general' }
      const dataArr = [sshData, httpData, httpsData, icmpData, portData, synData]
      vi.spyOn(axios, 'bulk').mockResolvedValue(dataArr.map(e => ({ success: true, data: e })))
      const spy = vi.spyOn(wrapper.vm.message, 'success')
      wrapper.vm.formData = { ssh: {}, http: {}, https: {}, icmp: {}, port_scan: {}, syn_flood: {} }
      await wrapper.vm.save()
      expect(spy).toHaveBeenCalled()
      expect(wrapper.vm.formData).toEqual({
        http: {
          id: 'http',
          http_limit: '0',
          limit: '120',
          limit_burst: '120',
          period: 'minute'
        },
        https: {
          id: 'https',
          https_limit: '0',
          limit: '120',
          limit_burst: '120',
          period: 'minute'
        },
        icmp: {
          id: 'icmp',
          icmp_limit: '0',
          limit: '60',
          limit_burst: '60',
          period: 'minute'
        },
        port_scan: {
          id: 'port_scan',
          port_scan: '0',
          hitcount: '120',
          seconds: '60'
        },
        ssh: {
          id: 'ssh',
          ssh_limit: '0',
          limit: '100',
          limit_burst: '100',
          period: 'day'
        },
        syn_flood: {
          id: 'syn_flood',
          syn_flood: '0',
          synflood_burst: '50',
          synflood_rate: '25'
        }
      })
    })
    it('fail to load data with errors', async () => {
      const spy = vi.spyOn(wrapper.vm.message, 'error')
      vi.spyOn(axios, 'bulk').mockResolvedValue(Array.from({ length: 7 }, () => ({ success: false })))
      await wrapper.vm.save()
      expect(spy).toHaveBeenCalledWith('Failed to edit configuration')
    })
    it('bulk error', async () => {
      const spy = vi.spyOn(wrapper.vm.message, 'error')
      vi.spyOn(axios, 'bulk').mockRejectedValue()
      await wrapper.vm.save()
      expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
    })
  })
  it.each`
    section                                | expectedResult
    ${{}}                                  | ${undefined}
    ${{ id: 'http', http_limit: '0' }}     | ${'0'}
    ${{ id: 'http', http_limit: '1' }}     | ${'1'}
    ${{ id: 'port_scan', port_scan: '0' }} | ${'0'}
    ${{ id: 'port_scan', port_scan: '1' }} | ${'1'}
    ${{ id: 'syn_flood', syn_flood: '1' }} | ${'1'}
  `('returns enabled #%#', ({ section, expectedResult }) => {
    expect(wrapper.vm.getEnabled(section)).toEqual(expectedResult)
  })

  it.each`
    initialSection                         | enabled | expectedResult
    ${{}}                                  | ${'0'}  | ${{}}
    ${{ id: 'http', http_limit: '1' }}     | ${'0'}  | ${{ id: 'http', http_limit: '0' }}
    ${{ id: 'http', http_limit: '1' }}     | ${'1'}  | ${{ id: 'http', http_limit: '1' }}
    ${{ id: 'port_scan', port_scan: '1' }} | ${'0'}  | ${{ id: 'port_scan', port_scan: '0', nmap_fin: '0', null_flags: '0', syn_fin: '0', syn_rst: '0', x_max: '0' }}
    ${{ id: 'port_scan', port_scan: '0' }} | ${'1'}  | ${{ id: 'port_scan', port_scan: '1', nmap_fin: '1', null_flags: '1', syn_fin: '1', syn_rst: '1', x_max: '1' }}
    ${{ id: 'icmp', icmp_limit: '0' }}     | ${'1'}  | ${{ id: 'icmp', icmp_limit: '1' }}
    ${{ id: 'icmp', icmp_limit: '1' }}     | ${'1'}  | ${{ id: 'icmp', icmp_limit: '1' }}
    ${{ id: 'icmp', icmp_limit: '1' }}     | ${'0'}  | ${{ id: 'icmp', icmp_limit: '0' }}
    ${{ id: 'icmp', icmp_limit: '1' }}     | ${'1'}  | ${{ id: 'icmp', icmp_limit: '1' }}
  `('set enabled #%#', ({ initialSection, enabled, expectedResult }) => {
    wrapper.vm.formData[initialSection.id] = initialSection
    wrapper.vm.setEnabled(initialSection.id, enabled)
    expect(wrapper.vm.formData[initialSection.id]).toEqual(expectedResult)
  })
})
