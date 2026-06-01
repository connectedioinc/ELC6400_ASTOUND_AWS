import Overview from '../../src/views/status/Overview.vue'
import createWrapper from '@tests/unit/mockFactory'
import { network } from '@/plugins/network'
import { parse as parsePorts } from '../../src/views/status/portDeviceParser'

describe('Overview.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(Overview, {
      global: {
        stubs: {
          tltDnd: {
            template: `<div><slot :index="1" :item="{}" :start-drag="() => {}" /></div>`
          }
        }
      }
    })
    vi.spyOn(wrapper.vm, 'timeout').mockResolvedValue()
  })
  it.each([
    ['bytes', '1000', '1024', '1000 B'],
    ['kilobytes', '1025', '1024', '1.0 KB'],
    ['megabytes', '1048577', '1024', '1.0 MB'],
    ['gigabytes', '1073741825', '1024', '1.0 GB']
  ])('converts bytes to %s', async (type, bytes, constant, result) => {
    expect(wrapper.vm.convert(bytes, constant)).toEqual(result)
  })
  it('returns parsed Access Control data', () => {
    const data = {
      lan: ['HTTP', 'CLI', 'SSH', 'HTTPS'],
      wan: ['SSH'],
      fullData: {
        HTTP: {
          wan: false,
          port: ['80', '81', '82', '83', '84'],
          wan_port: ['80', '81', '82', '83', '84'],
          lan: true
        },
        CLI: {
          wan: false,
          port: '4200-4220',
          wan_port: '4200-4220',
          lan: true
        },
        SSH: {
          wan: true,
          port: '22',
          wan_port: '2222',
          lan: true
        },
        HTTPS: {
          wan: false,
          port: ['443', '444'],
          wan_port: ['443', '444'],
          lan: true
        }
      }
    }
    const res = [
      {
        content: [
          { info: 'HTTP (80, 81, 82...), CLI (4200-4220), SSH (22), HTTPS (443, 444)', title: 'LAN', name: 'lan' },
          { info: 'SSH (2222)', title: 'WAN', name: 'wan' }
        ],
        id: 'access_control',
        sectionName: 'access_control',
        servicesPath: { to: '/system/admin/access_control/general', readonly: false },
        title: 'Access Control',
        type: 'basic'
      }
    ]
    expect(wrapper.vm.parseAccessControlData(data)).toEqual(res)
  })
  it('returns parsed Network event data', () => {
    const data = [
      {
        event: 'description',
        date: 'title'
      }
    ]
    const res = [
      {
        content: [{ info: 'description', title: 'title', name: 'recent-network-events' }],
        id: 'network_events',
        sectionName: 'network_events',
        statusPath: { to: '/system/maintenance/eventlog', readonly: false },
        title: 'Recent network events',
        type: 'basic'
      }
    ]
    expect(wrapper.vm.parseNetworkEventData(data)).toEqual(res)
  })
  it.each([
    [
      [{ event: 'description', date: 'title' }],
      [
        {
          content: [{ info: 'description', title: 'title', name: 'recent-system-events' }],
          id: 'system_events',
          sectionName: 'system_events',
          statusPath: { to: '/system/maintenance/eventlog', readonly: false },
          title: 'Recent system events',
          type: 'basic'
        }
      ]
    ],
    [
      [{}],
      [
        {
          content: [{ info: '-', title: '-', name: 'recent-system-events' }],
          id: 'system_events',
          sectionName: 'system_events',
          statusPath: { to: '/system/maintenance/eventlog', readonly: false },
          title: 'Recent system events',
          type: 'basic'
        }
      ]
    ]
  ])('returns parsed System event data', (data, res) => {
    expect(wrapper.vm.parseSystemEventData(data)).toEqual(res)
  })
  it.each([
    [
      [{}],
      [],
      [
        {
          content: [
            { info: 'Disabled', title: 'Status', name: 'status' },
            { info: '-', title: 'Period', name: 'period' },
            {
              info: '0 / 0',
              overLimit: false,
              servicesPath: '/network/mobile/limits/sms?edit=',
              title: 'SMS sent / limit',
              name: 'sms-sent-sms-limit'
            },
            { info: '-', title: 'SMS limit clear due', name: 'sms-limit-clear-due' }
          ],
          id: 'sms_limit_simundefined',
          sectionName: undefined,
          servicesPath: { to: '/network/mobile/limits/sms?edit=undefined', readonly: false },
          title: 'SIM1 SMS limit',
          type: 'sms_limit'
        }
      ]
    ],
    [
      [{ sms_limit_enabled: '1', sms_limit_period: 'week', sms_sent: '1', sms_limit: '2', section_name: 'cfg01aa0e' }],
      [],
      [
        {
          content: [
            { info: 'Enabled', title: 'Status', name: 'status' },
            { info: 'week', title: 'Period', name: 'period' },
            {
              info: '1 / 2',
              overLimit: false,
              servicesPath: '/network/mobile/limits/sms?edit=cfg01aa0e',
              title: 'SMS sent / limit',
              name: 'sms-sent-sms-limit'
            },
            { info: '-', title: 'SMS limit clear due', name: 'sms-limit-clear-due' }
          ],
          id: 'sms_limit_simundefined',
          sectionName: 'cfg01aa0e',
          servicesPath: { to: '/network/mobile/limits/sms?edit=cfg01aa0e', readonly: false },
          title: 'SIM1 SMS limit',
          type: 'sms_limit'
        }
      ]
    ],
    [
      [
        {
          sms_limit_enabled: '1',
          sms_limit_period: 'week',
          sms_sent: '1',
          sms_limit: '2',
          section_name: 'cfg01aa0e',
          modem: '3-1',
          sms_due_reset_time: '1675123200'
        }
      ],
      [
        { id: '3-1', name: 'Internal', sim_count: 1, active_sim: 1 },
        { id: '3-2', name: 'Internal2', sim_count: 1, active_sim: 1 }
      ],
      [
        {
          content: [
            { info: 'Enabled', title: 'Status', name: 'status' },
            { info: 'week', title: 'Period', name: 'period' },
            {
              info: '1 / 2',
              overLimit: false,
              servicesPath: '/network/mobile/limits/sms?edit=cfg01aa0e',
              title: 'SMS sent / limit',
              name: 'sms-sent-sms-limit'
            },
            { info: '2023-01-31 00:00:00', title: 'SMS limit clear due', name: 'sms-limit-clear-due' }
          ],
          id: 'sms_limit_simundefined',
          sectionName: 'cfg01aa0e',
          servicesPath: { to: '/network/mobile/limits/sms?edit=cfg01aa0e', readonly: false },
          title: 'SIM1 SMS limit',
          type: 'sms_limit'
        }
      ]
    ]
  ])('returns parsed SMS limit data', (data, modems, res) => {
    wrapper.vm.modems = modems
    wrapper.vm.$mobile.shouldShowModemName = vi.fn().mockReturnValue(modems.length > 1)
    wrapper.vm.$mobile.getSimModemLabel = vi.fn().mockReturnValue('1')
    expect(wrapper.vm.parseSmsLimitData(data)).toEqual(res)
  })
  it.each([
    [
      'data used enabled and iface up',
      [{ id: 'mob1s1a1' }],
      [{ network_type: 'mobile', id: 'mob1s1a1', data_used: 1, data_limit: 10 }],
      [
        {
          content: [
            { info: '1 B / 10 B', title: 'Data used / limit', titleHint: [], name: 'data-used-data-limit' },
            { info: '-', title: 'Data limit clear due', name: 'data-limit-clear-due' },
            { info: 'Disabled', title: 'SMS warning', name: 'sms-warning' },
            { info: '-', title: 'SIM', name: 'sim' }
          ],
          id: 'mobile_data_limit',
          sectionName: 'mob1s1a1',
          servicesPath: { hint: undefined, readonly: false, to: '/network/mobile/limits/data?edit=mob1s1a1' },
          title: 'mob1s1a1 Data limit',
          type: 'basic'
        }
      ]
    ],
    [
      'data used enabled and iface down',
      [{ id: 'mob1s1a1' }],
      [{ network_type: 'mobile', id: 'mob1s1a1', data_used: 'N/A', data_limit: 100 }],
      [
        {
          content: [
            {
              info: 'N/A / 100 B',
              title: 'Data used / limit',
              name: 'data-used-data-limit',
              titleHint: [{ info: 'Data used not available when interface is down' }]
            },
            { info: '-', title: 'Data limit clear due', name: 'data-limit-clear-due' },
            { info: 'Disabled', title: 'SMS warning', name: 'sms-warning' },
            { info: '-', title: 'SIM', name: 'sim' }
          ],
          id: 'mobile_data_limit',
          sectionName: 'mob1s1a1',
          servicesPath: { hint: undefined, readonly: false, to: '/network/mobile/limits/data?edit=mob1s1a1' },
          title: 'mob1s1a1 Data limit',
          type: 'basic'
        }
      ]
    ]
  ])('returns parsed Mobile Data limit data when %s', async (text, data, networkStatus, res) => {
    wrapper.vm.$mobile.getSimLabel = vi.fn().mockReturnValue(undefined)
    expect(wrapper.vm.parseDataLimitData(data, networkStatus)).toEqual(res)
  })

  it.each`
    data                                                                                                                                                                              | config                                                                                    | mwan3              | offline    | apns                                                 | res
    ${[{ network_type: 'wired', device: 'eth1', ipaddrs: ['192.168.1.1'], id: 'lan' }]}                                                                                               | ${[{ id: 'lan', area_type: 'lan' }]}                                                      | ${[]}              | ${[]}      | ${[]}                                                | ${[{ apnRow: false, content: [{ info: 'Wired (eth1)', title: 'Type', name: 'type' }, { title: 'IP address', name: 'ip-address' }, { info: '-', name: 'ports', title: 'Ports' }], id: 'interface', sectionName: 'lan', servicesPath: { hint: undefined, readonly: false, to: '/network/lan?edit=lan' }, statusPath: { to: '/status/network/lan', readonly: false }, title: 'lan', type: 'interface' }]}
    ${[{ network_type: 'wired', id: 'lan', ipaddrs: ['192.168.1.1'], ip6addrs: ['f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13'] }]}                                                        | ${[{ id: 'lan', area_type: 'lan' }]}                                                      | ${[{ id: 'lan' }]} | ${[]}      | ${[]}                                                | ${[{ apnRow: false, content: [{ info: 'Wired', title: 'Type', name: 'type' }, { title: 'IP address', name: 'ip-address' }, { info: '-', name: 'ports', title: 'Ports' }], id: 'interface', sectionName: 'lan', servicesPath: { hint: undefined, readonly: false, to: '/network/lan?edit=lan' }, statusPath: { to: '/status/network/lan', readonly: false }, title: 'lan', type: 'interface' }]}
    ${[{ network_type: 'wired', id: 'lan', ipaddrs: [], ip6addrs: [], mwan_enabled: '1' }]}                                                                                           | ${[{ id: 'lan', area_type: 'lan' }]}                                                      | ${[{ id: 'lan' }]} | ${[]}      | ${[]}                                                | ${[{ apnRow: false, content: [{ info: 'Wired', title: 'Type', name: 'type' }, { title: 'IP address', name: 'ip-address' }, { info: '-', name: 'ports', title: 'Ports' }], id: 'interface', sectionName: 'lan', servicesPath: { hint: undefined, readonly: false, to: '/network/lan?edit=lan' }, statusPath: { to: '/status/network/lan', readonly: false }, title: 'lan', type: 'interface' }]}
    ${[{ network_type: 'mobile', id: 'mob1', ipaddrs: [], ip6addrs: [], mwan_enabled: '1', modem: '3-1' }]}                                                                           | ${[{ id: 'mob1', method: 'bridge', area_type: 'wan' }]}                                   | ${[{ id: 'lan' }]} | ${[]}      | ${[]}                                                | ${[{ apnRow: true, content: [{ info: 'Mobile (Bridge mode)', title: 'Type', name: 'type' }, { title: 'IP address', name: 'ip-address' }, { info: '-', title: 'APN', name: 'apn' }], id: 'interface', sectionName: 'mob1', servicesPath: { hint: undefined, readonly: false, to: '/network/wan?edit=mob1' }, statusPath: '', title: 'mob1', type: 'interface' }]}
    ${[{ sectionName: 'newInterface', ipaddrs: [0] }]}                                                                                                                                | ${[]}                                                                                     | ${[]}              | ${[]}      | ${[]}                                                | ${[{ apnRow: false, content: [{ info: '-', title: 'Type', name: 'type' }, { title: 'IP address', name: 'ip-address' }], id: 'interface', sectionName: 'newInterface', servicesPath: { hint: undefined, readonly: true, to: '' }, statusPath: '', title: 'newInterface', type: 'interface' }]}
    ${[{ network_type: 'mobile', id: 'mob1', ipaddrs: [], ip6addrs: ['f184:bb18:a403:2fde:fd4a:4b8d:7125:6c13'], mwan_enabled: '1', modem: '3-1' }]}                                  | ${[{ id: 'mob1', method: 'bridge', area_type: 'wan', pdptype: 'ipv6' }]}                  | ${[{ id: 'lan' }]} | ${[]}      | ${[]}                                                | ${[{ apnRow: true, content: [{ info: 'Mobile (Bridge mode)', title: 'Type', name: 'type' }, { title: 'IP address', name: 'ip-address' }, { info: '-', title: 'APN', name: 'apn' }], id: 'interface', sectionName: 'mob1', servicesPath: { hint: undefined, readonly: false, to: '/network/wan?edit=mob1' }, statusPath: '', title: 'mob1', type: 'interface' }]}
    ${[{ network_type: 'mobile', id: 'mob1', ipaddrs: [], ip6addrs: [], mwan_enabled: '1', modem: '3-1' }]}                                                                           | ${[{ id: 'mob1', method: 'bridge', apn: 'test', auto_apn: '1', area_type: 'wan' }]}       | ${[{ id: 'lan' }]} | ${[]}      | ${[]}                                                | ${[{ apnRow: true, content: [{ info: 'Mobile (Bridge mode)', title: 'Type', name: 'type' }, { title: 'IP address', name: 'ip-address' }, { info: 'Auto (test)', title: 'APN', name: 'apn' }], id: 'interface', sectionName: 'mob1', servicesPath: { hint: undefined, readonly: false, to: '/network/wan?edit=mob1' }, statusPath: '', title: 'mob1', type: 'interface' }]}
    ${[{ main: '1', network_type: 'mobile', id: 'mob1', ipaddrs: [], ip6addrs: [], mwan_enabled: '1', modem: '3-1', modem_id: '3-1', data: { apn_list: [{ id: 1, apn: 'test' }] } }]} | ${[{ id: 'mob1', method: 'passthrough', apn: 'test', force_apn: '1', area_type: 'wan' }]} | ${[{ id: 'lan' }]} | ${[]}      | ${[{ modem: '3-1', apns: [{ id: 1, apn: 'wap' }] }]} | ${[{ apnRow: true, content: [{ info: 'Mobile (Passthrough mode)', title: 'Type', name: 'type' }, { title: 'IP address', name: 'ip-address' }, { info: 'wap', title: 'APN', name: 'apn' }], id: 'interface', sectionName: 'mob1', servicesPath: { hint: undefined, readonly: false, to: '/network/wan?edit=mob1' }, statusPath: '', title: 'mob1 (Main)', type: 'interface' }]}
    ${[{ main: '1', network_type: 'mobile', id: 'mob1', ipaddrs: [], ip6addrs: [], mwan_enabled: '1', modem: '3-1', modem_id: '3-1', data: { apn_list: [{ id: 1, apn: 'test' }] } }]} | ${[{ id: 'mob1', method: 'nat', apn: 'test', force_apn: '1', area_type: 'wan' }]}         | ${[{ id: 'lan' }]} | ${['3-1']} | ${[{ modem: '3-1', apns: [] }]}                      | ${[{ apnRow: true, content: [{ info: 'Mobile', title: 'Type', name: 'type' }, { title: 'IP address', name: 'ip-address' }, { info: '-', title: 'APN', name: 'apn' }], id: 'interface', sectionName: 'mob1', servicesPath: { hint: "This instance can't be edited because modem is blocked or disabled", readonly: true, to: '/network/wan?edit=mob1' }, statusPath: '', title: 'mob1 (Main)', type: 'interface' }]}
  `('returns parsed Interfaces data #%#', ({ data, config, mwan3, offline, apns, res }) => {
    wrapper.vm.offlineModems = offline
    const changedRes = res.map(res => ({ ...res, status: data[0], config: config[0] ?? {} }))
    expect(wrapper.vm.parseInterfacesData(data, config, mwan3, [], [], apns, [])).toEqual(changedRes)
  })

  it('returns parsed internet data when there is internet', () => {
    const stats = { ipv4_status: 'Online', ipv6_status: 'Online', dns_status: 'Online' }
    wrapper.vm.$network.parseInternetStatus = network.parseInternetStatus
    expect(wrapper.vm.parseInternet(stats)).toEqual([
      {
        title: 'Internet status',
        content: [
          {
            title: 'IPv4 status',
            slotName: 'ipv4_status',
            info: 'Online',
            style: 'success'
          },
          {
            title: 'IPv6 status',
            slotName: 'ipv6_status',
            info: 'Online',
            style: 'success'
          },
          {
            title: 'DNS status',
            slotName: 'dns_status',
            info: 'Available',
            style: 'success'
          }
        ],
        type: 'basic',
        sectionName: 'connchecker',
        id: 'connchecker',
        servicesPath: { readonly: false, to: '/network/internet_status' }
      }
    ])
  })

  it('returns parsed internet data when there is no internet', () => {
    const stats = {}
    wrapper.vm.$network.parseInternetStatus = network.parseInternetStatus
    expect(wrapper.vm.parseInternet(stats)).toEqual([
      {
        title: 'Internet status',
        content: [
          {
            title: 'IPv4 status',
            slotName: 'ipv4_status',
            info: '-'
          },
          {
            title: 'IPv6 status',
            slotName: 'ipv6_status',
            info: '-'
          },
          {
            title: 'DNS status',
            slotName: 'dns_status',
            info: '-'
          }
        ],
        type: 'basic',
        sectionName: 'connchecker',
        id: 'connchecker',
        servicesPath: { readonly: false, to: '/network/internet_status' }
      }
    ])
  })

  it('returns parsed internet data when there internet is untracked', () => {
    const stats = { ipv4_status: 'Untracked', ipv6_status: 'Untracked', dns_status: 'Untracked' }
    wrapper.vm.$network.parseInternetStatus = network.parseInternetStatus
    expect(wrapper.vm.parseInternet(stats)).toEqual([
      {
        title: 'Internet status',
        content: [
          {
            title: 'IPv4 status',
            slotName: 'ipv4_status',
            info: 'Untracked'
          },
          {
            title: 'IPv6 status',
            slotName: 'ipv6_status',
            info: 'Untracked'
          },
          {
            title: 'DNS status',
            slotName: 'dns_status',
            info: 'Untracked'
          }
        ],
        type: 'basic',
        sectionName: 'connchecker',
        id: 'connchecker',
        servicesPath: { readonly: false, to: '/network/internet_status' }
      }
    ])
  })

  it('returns failover data', () => {
    const configs = [
      {
        id: 'wan1'
      },
      {
        id: 'wan'
      }
    ]
    const members = [
      {
        id: 'wan_member_mwan',
        interface: 'wan',
        metric: 1
      },
      {
        id: 'wan1_member_mwan',
        interface: 'wan1',
        metric: 2
      }
    ]
    const policies = [{ id: 'mwan_default', use_member: ['wan_member_mwan', 'wan1_member_mwan'] }]
    const mode = { mode: 'mwan' }
    const status = {
      wan: {
        status: 'online'
      },
      wan1: {
        status: 'online'
      }
    }
    const interfaceStatus = []
    expect(wrapper.vm.parseFailover(configs, policies, mode, members, status, interfaceStatus)).toEqual([
      {
        title: 'Multiwan',
        servicesPath: { to: '/network/failover/mwan', readonly: false },
        content: [
          {
            info: 'Failover',
            name: 'multiwan-mode',
            title: 'Mode'
          },
          {
            info: 'Online',
            style: 'success',
            title: 'wan',
            name: '1-wan'
          },
          {
            info: 'Online',
            style: 'success',
            title: 'wan1',
            name: '2-wan1'
          }
        ],
        type: 'basic',
        sectionName: 'failover_priority',
        id: 'failover_priority'
      }
    ])
  })

  it.each`
    dsa      | board                                   | ifname        | ifaceBasedConfig                        | ifaceBasedDevices                          | portBased                                                | bridgeStatus                                                        | wirelessStatus                                            | expectedResult
    ${false} | ${{ lan: { device: 'eth0' } }}          | ${'eth0'}     | ${[]}                                   | ${[]}                                      | ${[]}                                                    | ${[]}                                                               | ${[]}                                                     | ${'LAN'}
    ${false} | ${{ lan: { device: 'eth1' } }}          | ${'eth1'}     | ${[]}                                   | ${[]}                                      | ${[]}                                                    | ${[]}                                                               | ${[]}                                                     | ${'LAN'}
    ${false} | ${{ wan: { device: 'eth0' } }}          | ${'eth0'}     | ${[]}                                   | ${[]}                                      | ${[]}                                                    | ${[]}                                                               | ${[]}                                                     | ${'WAN'}
    ${false} | ${{ wan: { device: 'eth1' } }}          | ${'eth1'}     | ${[]}                                   | ${[]}                                      | ${[]}                                                    | ${[]}                                                               | ${[]}                                                     | ${'WAN'}
    ${false} | ${{ lan: { ports: ['lan1', 'lan2'] } }} | ${'lan2'}     | ${[]}                                   | ${[]}                                      | ${[]}                                                    | ${[]}                                                               | ${[]}                                                     | ${'LAN2'}
    ${false} | ${{ wan: { device: 'wan' } }}           | ${'wan'}      | ${[]}                                   | ${[]}                                      | ${[]}                                                    | ${[]}                                                               | ${[]}                                                     | ${'WAN'}
    ${false} | ${{}}                                   | ${'ecm0'}     | ${[]}                                   | ${[]}                                      | ${[]}                                                    | ${[]}                                                               | ${[]}                                                     | ${'USB'}
    ${false} | ${{}}                                   | ${'rndis0'}   | ${[]}                                   | ${[]}                                      | ${[]}                                                    | ${[]}                                                               | ${[]}                                                     | ${'USB'}
    ${false} | ${{}}                                   | ${'wlan1-1'}  | ${[]}                                   | ${[]}                                      | ${[]}                                                    | ${[]}                                                               | ${[{ ssid: 'myWifi', devices: [{ ifname: 'wlan1-1' }] }]} | ${'Wireless (myWifi)'}
    ${false} | ${{}}                                   | ${'eth0.3'}   | ${[]}                                   | ${[]}                                      | ${[{ vid: '3', lan1: 't', lan2: 'u', lan3: '' }]}        | ${[]}                                                               | ${[]}                                                     | ${'LAN1, LAN2'}
    ${false} | ${{}}                                   | ${'br-lan'}   | ${[]}                                   | ${[]}                                      | ${[{ vid: '3', lan1: 't', lan2: '' }]}                   | ${[{ name: 'br-lan', 'bridge-members': ['eth0.3'] }]}               | ${[]}                                                     | ${'LAN1'}
    ${true}  | ${{ lan: { ports: ['lan1', 'lan2'] } }} | ${'br-lan.3'} | ${[]}                                   | ${[]}                                      | ${[{ vid: '3', device: 'br-lan', lan1: 't', lan2: '' }]} | ${[{ name: 'br-lan', 'bridge-members': ['lan1', 'lan2'] }]}         | ${[]}                                                     | ${'LAN1'}
    ${true}  | ${{ lan: { ports: ['lan1', 'lan2'] } }} | ${'br-lan'}   | ${[]}                                   | ${[]}                                      | ${[{ vid: '3', device: 'br-lan', lan1: 't', lan2: '' }]} | ${[{ name: 'br-lan', 'bridge-members': ['lan1', 'lan2', 'ecm0'] }]} | ${[]}                                                     | ${'LAN1, LAN2, USB'}
    ${false} | ${{ lan: { device: 'eth0' } }}          | ${'ifVlan'}   | ${[{ name: 'ifVlan', ifname: 'eth0' }]} | ${[]}                                      | ${[]}                                                    | ${[]}                                                               | ${[]}                                                     | ${'LAN'}
    ${false} | ${{ lan: { device: 'eth0' } }}          | ${'ifVlan1'}  | ${[{ name: 'ifVlan', ifname: 'eth0' }]} | ${[{ name: 'ifVlan1', ifname: 'ifVlan' }]} | ${[]}                                                    | ${[]}                                                               | ${[]}                                                     | ${'LAN'}
  `('returns default ports #%#', ({ dsa, board, ifname, ifaceBasedConfig, ifaceBasedDevices, portBased, bridgeStatus, wirelessStatus, expectedResult }) => {
    wrapper.vm.$store.board.hwinfo.dsa = dsa
    wrapper.vm.$store.board.network = board
    expect(parsePorts(ifname, ifaceBasedConfig, ifaceBasedDevices, portBased, bridgeStatus, wirelessStatus)).toEqual(expectedResult)
  })

  it('returns parsed Hotspot data', () => {
    const data = [{}]
    const res = [
      {
        content: [
          { info: 'Disabled', title: 'Status', name: 'status' },
          { info: '0 / 0', title: 'Bytes received / sent', name: 'bytes-received-sent' }
        ],
        id: 'hotspot',
        sectionName: 'hotspot',
        servicesPath: { to: '/services/hotspot/general', readonly: false },
        statusPath: { to: '/system/maintenance/hotspot/', readonly: false },
        title: 'Hotspot',
        type: 'basic'
      }
    ]
    expect(wrapper.vm.parseHotspotData(data)).toEqual(res)
  })
  it.each([
    [
      '1',
      [{}],
      [{}],
      [
        {
          content: [
            { info: '-', locked: null, title: 'SSID', config: {}, name: 'ssid' },
            { info: '-', title: 'Mode', name: 'mode' },
            { info: '-', title: 'Channel', name: 'channel' },
            { info: '0', title: 'Clients', name: 'clients' }
          ],
          id: 'wireless',
          sectionName: undefined,
          servicesPath: { to: '/network/wireless/ssids?edit=', readonly: false },
          statusPath: { to: '/status/wireless/interfaces', readonly: false },
          title: 'Wireless',
          type: 'wifi',
          up: false
        }
      ]
    ],
    [
      '2',
      [
        {
          ssid: 'test',
          encryption: 'None',
          mode: 'Access Point',
          num_assoc: '1',
          id: 'test',
          up: 'true',
          devices: [{ band: '2.4GHz', channel: '1' }]
        }
      ],
      [{ id: 'test', ssid: 'test' }],
      [
        {
          content: [
            { info: 'test', locked: false, title: 'SSID', config: { id: 'test', ssid: 'test' }, name: 'ssid' },
            { info: '-', title: 'Mode', name: 'mode' },
            { info: '1', title: 'Channel', name: 'channel' },
            { info: '1', title: 'Clients', name: 'clients' }
          ],
          id: 'wireless',
          sectionName: 'test',
          servicesPath: { to: '/network/wireless/ssids?edit=test', readonly: false },
          statusPath: { to: '/status/wireless/interfaces', readonly: false },
          title: 'myWifi (2.4GHz)',
          type: 'wifi',
          up: 'true'
        }
      ]
    ],
    [
      '3',
      [
        {
          ssid: 'test',
          encryption: 'None',
          mode: 'Client',
          num_assoc: '1',
          id: 'test',
          up: 'true',
          devices: [{ band: '5GHz', channel: '1' }]
        }
      ],
      [{}],
      [
        {
          content: [
            { info: 'test', locked: false, title: 'SSID', config: {}, name: 'ssid' },
            { info: '-', title: 'Mode', name: 'mode' },
            { info: '1', title: 'Channel', name: 'channel' },
            { info: '1', title: 'Clients', name: 'clients' }
          ],
          id: 'wireless',
          sectionName: 'test',
          servicesPath: { to: '/network/wireless/ssids?edit=test', readonly: false },
          statusPath: { to: '/status/wireless/interfaces', readonly: false },
          title: 'myWifi (5GHz)',
          type: 'wifi',
          up: 'true'
        }
      ]
    ],
    [
      '4',
      [
        {
          ssid: 'test',
          encryption: 'None',
          mode: 'Ad-Hoc',
          num_assoc: '1',
          id: 'test1',
          up: 'true',
          link: 'test1',
          devices: [{ band: '2.4GHz', channel: '1' }]
        }
      ],
      [{ id: 'test1', ssid: 'test' }],
      [
        {
          content: [
            { info: 'test', locked: false, title: 'SSID', config: { id: 'test1', ssid: 'test' }, name: 'ssid' },
            { info: '-', title: 'Mode', name: 'mode' },
            { info: '1', title: 'Channel', name: 'channel' },
            { info: '1', title: 'Clients', name: 'clients' }
          ],
          id: 'wireless',
          sectionName: 'test1',
          servicesPath: { to: '/network/wireless/ssids?edit=test1', readonly: false },
          statusPath: { to: '/status/wireless/interfaces', readonly: false },
          title: 'myWifi (2.4GHz)',
          type: 'wifi',
          up: 'true'
        }
      ]
    ],
    [
      '5',
      [
        {
          mesh_id: 'test1',
          encryption: 'None',
          mode: 'Mesh',
          num_assoc: '1',
          id: 'test1',
          up: 'true',
          sectionName: 'test1',
          devices: [
            {
              band: '2.4GHz',
              channel: '1'
            }
          ]
        }
      ],
      [{}],
      [
        {
          content: [
            { info: 'test1', locked: false, title: 'SSID', config: {}, name: 'ssid' },
            { info: '-', title: 'Mode', name: 'mode' },
            { info: '1', title: 'Channel', name: 'channel' },
            { info: '1', title: 'Clients', name: 'clients' }
          ],
          id: 'wireless',
          sectionName: 'test1',
          servicesPath: { to: '/network/wireless/ssids?edit=test1', readonly: false },
          statusPath: { to: '/status/wireless/interfaces', readonly: false },
          title: 'myWifi (2.4GHz)',
          type: 'wifi',
          up: 'true'
        }
      ]
    ],
    [
      '6',
      [
        {
          ssid: 'test',
          encryption: '-',
          mode: 'Monitor',
          num_assoc: '1',
          id: 'test',
          up: 'true',
          devices: [{ band: '2.4GHz', channel: '1' }]
        }
      ],
      [{}],
      [
        {
          content: [
            { info: 'test', locked: true, title: 'SSID', config: {}, name: 'ssid' },
            { info: '-', title: 'Mode', name: 'mode' },
            { info: '1', title: 'Channel', name: 'channel' },
            { info: '1', title: 'Clients', name: 'clients' }
          ],
          id: 'wireless',
          sectionName: 'test',
          servicesPath: { to: '/network/wireless/ssids?edit=test', readonly: false },
          statusPath: { to: '/status/wireless/interfaces', readonly: false },
          title: 'myWifi (2.4GHz)',
          type: 'wifi',
          up: 'true'
        }
      ]
    ]
  ])('returns parsed Wireless data %s', (text, data, configs, res) => {
    wrapper.vm.$wireless.getName = vi.fn().mockReturnValue('myWifi')
    expect(wrapper.vm.parseWirelessData(data, configs)).toEqual(res)
  })
  it.each([
    [
      'RUTX',
      false,
      [{ operator_state: 'searching', conntype: 'N/A' }],
      [],
      [
        {
          content: [
            { info: '-', title: 'Data connection', name: 'data-connection' },
            { info: 'searching; undefined; N/A', title: 'State', name: 'state' },
            { info: '-', title: 'SIM card info', unblock: false, unlock: false, simSwitch: false, name: 'sim-card-info' },
            { info: '0 B / 0 B', title: 'Data received / sent', name: 'data-received-sent' }
          ],
          hints: [],
          id: 'mobile',
          sectionName: '-',
          servicesPath: { hint: undefined, readonly: false, to: '/network/mobile/general/' },
          signal: '-',
          statusPath: { hint: undefined, readonly: false, to: '/status/network/mobile?tab=' },
          title: '-',
          modemId: undefined,
          simSection: undefined,
          type: 'modem'
        }
      ]
    ],
    [
      'TRB5',
      false,
      [{ operator_state: 'roaming', conntype: 'N/A', data_conn_state: 'Disconnected', pinstate: 'Not inserted', active_sim: '1' }],
      [],
      [
        {
          content: [
            { info: 'Disconnected', title: 'Data connection', name: 'data-connection' },
            { info: 'roaming; undefined; N/A', title: 'State', name: 'state' },
            { info: 'SIM1 - Not inserted', title: 'SIM card info', unblock: false, unlock: false, simSwitch: false, name: 'sim-card-info' }
          ],
          hints: [],
          id: 'mobile',
          sectionName: '-',
          servicesPath: { hint: undefined, readonly: false, to: '/network/mobile/general/' },
          signal: '-',
          statusPath: { hint: undefined, readonly: false, to: '/status/network/mobile?tab=' },
          title: '-',
          modemId: undefined,
          simSection: undefined,
          type: 'modem'
        }
      ]
    ],
    [
      'RUTX',
      false,
      [
        {
          operator_state: 'roaming',
          conntype: 'N/A',
          data_conn_state: 'Disconnected',
          pinstate: 'PUK required',
          active_sim: '1',
          id: '3-1',
          offline: '1',
          simsection: 'cfg01aa0e',
          data_off: true,
          deny_roaming: '0',
          cell_info: 'N/A'
        }
      ],
      [{ modem: '3-1', section_name: 'cfg01aa0e' }],
      [
        {
          content: [
            { info: 'Disconnected', title: 'Data connection', name: 'data-connection' },
            { info: 'roaming; undefined; N/A', title: 'State', name: 'state' },
            { info: 'SIM1 - PUK required', title: 'SIM card info', unblock: false, unlock: false, simSwitch: false, name: 'sim-card-info' },
            { info: '0 B / 0 B', title: 'Data received / sent', name: 'data-received-sent' }
          ],
          hints: [{ info: 'Mobile data is turned off by an external application' }],
          id: 'mobile',
          modemId: '3-1',
          simSection: 'cfg01aa0e',
          sectionName: '3-1',
          servicesPath: {
            hint: "This page can't be viewed because modem is unreachable",
            readonly: true,
            to: '/network/mobile/general/3-1?simTab=cfg01aa0e'
          },
          signal: '-',
          statusPath: {
            hint: "This page can't be viewed because modem is unreachable",
            readonly: true,
            to: '/status/network/mobile?tab=3-1'
          },
          title: '-',
          type: 'modem'
        }
      ]
    ],
    [
      'RUTX',
      false,
      [
        {
          operator_state: 'roaming',
          conntype: 'N/A',
          data_conn_state: 'Disconnected',
          pinstate: 'PUK required',
          active_sim: '1',
          id: '3-1',
          offline: '1',
          simsection: 'cfg01aa0e',
          data_off: true,
          deny_roaming: '1',
          pukleft: 9,
          pinleft: 0,
          cell_info: [{ ue_state: 0 }]
        }
      ],
      [{ modem: '3-1', section_name: 'cfg01aa0e' }],
      [
        {
          content: [
            { info: 'Disconnected', title: 'Data connection', name: 'data-connection' },
            { info: 'roaming; undefined; N/A', title: 'State', name: 'state' },
            { info: 'SIM1 - PUK required', title: 'SIM card info', unblock: false, unlock: false, simSwitch: false, name: 'sim-card-info' },
            { info: '0 B / 0 B', title: 'Data received / sent', name: 'data-received-sent' }
          ],
          hints: [
            { info: 'Mobile data is turned off by an external application' },
            { info: 'Mobile data is not allowed when roaming. To allow data, go to', to: '/network/mobile/general/3-1', toText: 'Mobile -> General' }
          ],
          id: 'mobile',
          sectionName: '3-1',
          servicesPath: {
            hint: "This page can't be viewed because modem is unreachable",
            readonly: true,
            to: '/network/mobile/general/3-1?simTab=cfg01aa0e'
          },
          signal: '-',
          statusPath: {
            hint: "This page can't be viewed because modem is unreachable",
            readonly: true,
            to: '/status/network/mobile?tab=3-1'
          },
          title: '-',
          modemId: '3-1',
          simSection: 'cfg01aa0e',
          type: 'modem'
        }
      ]
    ],
    [
      'RUTX',
      false,
      [
        {
          operator_state: '',
          conntype: 'N/A',
          data_conn_state: 'Disconnected',
          pinstate: 'PUK required',
          active_sim: '1',
          id: '3-1',
          offline: '1',
          simsection: 'cfg01aa0e',
          data_off: true,
          deny_roaming: '1',
          datalimit: true,
          pukleft: 5,
          pinleft: 0,
          builtin: false,
          primary: false,
          cell_info: [{ ue_state: 2 }],
          name: 'External modem'
        }
      ],
      [{ modem: '3-1', section_name: 'cfg01aa0e' }],
      [
        {
          content: [
            { info: 'Disconnected', title: 'Data connection', name: 'data-connection' },
            { info: '-', title: 'State', name: 'state' },
            { info: 'SIM1 - PUK required', title: 'SIM card info', unblock: false, unlock: false, simSwitch: false, name: 'sim-card-info' },
            { info: '0 B / 0 B', title: 'Data received / sent', name: 'data-received-sent' }
          ],
          hints: [
            { info: 'Mobile data is turned off by an external application' },
            { info: 'Mobile data limit reached. To change or reset limit, go to', to: '/network/mobile/limits/data', toText: 'Mobile -> Limits' }
          ],
          id: 'mobile',
          sectionName: '3-1',
          servicesPath: {
            hint: "This page can't be viewed because modem is unreachable",
            readonly: true,
            to: '/network/mobile/general/3-1?simTab=cfg01aa0e'
          },
          signal: '-',
          statusPath: {
            hint: "This page can't be viewed because modem is unreachable",
            readonly: true,
            to: '/status/network/mobile?tab=3-1'
          },
          title: 'External modem (unreachable)',
          modemId: '3-1',
          simSection: 'cfg01aa0e',
          type: 'modem'
        }
      ]
    ],
    [
      'RUTX',
      false,
      [
        {
          operator_state: 'roaming',
          conntype: 'N/A',
          data_conn_state: 'Disconnected',
          pinstate: 'PIN required',
          active_sim: '1',
          id: '3-1',
          offline: '1',
          simsection: 'cfg01aa0e',
          data_off: true,
          deny_roaming: '1',
          pinleft: 2,
          builtin: true,
          primary: true,
          cell_info: [{ ue_state: 2 }]
        }
      ],
      [{ modem: '3-1', section_name: 'cfg01aa0e' }],
      [
        {
          content: [
            { info: 'Disconnected', title: 'Data connection', name: 'data-connection' },
            { info: 'roaming; undefined; N/A', title: 'State', name: 'state' },
            { info: 'SIM1 - PIN required', title: 'SIM card info', unblock: false, unlock: false, simSwitch: false, name: 'sim-card-info' },
            { info: '0 B / 0 B', title: 'Data received / sent', name: 'data-received-sent' }
          ],
          hints: [
            { info: 'Mobile data is turned off by an external application' },
            { info: 'Mobile data is not allowed when roaming. To allow data, go to', to: '/network/mobile/general/3-1', toText: 'Mobile -> General' }
          ],
          id: 'mobile',
          sectionName: '3-1',
          servicesPath: {
            hint: "This page can't be viewed because modem is unreachable",
            readonly: true,
            to: '/network/mobile/general/3-1?simTab=cfg01aa0e'
          },
          signal: '-',
          statusPath: {
            hint: "This page can't be viewed because modem is unreachable",
            readonly: true,
            to: '/status/network/mobile?tab=3-1'
          },
          title: '-',
          modemId: '3-1',
          simSection: 'cfg01aa0e',
          type: 'modem'
        }
      ]
    ],
    [
      'RUTX12',
      true,
      [
        {
          operator_state: 'Limited service',
          conntype: 'N/A',
          data_conn_state: 'Disconnected',
          pinstate: 'PIN required',
          active_sim: '1',
          id: '3-1',
          offline: '1',
          simsection: 'cfg01aa0e',
          data_off: true,
          deny_roaming: '1',
          pinleft: 2,
          builtin: true,
          primary: true,
          cell_info: [{ ue_state: 2 }],
          name: 'Primary modem'
        },
        {
          operator_state: 'roaming',
          conntype: 'N/A',
          data_conn_state: 'Disconnected',
          pinstate: 'Not inserted',
          active_sim: '1',
          id: '1-1.2',
          offline: '1',
          simsection: 'cfg02aa0e',
          pinleft: 3,
          builtin: true,
          primary: false,
          name: 'Secondary modem'
        }
      ],
      [
        { modem: '3-1', section_name: 'cfg01aa0e' },
        { modem: '1-1.2', section_name: 'cfg02aa0e' }
      ],
      [
        {
          content: [
            { info: 'Disconnected', title: 'Data connection', name: 'data-connection' },
            { info: 'Limited service; undefined; N/A', title: 'State', name: 'state' },
            { info: 'SIM1 - PIN required', title: 'SIM card info', unblock: false, unlock: false, simSwitch: false, name: 'sim-card-info' },
            { info: '0 B / 0 B', title: 'Data received / sent', name: 'data-received-sent' }
          ],
          hints: [{ info: 'Mobile data is turned off by an external application' }],
          id: 'mobile',
          sectionName: '3-1',
          servicesPath: {
            hint: "This page can't be viewed because modem is unreachable",
            readonly: true,
            to: '/network/mobile/general/3-1?simTab=cfg01aa0e'
          },
          signal: '-',
          statusPath: {
            hint: "This page can't be viewed because modem is unreachable",
            readonly: true,
            to: '/status/network/mobile?tab=3-1'
          },
          title: 'Primary modem (unreachable)',
          modemId: '3-1',
          simSection: 'cfg01aa0e',
          type: 'modem'
        },
        {
          content: [
            { info: 'Disconnected', title: 'Data connection', name: 'data-connection' },
            { info: 'roaming; undefined; N/A', title: 'State', name: 'state' },
            { info: 'SIM1 - Not inserted', title: 'SIM card info', unblock: false, unlock: false, simSwitch: false, name: 'sim-card-info' },
            { info: '0 B / 0 B', title: 'Data received / sent', name: 'data-received-sent' }
          ],
          hints: [],
          id: 'mobile',
          sectionName: '1-1.2',
          servicesPath: {
            hint: "This page can't be viewed because modem is unreachable",
            readonly: true,
            to: '/network/mobile/general/1-1.2?simTab=cfg02aa0e'
          },
          signal: '-',
          statusPath: {
            hint: "This page can't be viewed because modem is unreachable",
            readonly: true,
            to: '/status/network/mobile?tab=1-1.2'
          },
          title: 'Secondary modem (unreachable)',
          modemId: '1-1.2',
          simSection: 'cfg02aa0e',
          type: 'modem'
        }
      ]
    ],
    [
      'RUTM52',
      true,
      [
        {
          operator_state: 'Limited service',
          conntype: 'N/A',
          data_conn_state: 'Disconnected',
          pinstate: 'PIN required',
          active_sim: 2,
          id: '2-1.1',
          sim_count: 2,
          offline: '1',
          simsection: 'cfg01aa0e',
          data_off: true,
          deny_roaming: '1',
          pinleft: 2,
          builtin: true,
          primary: true,
          cell_info: [{ ue_state: 2 }],
          name: 'Primary modem',
          mobile_stage: 23
        },
        {
          operator_state: 'roaming',
          conntype: 'N/A',
          data_conn_state: 'Disconnected',
          pinstate: 'Not inserted',
          active_sim: 2,
          sim_count: 2,
          id: '2-1.2',
          offline: '1',
          simsection: 'cfg02aa0e',
          pinleft: 3,
          builtin: true,
          primary: false,
          name: 'Secondary modem'
        }
      ],
      [
        { modem: '2-1.1', section_name: 'cfg01aa0e' },
        { modem: '2-1.2', section_name: 'cfg02aa0e' }
      ],
      [
        {
          content: [
            { info: 'Disconnected', title: 'Data connection', name: 'data-connection' },
            { info: 'Limited service; undefined; N/A', title: 'State', name: 'state' },
            { info: 'SIM2 - PIN required', title: 'SIM card info', unblock: false, unlock: false, simSwitch: false, name: 'sim-card-info' },
            { info: '0 B / 0 B', title: 'Data received / sent', name: 'data-received-sent' }
          ],
          hints: [
            { info: 'Mobile data is turned off by an external application' },
            { info: 'Mobile data is turned off because flight mode is on. To turn off flight mode, go to', to: '/network/mobile/utilities?tab=2-1.1', toText: 'Mobile -> Utilities' }
          ],
          id: 'mobile',
          sectionName: '2-1.1',
          servicesPath: {
            hint: "This page can't be viewed because modem is unreachable",
            readonly: true,
            to: '/network/mobile/general/2-1.1?simTab=cfg01aa0e'
          },
          signal: '-',
          statusPath: {
            hint: "This page can't be viewed because modem is unreachable",
            readonly: true,
            to: '/status/network/mobile?tab=2-1.1'
          },
          title: 'Primary modem (unreachable)',
          modemId: '2-1.1',
          simSection: 'cfg01aa0e',
          type: 'modem'
        },
        {
          content: [
            { info: 'Disconnected', title: 'Data connection', name: 'data-connection' },
            { info: 'roaming; undefined; N/A', title: 'State', name: 'state' },
            { info: 'SIM2 - Not inserted', title: 'SIM card info', unblock: false, unlock: false, simSwitch: false, name: 'sim-card-info' },
            { info: '0 B / 0 B', title: 'Data received / sent', name: 'data-received-sent' }
          ],
          hints: [],
          id: 'mobile',
          sectionName: '2-1.2',
          servicesPath: {
            hint: "This page can't be viewed because modem is unreachable",
            readonly: true,
            to: '/network/mobile/general/2-1.2?simTab=cfg02aa0e'
          },
          signal: '-',
          statusPath: {
            hint: "This page can't be viewed because modem is unreachable",
            readonly: true,
            to: '/status/network/mobile?tab=2-1.2'
          },
          title: 'Secondary modem (unreachable)',
          modemId: '2-1.2',
          simSection: 'cfg02aa0e',
          type: 'modem'
        }
      ]
    ]
  ])('returns parsed Modems data #%#', (device, dualModem, data, simData, res) => {
    const wrapper = createWrapper(Overview, {
      global: {
        stubs: {
          tltDnd: {
            template: `<div><slot :index="1" :item="{}" :start-drag="() => {}" /></div>`
          }
        },
        mocks: {
          $store: {
            device,
            board: { hwinfo: { dual_modem: dualModem } }
          }
        }
      }
    })
    wrapper.vm.$store.hasPackages = vi.fn().mockReturnValue(device !== 'TRB5')
    const na = vi.fn().mockImplementation(value => {
      return value || 'N/A'
    })
    wrapper.vm.$mobile.getOperatorState = na
    wrapper.vm.$mobile.getConntype = na
    wrapper.vm.$mobile.modemOffline = vi.fn().mockReturnValue(data[0]?.offline === '1')
    wrapper.vm.$mobile.getBlockedText = vi.fn().mockImplementation(() => {
      return 'unreachable'
    })
    wrapper.vm.$mobile.getSimstate = vi.fn().mockImplementation(value => {
      return value?.pinstate || 'N/A'
    })
    wrapper.vm.$mobile.getDataConnState = vi.fn().mockImplementation(value => {
      return value || '-'
    })
    wrapper.vm.$mobile.getGnssState = vi.fn().mockReturnValue(false)
    wrapper.vm.$mobile.shouldAllowSimUnblock = vi.fn().mockReturnValue(false)
    wrapper.vm.$mobile.shouldAllowSimUnlock = vi.fn().mockReturnValue(false)
    wrapper.vm.$mobile.getSimLabel = vi.fn().mockReturnValue(data[0].active_sim)
    expect(wrapper.vm.parseModemsData(data, simData)).toEqual(res)
  })
  it.each([
    [
      false,
      {
        uptime: '00h 47m 33s',
        memory: {
          ram_percentage: '10',
          flash_percentage: '11',
          ram_used: '1',
          ram_total: '2',
          ram_free: '1',
          flash_used: '1',
          flash_total: '2',
          flash_free: '1'
        },
        fw_version: 'RUT',
        loadavg: '0.01'
      },
      [
        {
          content: [
            { info: '00h 47m 33s', title: 'Device uptime', name: 'device-uptime' },
            { info: '-', title: 'Local device time', name: 'local-device-time' },
            {
              info: [
                { name: 'RAM', percents: 10, title: 'ram' },
                { name: 'FLASH', percents: 11, title: 'flash' }
              ],
              title: 'Memory usage',
              name: 'memory-usage'
            },
            { info: 'RUT', title: 'Firmware version', name: 'firmware-version' }
          ],
          headerItem: [{ info: 1, title: 'CPU load' }],
          hints: [
            { free: 1, total: 2, used: 1 },
            { free: 1, total: 2, used: 1 }
          ],
          id: 'system',
          sectionName: 'system',
          statusPath: { to: '/status/system', readonly: false },
          title: 'System',
          type: 'system'
        }
      ]
    ],
    [
      false,
      {},
      [
        {
          content: [
            { info: '-', title: 'Device uptime', name: 'device-uptime' },
            { info: '-', title: 'Local device time', name: 'local-device-time' },
            {
              info: [
                { name: 'RAM', percents: 0, title: 'ram' },
                { name: 'FLASH', percents: 0, title: 'flash' }
              ],
              title: 'Memory usage',
              name: 'memory-usage'
            },
            { info: '-', title: 'Firmware version', name: 'firmware-version' }
          ],
          headerItem: [{ info: 0, title: 'CPU load' }],
          hints: [
            { free: 0, total: 0, used: 0 },
            { free: 0, total: 0, used: 0 }
          ],
          id: 'system',
          sectionName: 'system',
          statusPath: { to: '/status/system', readonly: false },
          title: 'System',
          type: 'system'
        }
      ]
    ],
    [
      true,
      {},
      [
        {
          content: [
            { info: '-', title: 'Device uptime', name: 'device-uptime' },
            { info: '-', title: 'Local device time', name: 'local-device-time' },
            {
              info: [
                { name: 'RAM', percents: 0, title: 'ram' },
                { name: 'FLASH', percents: 0, title: 'flash' }
              ],
              title: 'Memory usage',
              name: 'memory-usage'
            },
            { info: '-', title: 'Firmware version', name: 'firmware-version' }
          ],
          headerItem: [{ info: 40, title: 'CPU load' }],
          hints: [
            { free: 0, total: 0, used: 0 },
            { free: 0, total: 0, used: 0 }
          ],
          id: 'system',
          sectionName: 'system',
          statusPath: { to: '/status/system', readonly: false },
          title: 'System',
          type: 'system'
        }
      ]
    ]
  ])('returns parsed System data', (firstLoad, data, res) => {
    wrapper.vm.firstLoad = firstLoad
    expect(wrapper.vm.parseSystemData(data)).toEqual(res)
  })
  it.each([
    [
      'data not empty and status 0',
      { test: { status: '0' } },
      [
        {
          content: [
            { info: 'Disconnected', title: 'Status', name: 'status' },
            { info: '-', title: 'Type', name: 'type' },
            { info: '-', title: 'IP address', name: 'ip-address' },
            { info: '-', title: 'Time', name: 'time' }
          ],
          id: 'open_vpn',
          sectionName: 'test',
          servicesPath: { to: '/services/vpn/openvpn?edit=test', readonly: false },
          title: 'test VPN',
          type: 'basic'
        }
      ]
    ],
    [
      'data not empty and status 1',
      { test: { status: '1' } },
      [
        {
          content: [
            { info: 'Connected', title: 'Status', name: 'status' },
            { info: '-', title: 'Type', name: 'type' },
            { info: '-', title: 'IP address', name: 'ip-address' },
            { info: '-', title: 'Time', name: 'time' }
          ],
          id: 'open_vpn',
          sectionName: 'test',
          servicesPath: { to: '/services/vpn/openvpn?edit=test', readonly: false },
          title: 'test VPN',
          type: 'basic'
        }
      ]
    ],
    [
      'data not empty and status 2',
      { test: { status: '2' } },
      [
        {
          content: [
            { info: 'Active', title: 'Status', name: 'status' },
            { info: '-', title: 'Type', name: 'type' },
            { info: '-', title: 'IP address', name: 'ip-address' },
            { info: '-', title: 'Time', name: 'time' }
          ],
          id: 'open_vpn',
          sectionName: 'test',
          servicesPath: { to: '/services/vpn/openvpn?edit=test', readonly: false },
          title: 'test VPN',
          type: 'basic'
        }
      ]
    ],
    [
      'data not empty and status 3',
      { test: { status: '3' } },
      [
        {
          content: [
            { info: 'Inactive', title: 'Status', name: 'status' },
            { info: '-', title: 'Type', name: 'type' },
            { info: '-', title: 'IP address', name: 'ip-address' },
            { info: '-', title: 'Time', name: 'time' }
          ],
          id: 'open_vpn',
          sectionName: 'test',
          servicesPath: { to: '/services/vpn/openvpn?edit=test', readonly: false },
          title: 'test VPN',
          type: 'basic'
        }
      ]
    ],
    [
      'data not empty and status 4',
      { test: { status: '4' } },
      [
        {
          content: [
            { info: 'Disabled', title: 'Status', name: 'status' },
            { info: '-', title: 'Type', name: 'type' },
            { info: '-', title: 'IP address', name: 'ip-address' },
            { info: '-', title: 'Time', name: 'time' }
          ],
          id: 'open_vpn',
          sectionName: 'test',
          servicesPath: { to: '/services/vpn/openvpn?edit=test', readonly: false },
          title: 'test VPN',
          type: 'basic'
        }
      ]
    ],
    [
      'data not empty and status 10',
      { test: { sectionName: 'test', status: '10' } },
      [
        {
          content: [
            { info: '-', title: 'Status', name: 'status' },
            { info: '-', title: 'Type', name: 'type' },
            { info: '-', title: 'IP address', name: 'ip-address' },
            { info: '-', title: 'Time', name: 'time' }
          ],
          id: 'open_vpn',
          sectionName: 'test',
          servicesPath: { to: '/services/vpn/openvpn?edit=test', readonly: false },
          title: 'test VPN',
          type: 'basic'
        }
      ]
    ]
  ])('returns parsed OpenVPN data when %s', (text, data, res) => {
    expect(wrapper.vm.parseOpenvpnData(data)).toEqual(res)
  })
  it('returns parsed RMS data', () => {
    const data = [{}]
    const res = [
      {
        content: [
          { status: '-', title: 'Management Status', name: 'management-status' },
          { connectionStateColor: '', connectionStateText: '-', error: null, show: true, title: 'Connection state', name: 'connection-state' }
        ],
        id: 'monitoring',
        sectionName: 'monitoring',
        servicesPath: { to: '/services/cloud_solutions/rms', readonly: false },
        title: 'Remote Management System',
        type: 'rms'
      }
    ]
    expect(wrapper.vm.parseRmsData(data)).toEqual(res)
  })
  it.each([
    [
      [{ sectionName: 'test', name: 'test' }],
      [{ id: 'test', virtual_ip: ['1.1.1.1'] }],
      [
        {
          content: [
            { info: 'Disabled', title: 'Status', name: 'status' },
            { info: '-', title: 'State', name: 'state' },
            { info: '-', title: 'Main IP', name: 'main-ip' },
            { info: '1.1.1.1', title: 'Virtual IP', name: 'virtual-ip' }
          ],
          id: 'vrrp',
          sectionName: 'test',
          servicesPath: { to: '/network/failover/vrrp', readonly: false },
          title: 'test VRRP',
          type: 'basic'
        }
      ]
    ],
    [
      [{ name: 'test' }],
      [{ id: 'test', virtual_ip: ['1.1.1.1'] }],
      [
        {
          content: [
            { info: 'Disabled', title: 'Status', name: 'status' },
            { info: '-', title: 'State', name: 'state' },
            { info: '-', title: 'Main IP', name: 'main-ip' },
            { info: '1.1.1.1', title: 'Virtual IP', name: 'virtual-ip' }
          ],
          id: 'vrrp',
          sectionName: 'test',
          servicesPath: { to: '/network/failover/vrrp', readonly: false },
          title: 'test VRRP',
          type: 'basic'
        }
      ]
    ]
  ])('returns parsed VRRP data', (data, vrrpConfig, res) => {
    expect(wrapper.vm.parseVrrpData(data, vrrpConfig)).toEqual(res)
  })

  const overviewData = [
    {
      enabled: '1',
      card_id: 'system',
      position: '1',
      id: 'cfg010a5c'
    },
    {
      enabled: '1',
      card_id: 'wireless',
      position: '3',
      id: 'cfg020a5c',
      section_name: 'radio0.network1'
    },
    {
      enabled: '1',
      card_id: 'interface',
      position: '5',
      id: 'cfg040a5c',
      section_name: 'lan'
    },
    {
      enabled: '1',
      card_id: 'interface',
      position: '8',
      id: 'cfg070a5c',
      section_name: 'mob1s1a1'
    },
    {
      enabled: '1',
      card_id: 'interface',
      position: '9',
      id: 'cfg080a5c',
      section_name: 'mob1s2a1'
    },
    {
      enabled: '0',
      card_id: 'mobile_data_limit',
      position: '10',
      id: 'cfg090a5c',
      section_name: 'mob1s1a1'
    },
    {
      enabled: '0',
      card_id: 'mobile_data_limit',
      position: '11',
      id: 'cfg0a0a5c',
      section_name: 'mob1s2a1'
    },
    {
      enabled: '1',
      card_id: 'system_events',
      position: '15',
      id: 'cfg0b0a5c'
    },
    {
      enabled: '1',
      card_id: 'network_events',
      position: '16',
      id: 'cfg0c0a5c'
    },
    {
      enabled: '1',
      card_id: 'monitoring',
      position: '17',
      id: 'cfg0d0a5c'
    },
    {
      enabled: '0',
      card_id: 'hotspot',
      position: '18',
      id: 'cfg0e0a5c'
    },
    {
      enabled: '0',
      card_id: 'sms_limit_sim1',
      position: '20',
      id: 'cfg0f0a5c',
      section_name: 'cfg01aa0e'
    },
    {
      enabled: '1',
      card_id: 'mobile',
      position: '21',
      id: 'cfg100a5c',
      section_name: '3-1'
    },
    {
      enabled: '0',
      card_id: 'sms_limit_sim2',
      position: '22',
      id: 'cfg110a5c',
      section_name: 'cfg02aa0e'
    },
    {
      enabled: '1',
      card_id: 'vrrp',
      position: '25',
      id: 'cfg140a5c',
      section_name: 'vrrp1'
    },
    {
      enabled: '1',
      card_id: 'open_vpn',
      position: '26',
      id: 'cfg150a5c',
      section_name: 'openvpn'
    },
    {
      enabled: '1',
      card_id: 'hotspot',
      position: '27',
      id: 'cfg160a5c',
      section_name: 'hotspot'
    },
    {
      enabled: '0',
      card_id: 'access_control',
      position: '28',
      id: 'cfg170a5c',
      section_name: 'access_control'
    }
  ]

  it('returns created empty cards', () => {
    const res = {
      widgets_system: {},
      widgets_modems: {},
      widgets_wireless: {},
      widgets_hotspot: {},
      widgets_interfaces: {},
      widgets_data_limit: {},
      widgets_sms_limit: {},
      widgets_vrrp: {},
      widgets_openvpn: {},
      widgets_rms: {},
      widgets_system_events: {},
      widgets_network_events: {},
      widgets_access_control: {},
      widgets_failover: {},
      widgets_internet: {}
    }
    wrapper.vm.parseSystemData = vi.fn().mockReturnValueOnce({})
    wrapper.vm.parseModemsData = vi.fn().mockReturnValueOnce({})
    wrapper.vm.parseWirelessData = vi.fn().mockReturnValueOnce({})
    wrapper.vm.parseHotspotData = vi.fn().mockReturnValueOnce({})
    wrapper.vm.parseInterfacesData = vi.fn().mockReturnValueOnce({})
    wrapper.vm.parseDataLimitData = vi.fn().mockReturnValueOnce({})
    wrapper.vm.parseSmsLimitData = vi.fn().mockReturnValueOnce({})
    wrapper.vm.parseVrrpData = vi.fn().mockReturnValueOnce({})
    wrapper.vm.parseOpenvpnData = vi.fn().mockReturnValueOnce({})
    wrapper.vm.parseRmsData = vi.fn().mockReturnValueOnce({})
    wrapper.vm.parseSystemEventData = vi.fn().mockReturnValueOnce({})
    wrapper.vm.parseNetworkEventData = vi.fn().mockReturnValueOnce({})
    wrapper.vm.parseAccessControlData = vi.fn().mockReturnValueOnce({})
    wrapper.vm.parseFailover = vi.fn().mockReturnValueOnce({})
    wrapper.vm.parseInternet = vi.fn().mockReturnValueOnce({})
    wrapper.vm.createEmptyCards(overviewData)
    expect(wrapper.vm.widgets).toEqual(res)
  })
  it('restarts updateCards timer', () => {
    wrapper.vm.$timer.restart = vi.fn()
    const cards = [{ sectionName: 'system' }, { sectionName: 'lan', id: 'interface' }]
    wrapper.vm.handleUpdateCards(cards)
    expect(wrapper.vm.updatedCards).toEqual(cards)
    expect(wrapper.vm.$timer.restart).toHaveBeenCalledWith('updateOverview')
  })
  it('returns updated cards', () => {
    wrapper.vm.overview = overviewData
    wrapper.vm.cards = [{ sectionName: 'system' }, { sectionName: 'lan', id: 'interface' }]
    const widgets = {
      widgets_system: [{ sectionName: 'system' }],
      widgets_hotspot: [{ sectionName: 'lan', id: 'interface' }]
    }
    wrapper.vm.widgets = widgets
    wrapper.vm.updateCards()
    expect(wrapper.vm.cards).toEqual([
      { sectionName: 'system', content: { sectionName: 'system' } },
      { id: 'interface', sectionName: 'lan', content: { id: 'interface', sectionName: 'lan' } }
    ])
  })
  it('returns error message when request fails', async () => {
    const wrapper = createWrapper(Overview, {
      global: {
        stubs: {
          tltDnd: {
            template: `<div><slot :index="1" :item="{}" :start-drag="() => {}" /></div>`
          }
        }
      },
      computed: {
        ...Overview.computed,
        enabledCardWireless() {
          return true
        }
      }
    })
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getWirelessStatus()
    expect(spy).toHaveBeenCalledWith('Failed to get wireless status')
  })
  it('updates wireless widget data when request is successful', async () => {
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce([])
    await wrapper.vm.getWirelessStatus()
    expect(wrapper.vm.wirelessStarted).toEqual(false)
  })
  it('returns error message when tries to update overview cards position', async () => {
    await wrapper.setData({ updatedCards: [{ card_id: 'system' }] })
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce({ data: [{ section_name: 'system' }] })
    wrapper.vm.$axios.put = vi.fn()
    wrapper.vm.$axios.put.mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.updateOverview()
    expect(spy).toHaveBeenCalledWith('Failed to update Overview cards')
  })
  it('when statusStarted true getStatusData is not executed', async () => {
    wrapper.vm.statusStarted = true
    await wrapper.vm.getStatusData()
  })
  it('returns error messages when all requests unsuccessful, getStatusData', async () => {
    const wrapper = createWrapper(Overview, {
      global: {
        stubs: {
          tltDnd: {
            template: `<div><slot :index="1" :item="{}" :start-drag="() => {}" /></div>`
          }
        }
      }
    })
    wrapper.vm.statusStarted = false
    wrapper.vm.ntpTimeZone = 'UTC'
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue([
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      {
        success: false,
        errors: [
          {
            code: 1
          }
        ]
      },
      {
        success: false,
        errors: [
          {
            code: 1
          }
        ]
      }
    ])
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getStatusData()
    expect(spy).toHaveBeenCalledWith('Failed to load system data')
    expect(spy).toHaveBeenCalledWith('Failed to load mobile data')
    expect(spy).toHaveBeenCalledWith('Failed to load interfaces status')
    expect(spy).toHaveBeenCalledWith('Failed to load failover status')
    expect(spy).toHaveBeenCalledWith('Failed to load data limit status')
    expect(spy).toHaveBeenCalledWith('Failed to load RMS data')
    expect(spy).toHaveBeenCalledWith('Failed to load Hotspot status')
    expect(spy).toHaveBeenCalledWith('Failed to load VRRP status')
    expect(spy).toHaveBeenCalledWith('Failed to load OpenVPN status')
  })
  it('shows side message error when database is being optimized', async () => {
    const wrapper = createWrapper(Overview, {
      global: {
        stubs: {
          tltDnd: {
            template: `<div><slot :index="1" :item="{}" :start-drag="() => {}" /></div>`
          }
        }
      }
    })
    wrapper.vm.statusStarted = false
    wrapper.vm.ntpTimeZone = 'UTC'
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue([
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      { success: false, data: [] },
      {
        success: false,
        errors: [
          {
            code: 1
          }
        ]
      },
      {
        success: false,
        errors: [
          {
            code: 1
          }
        ]
      }
    ])
    const spy = vi.spyOn(wrapper.vm.$notification, 'error')
    await wrapper.vm.getStatusData()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('Events Log could not be accessed because the database is being optimized. This process can take up to five minutes.')
  })
  it('returns error message when request fails, getStatusData', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.getStatusData()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('returns false when initOverview fails', async () => {
    wrapper.vm.$route = { path: '/login', fullPath: '/login' }
    wrapper.vm.$axios.get = vi.fn().mockRejectedValue()
    const spyTimer = vi.spyOn(wrapper.vm.$timer, 'start')
    const res = await wrapper.vm.initOverview()
    expect(res).toBe(false)
    expect(spyTimer).not.toHaveBeenCalled()
  })
  it.each([
    [
      'status_full is empty and overview config returns data',
      [{}],
      [
        {
          content: [
            { info: '-', title: 'Data connection', name: 'data-connection' },
            { info: '-', title: 'State', name: 'state' },
            { info: '-', title: 'SIM card info', unblock: false, unlock: false, simSwitch: false, name: 'sim-card-info' },
            { info: '0 B / 0 B', title: 'Data received / sent', name: 'data-received-sent' }
          ],
          hints: [],
          id: 'mobile',
          sectionName: '-',
          servicesPath: { hint: undefined, readonly: false, to: '/network/mobile/general/' },
          signal: '-',
          statusPath: { hint: undefined, readonly: false, to: '/status/network/mobile?tab=' },
          title: '-',
          modemId: undefined,
          simSection: undefined,
          type: 'modem'
        }
      ]
    ],
    [
      'status_full and overview config returns data',
      [
        {
          operator_state: 'searching',
          conntype: 'N/A',
          data_conn_state: 'Disconnected',
          pinstate: 'N/A',
          active_sim: '1',
          id: '3-1',
          offline: '1',
          simsection: 'cfg01aa0e'
        }
      ],
      [
        {
          content: [
            { info: 'Disconnected', title: 'Data connection', name: 'data-connection' },
            { info: 'searching; undefined; N/A', title: 'State', name: 'state' },
            { info: 'SIM1 - N/A', title: 'SIM card info', unblock: false, unlock: false, simSwitch: false, name: 'sim-card-info' },
            { info: '0 B / 0 B', title: 'Data received / sent', name: 'data-received-sent' }
          ],
          hints: [],
          id: 'mobile',
          sectionName: '3-1',
          servicesPath: {
            hint: "This page can't be viewed because modem is unreachable",
            readonly: true,
            to: '/network/mobile/general/3-1?simTab=cfg01aa0e'
          },
          signal: '-',
          statusPath: {
            hint: "This page can't be viewed because modem is unreachable",
            readonly: true,
            to: '/status/network/mobile?tab=3-1'
          },
          title: '-',
          modemId: '3-1',
          simSection: 'cfg01aa0e',
          type: 'modem'
        }
      ]
    ]
  ])('returns true when %s, initOverview', async (text, modemData, widgetRes) => {
    const wrapper = createWrapper(Overview, {
      global: {
        stubs: {
          tltDnd: {
            template: `<div><slot :index="1" :item="{}" :start-drag="() => {}" /></div>`
          }
        },
        mocks: {
          $store: {
            pinPukRequired: []
          }
        }
      }
    })
    wrapper.vm.$store.hasPackages = vi.fn().mockReturnValue(true)
    wrapper.vm.$route = { path: '/login', fullPath: '/login' }
    wrapper.vm.$axios.get = vi.fn().mockImplementation(url => {
      switch (url) {
        case '/api/modems/status':
          return Promise.resolve({ data: modemData })
        case '/api/overview/config':
          return Promise.resolve({ data: overviewData })
      }
    })
    const na = vi.fn().mockImplementation(value => {
      return value || 'N/A'
    })
    wrapper.vm.$mobile.getOperatorState = na
    wrapper.vm.$mobile.getConntype = na
    wrapper.vm.$mobile.modemOffline = vi.fn().mockReturnValue(modemData[0]?.offline === '1')
    wrapper.vm.$mobile.getBlockedText = vi.fn().mockImplementation(() => {
      return 'unreachable'
    })
    wrapper.vm.$mobile.getSimstate = vi.fn().mockImplementation(value => {
      return value?.pinstate || 'N/A'
    })
    wrapper.vm.$mobile.getDataConnState = vi.fn().mockImplementation(value => {
      return value || '-'
    })
    wrapper.vm.$mobile.getSimLabel = vi.fn().mockReturnValue('1')
    wrapper.vm.$mobile.getSimModemLabel = vi.fn().mockReturnValue('1')
    wrapper.vm.$mobile.shouldShowModemName = vi.fn().mockReturnValue(false)
    wrapper.vm.$mobile.getGnssState = vi.fn().mockReturnValue(false)
    wrapper.vm.$mobile.shouldAllowSimUnblock = vi.fn().mockReturnValue(false)
    wrapper.vm.$mobile.shouldAllowSimUnlock = vi.fn().mockReturnValue(false)
    const spyTimer = vi.spyOn(wrapper.vm.$timer, 'start')
    const res = await wrapper.vm.initOverview()
    expect(res).toBe(true)
    expect(wrapper.vm.widgets.widgets_modems).toEqual(widgetRes)
    expect(spyTimer).toHaveBeenCalled()
  })
  it('shows puk modal', () => {
    wrapper.vm.simCardUnblock({ id: '1-1', type: 2 })
    expect(wrapper.vm.modalId).toEqual('1-1')
    expect(wrapper.vm.modalType).toEqual(2)
    expect(wrapper.vm.showModal).toEqual(true)
  })
})
