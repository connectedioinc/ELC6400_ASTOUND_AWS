import NetworkAutoConfig from '../../src/components/NetworkAutoConfig.ts'
import ApiHelper from '../../src/components/ApiHelper.ts'
import { axios } from '@ui-core/plugins/axios'
import '@ui-core/utils/string-format'

vi.mock('@ui-core/plugins/axios')

const createIdGenerator = () => {
  let counter = 100
  const prime = 7919 // large prime number
  const mod = 10000 // desired range
  return () => {
    counter = (counter * prime) % mod
    return counter + 100
  }
}

function mockBulk(additionalData) {
  additionalData = additionalData ?? {}
  const randomId = createIdGenerator()
  axios.bulk.mockImplementationOnce(requests => {
    return requests.map(({ data, method, endpoint }) => {
      if (method === 'DELETE') return { success: true, data: [endpoint.split('/').at(-1)] }
      const id = (data.id ?? method === 'PUT') ? endpoint.split('/').at(-1) : randomId()
      return { data: { id, ...additionalData, ...data }, success: true }
    })
  })
}

describe('NetworkAutoConfig.js', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    axios.bulk.mockRestore()
  })
  it('updates bridges', async () => {
    mockBulk()
    const spy = vi.spyOn(ApiHelper, 'makeRequests')
    const oldBridges = [
      { id: 'lan', ports: ['eth1'] },
      { id: 'dev1', ports: ['eth1.11', '@mesh1.11'] },
      { id: 'dev2', ports: ['eth1.12', '@mesh1.12', '@mesh2.12'] }
    ]
    const responses = [expect.objectContaining({ data: { ports: ['eth1', '@mesh1', '@mesh2'] } }), expect.objectContaining({ data: { ports: ['eth1.11', '@mesh1.11', '@mesh2.11'] } })]
    const wireless = [
      { id: '1', mode: 'mesh', network: 'mesh1' },
      { id: '1', mode: 'mesh', network: 'mesh2' }
    ]
    await NetworkAutoConfig.updateDevices(oldBridges, wireless, 'eth1')
    expect(spy).toBeCalledWith(oldBridges, responses)
  })
  it('creates mesh network', async () => {
    const spy = vi.spyOn(ApiHelper, 'makeRequestsNoUpdate')
    const interfaces = []
    const bridges = []
    const wirelessConfigs = []
    const expectedMeshId = 'ifWifi0'
    const expectedInterface = { id: expectedMeshId, device: '' }
    const section = { id: '123', mode: 'mesh', network: '' }
    const initialSection = { id: '123', mode: 'ap', network: '' }
    mockBulk()
    await NetworkAutoConfig.manageMeshNetwork(section, initialSection, interfaces, bridges, wirelessConfigs)
    expect(section.network).toEqual(expectedMeshId)
    expect(spy).toBeCalledWith([expect.objectContaining({ data: expectedInterface, method: 'POST' })])
    expect(interfaces).toEqual([expectedInterface])
  })
  it('reuses vlan network', async () => {
    const spy = vi.spyOn(ApiHelper, 'makeRequestsNoUpdate')
    const bridges = [{ id: '0', name: 'dev0' }]
    const wirelessConfigs = []
    const meshId = 'ifWifi0'
    const interfaces = [{ id: meshId, device: 'dev0' }]
    const expectedInterface = { id: meshId, device: '' }
    const section = { id: '123', mode: 'mesh', network: meshId }
    const initialSection = { id: '123', mode: 'ap', network: meshId }
    mockBulk()
    await NetworkAutoConfig.manageMeshNetwork(section, initialSection, interfaces, bridges, wirelessConfigs)
    expect(section.network).toEqual(meshId)
    expect(spy).toBeCalledWith([expect.objectContaining({ data: { device: '' }, method: 'PUT' }), expect.objectContaining({ method: 'DELETE' })])
    expect(interfaces).toEqual([expectedInterface])
    expect(bridges).toEqual([])
  })
  it('sets vlan_field', () => {
    const section = { id: '1', network: '123', vlan_id_local: '' }
    const ifaces = [{ id: '123', device: 'br-123' }]
    const devices = [{ id: '5', name: 'br-123', ports: ['eth0.10'] }]
    NetworkAutoConfig.setData(section, ifaces, devices)
    expect(section.vlan_id_local).toEqual('10')
  })
  it('manages bridges, when old one was lan', async () => {
    const deviceName = 'br-dev1'
    // for bridges
    mockBulk({ name: deviceName })
    // for interfaces
    mockBulk()
    const section = { id: '1', vlan_id_local: '100', network: 'lan' }
    const ifaces = [{ id: 'lan', device: 'br-lan' }]
    const bridges = [{ id: 'br_lan', name: 'br-lan', ports: ['eth2'] }]
    const wifiInterfaces = [section]
    await NetworkAutoConfig.manageApNetwork(section, ifaces, bridges, wifiInterfaces, 'eth2')
    expect(bridges[1]).toEqual(expect.objectContaining({ ports: ['eth2.100'] }))
    expect(ifaces[1]).toEqual(expect.objectContaining({ device: deviceName }))
    expect(section.network).toEqual(ifaces[1].id)
  })
  it('manages bridges, when old one is important one', async () => {
    const deviceName = 'br-dev2'
    // for bridges
    mockBulk({ name: deviceName })
    // for interfaces
    mockBulk()
    const section = { id: '1', vlan_id_local: '100', network: '11' }
    const ifaces = [{ id: '11', device: 'br-dev1' }]
    const bridges = [{ id: 'br_dev1', name: 'br-dev1', ports: ['eth2'] }]
    const wifiInterfaces = [section, { id: '3', network: '11' }]
    await NetworkAutoConfig.manageApNetwork(section, ifaces, bridges, wifiInterfaces, 'eth2')
    expect(bridges[1]).toEqual(expect.objectContaining({ ports: ['eth2.100'] }))
    expect(ifaces[1]).toEqual(expect.objectContaining({ device: deviceName }))
    expect(section.network).toEqual(ifaces[1].id)
  })
  it('manages bridges, when old one is not important', async () => {
    const deviceName = 'br-dev1'
    const section = { id: '1', vlan_id_local: '100', network: '11' }
    const ifaces = [{ id: '11', device: deviceName }]
    const bridges = [{ id: 'br_dev1', name: deviceName, ports: ['eth2'] }]
    const wifiInterfaces = [section]
    // for bridges
    mockBulk(bridges[0])
    // for interfaces
    mockBulk()
    await NetworkAutoConfig.manageApNetwork(section, ifaces, bridges, wifiInterfaces, 'eth2')
    expect(bridges[0]).toEqual(expect.objectContaining({ ports: ['eth2.100'] }))
    expect(ifaces[0]).toEqual(expect.objectContaining({ device: deviceName }))
    expect(section.network).toEqual(ifaces[0].id)
  })
  it('manages bridges, there is no oldOne', async () => {
    const deviceName = 'br-dev1'
    // for bridges
    mockBulk({ name: deviceName })
    // for interfaces
    mockBulk()
    const section = { id: '1', vlan_id_local: '100', network: '11' }
    const ifaces = []
    const bridges = []
    const wifiInterfaces = [section]
    await NetworkAutoConfig.manageApNetwork(section, ifaces, bridges, wifiInterfaces, 'eth2')
    expect(bridges[0]).toEqual(expect.objectContaining({ ports: ['eth2.100'] }))
    expect(ifaces[0]).toEqual(expect.objectContaining({ device: deviceName }))
    expect(section.network).toEqual(ifaces[0].id)
  })
  it('manages bridges, target bridge excists and old needs to be deleted', async () => {
    const section = { id: '1', vlan_id_local: '200', network: '1' }
    const ifaces = [
      { id: '1', device: 'br-dev1' },
      { id: '2', device: 'br-dev2' }
    ]
    const bridges = [
      { id: '1', name: 'br-dev1', ports: ['eth2.100'] },
      { id: '2', name: 'br-dev2', ports: ['eth2.200'] }
    ]
    const wifiInterfaces = [section]
    // for bridges
    mockBulk()
    // for interfaces
    mockBulk()
    await NetworkAutoConfig.manageApNetwork(section, ifaces, bridges, wifiInterfaces, 'eth2')
    expect(bridges).length(1)
    expect(ifaces).length(1)
    expect(bridges[0]).toEqual(expect.objectContaining({ ports: ['eth2.200'] }))
    expect(ifaces[0]).toEqual(expect.objectContaining({ device: 'br-dev2' }))
    expect(section.network).toEqual(ifaces[0].id)
  })
})
