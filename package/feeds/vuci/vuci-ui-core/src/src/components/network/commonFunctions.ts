import type { Interface, InterfaceStatus } from '@/types/networkTypes'
import { mobile } from '@/plugins/mobile'
import { i18n } from '@ui-core/plugins/i18n'

const commonFunctions = {
  validateApn: function (section: Interface, allSections: Interface[], modemText: string, simCount: number) {
    if (section.auto_apn === '0') return { isValid: true }
    const instances = allSections.filter(s => this._isValidSection(s) && s.id !== section.id && s.sim === section.sim && s.modem === section.modem && s.esim_profile === section.esim_profile)
    if (instances.length > 0) {
      return { isValid: false, message: commonFunctions._getErrorMessage(section, modemText, simCount) }
    }
    return { isValid: true }
  },
  validateDuplicateApns: function (section: Interface, allSections: Interface[], interfaceStatus: InterfaceStatus[], apnList: any[]) {
    if (section.enabled === '0') return { isValid: true }
    if (section.auto_apn === '1') return { isValid: true }

    const findApn = (iface1: Interface, iface2: Interface) => interfaceStatus.find(ifaceStatus => ifaceStatus.id === iface1.id)?.apn === iface2.apn
    const checkApnList = (iface1: Interface, iface2: Interface) => apnList.find(apn => apn.id === parseInt(iface1.force_apn as string))?.apn === iface2.apn

    const instances = allSections.filter(iface => {
      const mobileProto = commonFunctions._isSectionMobile(iface)
      const bothEnabled = iface.enabled === '1' && section.enabled === '1'
      const sameSimModem = iface.sim === section.sim && iface.modem === section.modem && iface.esim_profile === section.esim_profile
      const notHimself = iface.id !== section.id
      let sameApn = false
      if (section.apn && iface.apn) {
        sameApn = section.apn === iface.apn
      } else if (section.force_apn && iface.force_apn) {
        sameApn = section.force_apn === iface.force_apn
      } else if (section.force_apn && iface.apn) {
        sameApn = checkApnList(section, iface)
      } else if (section.apn && iface.force_apn) {
        sameApn = findApn(iface, section) || checkApnList(iface, section)
      } else if (!section.apn && !section.force_apn && !iface.apn && !iface.force_apn && iface.auto_apn === '0') {
        sameApn = true
      }
      const samePdpType = iface.pdptype === section.pdptype || iface.pdptype === 'ipv4v6' || section.pdptype === 'ipv4v6'
      return mobileProto && bothEnabled && sameSimModem && notHimself && sameApn && samePdpType
    })
    if (instances.length > 0)
      return {
        isValid: false,
        message: i18n.t('The APN is already in use by another interface with the same PDP type')
      }
    return { isValid: true }
  },

  checkForSingleInterfaceModem: function (section: Interface, allSections: Interface[], modemList: any[]) {
    const modem = modemList.find(modem => section.modem === modem.id && !modem.multi_apn)
    if (modem === undefined) {
      return { isValid: true }
    }
    const res = allSections.some(iface => {
      const mobileProto = commonFunctions._isSectionMobile(iface)
      const enabledInterface = iface.enabled === '1' && section.enabled === '1'
      const notHimself = iface.id !== section.id
      const sameSim = iface.sim === section.sim && iface.esim_profile === section.esim_profile
      const sameModem = modem ? iface.modem === modem.id : true
      return mobileProto && enabledInterface && notHimself && sameModem && sameSim
    })
    if (res)
      return {
        isValid: false,
        message: i18n.t('Multiple APN is not supported on this device, only one mobile interface can be enabled')
      }
    return { isValid: true }
  },

  _getErrorMessage: function (section: Interface, modemText: string, simCount: number) {
    if (simCount === 0) return i18n.t("The auto APN feature is disabled due to multiple enabled interfaces for the same Unknown modem's SIM slot.")
    const eSimText = section.esim_profile ? ` (eSIM${section.esim_profile})` : ''
    const simText = mobile.getSimLabel(section.sim, section.esim_profile, section.modem)
    const simSlotText = simCount > 1 ? simText : eSimText
    const message = i18n.t('The auto APN feature is disabled due to multiple enabled interfaces for the same SIM%s slot.').format(simSlotText)
    const modemMessage = i18n.t("The auto APN feature is disabled due to multiple enabled interfaces for the same %s's SIM%s slot.").format(modemText, simSlotText)
    return modemText === '' ? message : modemMessage
  },
  _isValidSection: function (section: Interface) {
    return commonFunctions._isSectionMobile(section) && section.enabled === '1'
  },

  _isSectionMobile: function (section: Interface) {
    return section.proto === 'connm' || section.proto === 'wwan'
  },

  modemInUse: function (s: Interface, modemList: any[]) {
    return s?.modem && (modemList?.some(modem => modem.id === s.modem && modem.offline === '1') || modemList?.every(modem => modem.id !== s.modem))
  }
}

export default commonFunctions
