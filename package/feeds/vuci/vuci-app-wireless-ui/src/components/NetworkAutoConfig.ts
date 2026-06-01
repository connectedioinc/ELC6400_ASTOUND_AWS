import type { TapInterface } from '@/types/networkTypes'
import type { BridgeConfig } from '@/types/networkDeviceTypes'
import type { WifiInterface } from '@/types/wirelessTypes'
import ApiHelper from './ApiHelper'
import { i18n } from '@ui-core/plugins/i18n'
import type { SavedObject } from '@/types/generalTypes'

type FakeFormValues = { vlan_id_local: string }
export type FakeWifiInterface = WifiInterface & FakeFormValues

// these are not standart tap interfaces as they are partial
type Interface = SavedObject<Partial<TapInterface>>

import { axios, type ApiBulkRequest } from '@ui-core/plugins/axios'
type Request = ApiBulkRequest & { method: 'POST' | 'GET' | 'DELETE' | 'PUT' }

const bridgeEndpoint = '/api/network/devices/bridge/config'
const interfaceEndpoint = '/api/interfaces/config'
const interfacePrefix = 'ifWifi'

export default {
  _throwUpdateError() {
    throw new Error(i18n.t('Failed to update %s configuration').format(i18n.t('network')))
  },
  /** Get bridge vlan from it's ports */
  _getVlanId(device: BridgeConfig): string {
    const parsedPorts = device.ports?.map(port => {
      const split = port.split('.')
      return { ethSource: split[0], vlan_id_local: split[1] }
    })
    return parsedPorts?.[0]?.vlan_id_local ?? 'lan'
  },
  /** Check if old vlan can be modified */
  _isOldImportant(section: FakeWifiInterface, oldIface: Interface | undefined, wirelessConfigs: WifiInterface[]): boolean {
    const usedByOther = wirelessConfigs.some(wifi => wifi.id !== section.id && wifi.network === oldIface?.id)
    return !!oldIface && (oldIface.id === 'lan' || usedByOther)
  },
  /** Get devices (called ports in bridge config) needed for bridge */
  _getDevices(vlan: string, defaultEth: string, wifiConfigs: WifiInterface[]): string[] {
    const vlanExtention = vlan === 'lan' ? '' : `.${vlan}`
    const eth = `${defaultEth}${vlanExtention}`
    const meshes = wifiConfigs.filter(wifi => wifi.mode === 'mesh' && wifi.network).map(wifi => `@${wifi.network}${vlanExtention}`)
    return [eth, ...meshes]
  },
  /** Sets vlan_id_local depending what access point bridge has */
  setData(section: FakeWifiInterface, interfaceConfigs: Interface[], deviceConfigs: BridgeConfig[]) {
    const network = interfaceConfigs.find(iface => iface.id === section.network)
    const bridge = deviceConfigs.find(br => br.name === network?.device)
    if (!bridge) return new TypeError('Access point does not have valid bridge')
    section.vlan_id_local = this._getVlanId(bridge)
  },
  /** Manages network before access point save */
  async manageApNetwork(section: FakeWifiInterface, interfaceConfigs: Interface[], deviceConfigs: BridgeConfig[], wirelessConfigs: WifiInterface[], defaultEth: string): Promise<void> {
    const newVlanId = section.vlan_id_local
    const newBridge = deviceConfigs.find(e => this._getVlanId(e) === newVlanId)
    const newIface = newBridge !== undefined ? interfaceConfigs.find(e => e.device === newBridge?.name) : undefined

    const oldIface = section.network !== undefined ? interfaceConfigs.find(e => e.id === section.network) : undefined
    const oldBridge = oldIface?.id !== undefined ? deviceConfigs.find(e => e.name === oldIface.device) : undefined
    const oldVlanId = oldBridge !== undefined ? this._getVlanId(oldBridge) : undefined

    const ifaceObj = {
      old: oldIface,
      new: newIface
    }
    const bridgeObj = {
      old: oldBridge,
      new: newBridge
    }
    const vlanID = {
      old: oldVlanId,
      new: newVlanId
    }

    const oldImportant = this._isOldImportant(section, ifaceObj.old, wirelessConfigs)
    const ports = this._getDevices(vlanID.new, defaultEth, wirelessConfigs)
    const bridgeRequests = ApiHelper.sharedConfigHelper<BridgeConfig>({
      endpoint: bridgeEndpoint,
      oldObj: bridgeObj.old,
      newObj: bridgeObj.new,
      oldImportant,
      data: {
        ports
      }
    })
    await ApiHelper.makeRequests(deviceConfigs, bridgeRequests).catch(this._throwUpdateError)
    const brDeviceNameNew = deviceConfigs.find(br => JSON.stringify(br.ports) === JSON.stringify(ports))
    if (!brDeviceNameNew) return this._throwUpdateError()
    const ifaceName = {
      old: ifaceObj.old?.id,
      new: ifaceObj.new?.id ?? ApiHelper.getNextId(interfaceConfigs, interfacePrefix)
    }
    // vlan interface
    const ifaceRequests = ApiHelper.sharedConfigHelper<Interface>({
      endpoint: interfaceEndpoint,
      oldObj: ifaceObj.old,
      newObj: ifaceObj.new,
      oldImportant,
      data: {
        device: brDeviceNameNew.name
      },
      createData: {
        id: ifaceName.new
      }
    })
    await ApiHelper.makeRequests(interfaceConfigs, ifaceRequests).catch(this._throwUpdateError)

    section.network = interfaceConfigs.find(iface => iface.id === ifaceName.new) ? ifaceName.new : ifaceName.old!
  },
  /** Creates network for mesh if it did not had it before */
  async manageMeshNetwork(section: FakeWifiInterface, initialSection: WifiInterface, interfaceConfigs: Interface[], deviceConfigs: BridgeConfig[], wirelessConfigs: WifiInterface[]) {
    if (section.mode !== 'mesh' || section.mode === initialSection.mode) return
    const oldIface = section.network ? interfaceConfigs.find(iface => iface.id === section.network) : undefined
    const oldImportant = this._isOldImportant(section, oldIface, wirelessConfigs)

    const requests = ApiHelper.sharedConfigHelper({
      endpoint: interfaceEndpoint,
      oldObj: oldIface,
      oldImportant,
      data: {
        device: ''
      },
      createData: {
        id: ApiHelper.getNextId(interfaceConfigs, interfacePrefix)
      }
    })
    const deleteBridge = requests[0]?.method === 'PUT'
    if (deleteBridge) requests.push({ method: 'DELETE', endpoint: `${bridgeEndpoint}/${oldIface?.device}` })

    const responses = await ApiHelper.makeRequestsNoUpdate(requests).catch(this._throwUpdateError)
    if (requests.length > 0) ApiHelper.updateLocalArray(interfaceConfigs, [requests[0]], [responses[0]])
    if (deleteBridge) ApiHelper.updateLocalArray(deviceConfigs, [requests[1]], [responses[1]])
    if (responses[0]) section.network = responses[0].data.id
  },
  /** Updates devices with new mesh networks */
  async updateDevices(deviceConfigs: BridgeConfig[], wirelessConfigs: WifiInterface[], defaultEth: string): Promise<void> {
    const requests: Request[] = []
    deviceConfigs.forEach(device => {
      const vlan = this._getVlanId(device)
      const newDevices = this._getDevices(vlan, defaultEth, wirelessConfigs)

      if (JSON.stringify(device.ports) !== JSON.stringify(newDevices)) {
        requests.push({
          method: 'PUT',
          endpoint: `${bridgeEndpoint}/${device.id}`,
          data: {
            ports: newDevices
          }
        })
      }
    })
    await ApiHelper.makeRequests(deviceConfigs, requests).catch(this._throwUpdateError)
  },
  async deleteNetwork(section: FakeWifiInterface, deviceConfigs: BridgeConfig[], wirelessConfigs: WifiInterface[], interfaceConfigs: TapInterface[]): Promise<void> {
    const requests: Request[] = []
    const usedByOthers = wirelessConfigs.find(e => e.id !== section.id && e.network === section.network)
    if (usedByOthers || section.network === 'lan') return

    const network = interfaceConfigs.find(e => e.id === section.network)
    if (!network) return
    requests.push({ method: 'DELETE', endpoint: `${interfaceEndpoint}/${network.id}` })

    const device = deviceConfigs.find(e => e.name === network.device)
    if (device) requests.push({ method: 'DELETE', endpoint: `${bridgeEndpoint}/${device.id}` })

    if (requests.length === 0) return
    const responses = await axios.bulk(requests)
    if (responses.every(e => e.success || e.errors.every(error => error.code === 113))) {
      if (network) interfaceConfigs.splice(interfaceConfigs.indexOf(network))
      if (device) deviceConfigs.splice(deviceConfigs.indexOf(device))
    } else {
      this._throwUpdateError()
    }
  }
}
