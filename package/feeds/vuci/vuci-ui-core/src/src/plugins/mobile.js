import { useMainStore } from '@/stores/main'
import { i18n } from '@ui-core/plugins/i18n'

export const mobile = {
  getOperatorState(value) {
    const translations = {
      'Not registered': i18n.t('Not registered'),
      'Registered, home': i18n.t('Registered, home'),
      Searching: i18n.t('Searching'),
      Denied: i18n.t('Denied'),
      Roaming: i18n.t('Roaming'),
      'SMS only, home network': i18n.t('SMS only, home network'),
      'SMS only, roaming': i18n.t('SMS only, roaming'),
      'Emergency services only': i18n.t('Emergency services only'),
      'Limited service': i18n.t('Limited service'),
      Unknown: i18n.t('Unknown')
    }
    return translations[value] || i18n.t('N/A')
  },
  getConntype(value) {
    const translations = {
      'No service': i18n.t('No service'),
      Auto: i18n.t('Auto'),
      Unknown: i18n.t('Unknown')
    }
    return translations[value] || value || i18n.t('N/A')
  },
  getDataConnState(value) {
    const translations = {
      Connected: i18n.t('Connected'),
      Disconnected: i18n.t('Disconnected'),
      Unknown: i18n.t('Unknown')
    }
    return translations[value] || '-'
  },
  getCA(modem) {
    const translations = {
      Active: i18n.t('Active'),
      Inactive: i18n.t('Inactive')
    }
    return translations[modem.sc_band_av] || i18n.t('N/A')
  },
  getSimstate(modem, includePinstate) {
    const translations = {
      Inserted: i18n.t('Inserted'),
      'Not inserted': i18n.t('Not inserted')
    }
    let simstate = translations[modem.simstate]
    if (modem.esim_profile && modem.simstate === 'Inserted') simstate = i18n.t('Active')

    if (!simstate) return i18n.t('N/A')
    if (!includePinstate) return simstate

    return modem.pinstate?.toLowerCase().includes('inserted') ? simstate : `${simstate} (${mobile.getPinstate(modem)})`
  },
  getSimstateLabel(modem) {
    return modem.esim_profile ? i18n.t('eSIM state') : i18n.t('SIM card state')
  },
  getPinstate(modem) {
    const translations = {
      Inserted: i18n.t('Inserted'),
      'Not inserted': i18n.t('Not inserted'),
      'SIM not inserted': i18n.t('SIM not inserted'),
      'Not ready': i18n.t('Not ready'),
      OK: i18n.t('Ready'),
      'Required PIN': i18n.t('Required PIN'),
      'Required PUK': i18n.t('Required PUK'),
      PUK: i18n.t('Required PUK'),
      'Required network personalization password': i18n.t('Required network personalization password'),
      'Required network personalization unlocking password': i18n.t('Required network personalization unlocking password'),
      'Required network subset personalization password': i18n.t('Required network subset personalization password'),
      'Required network subset personalization unlocking password': i18n.t('Required network subset personalization unlocking password'),
      'SIM failure': i18n.t('SIM failure'),
      'SIM busy': i18n.t('SIM busy'),
      Unknown: i18n.t('Unknown')
    }
    const left = modem.pinstate?.includes('PIN') ? modem.pinleft : modem.pukleft
    if (left !== undefined) {
      if (modem.pinstate?.includes('PIN')) return left === 1 ? i18n.t('Required PIN. 1 attempt left.') : i18n.t('Required PIN. %s attempts left.').format(left)
      else if (modem.pinstate?.includes('PUK')) return left === 1 ? i18n.t('Required PUK. 1 attempt left.') : i18n.t('Required PUK. %s attempts left.').format(left)
    }
    if (modem.esim_profile && modem.pinstate === 'Inserted') return i18n.t('Active')
    return translations[modem.pinstate] || i18n.t('N/A')
  },
  getMobileStage(modem) {
    const translations = {
      0: i18n.t('Unknown'),
      1: i18n.t('Waiting for SIM'),
      2: i18n.t('SIM failure'),
      3: i18n.t('Idling'),
      4: i18n.t('Waiting for user action'),
      5: i18n.t('Waiting for PIN'),
      6: i18n.t('Waiting for PUK'),
      7: i18n.t('SIM permanently blocked'),
      8: i18n.t('Initializing connection'),
      9: i18n.t('Configuring VoLTE'),
      10: i18n.t('Setting up connection'),
      11: i18n.t('Scanning for operators'),
      12: i18n.t('Handling SIM PIN'),
      13: i18n.t('Handling SIM switch'),
      14: i18n.t('Initializing modem'),
      15: i18n.t('Changed default SIM'),
      16: i18n.t('Setting up connection'),
      17: i18n.t('Clearing PDP context'),
      18: i18n.t('Handling config'),
      19: i18n.t('Setup complete'),
      20: i18n.t('Waiting for SIM switch'),
      21: i18n.t('Trying saved PIN'),
      22: i18n.t('Trying saved PUK'),
      23: i18n.t('Flight mode enabled')
    }
    return translations[modem.mobile_stage] || i18n.t('N/A')
  },
  getModemBusyState(modem) {
    const translations = {
      1: i18n.t('Idle'),
      2: i18n.t('Sending SMS'),
      3: i18n.t('Connecting to operator'),
      4: i18n.t('Scanning operators'),
      5: i18n.t('Executing command'),
      6: i18n.t('FOTA state')
    }
    return translations[modem.busy_state_id] || i18n.t('N/A')
  },
  getBlockedText(modem, generic) {
    const translations = {
      2: i18n.t('shut down unexpectedly'),
      3: i18n.t('rebooted by modem manager'),
      4: i18n.t('rebooted by user'),
      5: i18n.t('shut down by user')
    }
    const state = translations[modem.modem_state_id]
    if (modem?.disabled === '1') return i18n.t('disabled')
    if (modem?.blocked === '1') return i18n.t('in serial control')
    return state && !generic ? '%s (%s)'.format(i18n.t('unreachable'), state) : i18n.t('unreachable')
  },
  getFrequencyName(modem) {
    if (!mobile.limitedService(modem)) {
      if (mobile.connectedTo5gSa(modem)) return 'NR-ARFCN'
      if (mobile.connectedTo5gNsa(modem)) return 'EARFCN/NR-ARFCN'
      if (mobile.connectedTo4g(modem)) return 'EARFCN'
      if (mobile.connectedTo3g(modem)) return 'UARFCN'
      return 'ARFCN'
    }
    const cellInfo = modem.cell_info?.[0]
    if (cellInfo?.arfcn !== 'N/A') {
      return 'ARFCN'
    }
    if (cellInfo?.uarfcn !== 'N/A') {
      return 'UARFCN'
    }
    if (cellInfo?.['nr-arfcn'] !== 'N/A') {
      return 'NR-ARFCN'
    }
    return 'EARFCN'
  },
  getFlightMode(modem) {
    return modem.mobile_stage === 23 ? i18n.t('On') : i18n.t('Off')
  },
  /**
   * @description Adjusts SIM number on devices with dual modems (RUTX12, RUTM52)
   */
  adjustSimNumber(sim, modemId) {
    const modem = mobile.getModemById(modemId)
    if (modem.builtin && mobile.store.board?.hwinfo?.dual_modem) {
      if (modem.simcount > 1) {
        if (modem.primary) {
          return sim === 2 ? 3 : sim
        } else {
          if (sim === 1) return 2
          if (sim === 2) return 4
          return sim
        }
      }
      return modem.primary ? 1 : 2
    } else {
      return sim
    }
  },
  getSimLabel(sim, esim, modemId, withoutParentheses) {
    if (modemId && sim) sim = mobile.adjustSimNumber(Number(sim), modemId)
    if (esim) {
      if (withoutParentheses) return `${sim}, eSIM${esim}`
      return `${sim} (eSIM${esim})`
    }
    return sim
  },
  getSimModemLabel(modem, sim, esim) {
    if (!sim && !esim) {
      sim = modem.active_sim
      esim = modem.esim_profile
    }
    const simText = mobile.getSimLabel(sim, esim, modem.id)
    return mobile.shouldShowModemName(modem) ? '%s (%s)'.format(simText, modem.name) : simText
  },
  getBandName(band, modem) {
    if (typeof band === 'object') band = band.band
    if (band && mobile.connectedTo3g(modem)) {
      const frequency = band.split(' ')[1]
      return `B${mobile.umtsFrequencyToBand(frequency)} - ${band}`
    }
    if (band && mobile.connectedTo5g(modem)) {
      return band.replace('N', 'n')
    }
    return band || i18n.t('N/A')
  },
  getPinPukMessage(modem, simText) {
    if (mobile.shouldAllowSimUnlock(modem)) {
      return { unlockText: i18n.t('Unlock SIM'), message: i18n.t('SIM%s is locked, please provide PIN code to unlock, %s attempts left.').format(simText, modem.pinleft) }
    }
    if (mobile.requiresPuk(modem)) {
      if (modem.pukleft === 0) {
        return { message: i18n.t('SIM%s is permanently blocked, 0 attempts left for PUK code.').format(simText) }
      }
      if (mobile.shouldAllowSimUnblock(modem)) {
        return { unlockText: i18n.t('Unblock SIM'), message: i18n.t('SIM%s is blocked, please provide PUK code to unblock, %s attempts left.').format(simText, modem.pukleft) }
      }
      return { message: i18n.t('SIM%s is blocked, please insert another or unblock current SIM card using other device.').format(simText) }
    }
    return {}
  },
  getFailedEsimMessage(errorId) {
    const translations = {
      1: i18n.t('fatal error'),
      2: i18n.t('not supported'),
      3: i18n.t('not implemented'),
      4: i18n.t('bad argument'),
      5: i18n.t('JSON parse error'),
      6: i18n.t('session cancelled'),
      7: i18n.t('not enough buffer'),
      8: i18n.t('no data'),
      9: i18n.t('no memory'),
      10: i18n.t('eSIM busy'),
      11: i18n.t('no connection to the server'),
      12: i18n.t('not enough free memory in the eUICC to store the profile'),
      13: i18n.t('profile installation failed due to authentication error'),
      14: i18n.t('modem error'),
      15: i18n.t('SIM card error')
    }
    const defaultMsg = i18n.t('Failed to download profile')
    return translations[errorId] ? '%s, %s.'.format(defaultMsg, translations[errorId]) : defaultMsg
  },
  /**
   * @description function orders and translates modem list, parse it to option array that is used in selects
   * @param {Object[]} modems - modems list
   * @returns {[id: string, name: string][]} - modems options list
   */
  modemsOptions(modems) {
    return mobile.parseModems(modems).map(modem => [modem.id, modem.name])
  },
  /**
   * @description function parse modem list, reorders it and translates
   * @param {Object[]} modems - modems list
   * @returns {Object[]} - parsed modem list
   */
  parseModems(modems) {
    return translateModemNames(modemSort(modems))
  }
}

mobile.modemNames = [() => i18n.t('Primary modem'), () => i18n.t('Secondary modem'), () => i18n.t('External modem'), () => i18n.t('Internal modem'), () => i18n.t('Unknown modem')]
mobile.shortModemNames = [() => i18n.t('Primary'), () => i18n.t('Secondary'), () => i18n.t('External'), () => i18n.t('Internal'), () => i18n.t('Unknown')]
const modemNames = {
  'Primary modem': () => i18n.t('Primary modem'),
  'Secondary modem': () => i18n.t('Secondary modem'),
  'External modem': () => i18n.t('External modem'),
  'Internal modem': () => i18n.t('Internal modem'),
  'Unknown modem': () => i18n.t('Unknown modem')
}
const shortModemNames = {
  'Primary modem': () => i18n.t('Primary'),
  'Secondary modem': () => i18n.t('Secondary'),
  'External modem': () => i18n.t('External'),
  'Internal modem': () => i18n.t('Internal'),
  'Unknown modem': () => i18n.t('Unknown')
}

mobile.emmErrors = function (code) {
  switch (code) {
    case '2':
      return 'IMSI unknown in HSS'
    case '3':
      return 'Illegal UE'
    case '5':
      return 'IMEI not accepted'
    case '6':
      return 'Illegal ME'
    case '7':
      return 'EPS services not allowed'
    case '8':
      return 'EPS services and non-EPS services not allowed'
    case '9':
      return 'UE identity cannot be derived by the network'
    case '10':
      return 'Implicitly detached'
    case '11':
      return 'PLMN not allowed'
    case '12':
      return 'Tracking area not allowed'
    case '13':
      return 'Roaming not allowed in this tracking area'
    case '14':
      return 'EPS services not allowed in this PLMN'
    case '15':
      return 'No suitable cells in tracking area'
    case '16':
      return 'MSC temporarily not reachable'
    case '17':
      return 'Network failure'
    case '18':
      return 'CS domain not available'
    case '19':
      return 'ESM failure'
    case '20':
      return 'MAC failure'
    case '21':
      return 'Synch failure'
    case '22':
      return 'Congestion'
    case '23':
      return 'UE security capabilities mismatch'
    case '24':
      return 'Security mode rejected, unspecified'
    case '25':
      return 'Not authorized for this CSG'
    case '26':
      return 'Non-EPS authentication unacceptable'
    case '31':
      return 'Redirection to 5GCN required'
    case '35':
      return 'Requested service option not authorized in this PLMN'
    case '39':
      return 'CS service temporarily not available'
    case '40':
      return 'No EPS bearer context activated'
    case '42':
      return 'Severe network failure'
    case '78':
      return 'PLMN not allowed to operate at the present UE location'
    default:
      return 'Unknown'
  }
}

mobile.esmErrors = function (code) {
  switch (code) {
    case '8':
      return 'Operator determined barring'
    case '26':
      return 'Insufficient resources'
    case '27':
      return 'Missing or unknown APN'
    case '28':
      return 'Unknown PDN type'
    case '29':
      return 'User authentication or authorization failed'
    case '30':
      return 'Request rejected by Serving GW or PDN GW'
    case '31':
      return 'Request rejected, unspecified'
    case '32':
      return 'Service option not supported'
    case '33':
      return 'Requested service option not subscribed'
    case '34':
      return 'Service option temporarily out of order'
    case '35':
      return 'PTI already in use'
    case '36':
      return 'Regular deactivation'
    case '37':
      return 'EPS QoS not accepted'
    case '38':
      return 'Network failure'
    case '39':
      return 'Reactivation requested'
    case '41':
      return 'Semantic error in the TFT operation'
    case '42':
      return 'Syntactical error in the TFT operation'
    case '43':
      return 'Invalid EPS bearer identity'
    case '44':
      return 'Semantic errors in packet filter(s)'
    case '45':
      return 'Syntactical error in packet filter(s)'
    case '47':
      return 'PTI mismatch'
    case '49':
      return 'Last PDN disconnection not allowed'
    case '50':
      return 'PDN type IPv4 only allowed'
    case '51':
      return 'PDN type IPv6 only allowed'
    case '52':
      return 'Single address bearers only allowed'
    case '53':
      return 'ESM information not received'
    case '54':
      return 'PDN connection does not exist'
    case '55':
      return 'Multiple PDN connections for a given APN not allowed'
    case '56':
      return 'Collision with network initiated request'
    case '57':
      return 'PDN type IPv4v6 only allowed'
    case '58':
      return 'PDN type non IP only allowed'
    case '59':
      return 'Unsupported QCI value'
    case '60':
      return 'Bearer handling not supported'
    case '61':
      return 'PDN type Ethernet only allowed'
    case '65':
      return 'Maximum number of EPS bearers reached'
    case '66':
      return 'Requested APN not supported in current RAT and PLMN combination'
    case '81':
      return 'Invalid PTI value'
    case '95':
      return 'Semantically incorrect message'
    case '96':
      return 'Invalid mandatory information'
    case '97':
      return 'Message type non-existent or not implemented'
    case '98':
      return 'Message type not compatible with protocol state'
    case '99':
      return 'Information element non-existent or not implemented'
    case '100':
      return 'Conditional IE error'
    case '101':
      return 'Message not compatible with protocol state'
    case '111':
      return 'Protocol error, unspecified'
    case '112':
      return 'APN restriction value incompatible with active EPS bearer context'
    case '113':
      return 'Multiple accesses to a PDN connection not allowed'
    default:
      return 'Unknown'
  }
}

mobile.fivegmmErrors = function (code) {
  switch (code) {
    case '0':
      return 'No cause'
    case '3':
      return 'Illegal UE'
    case '5':
      return 'PEI not accepted'
    case '6':
      return 'Illegal ME'
    case '7':
      return '5GS services not allowed'
    case '9':
      return 'UE identity cannot be derived by the network'
    case '10':
      return 'Implicity de-registered'
    case '11':
      return 'PLMN not allowed'
    case '12':
      return 'Tracking area not allowed'
    case '13':
      return 'Roaming not allowed in this tracking area'
    case '15':
      return 'No suitable cells in tracking area'
    case '20':
      return 'MAC failure'
    case '21':
      return 'Synch failure'
    case '22':
      return 'Congestion'
    case '23':
      return 'UE security capabilities mismatch'
    case '24':
      return 'Security mode rejected, unspecified'
    case '26':
      return 'Non-5G authentication unacceptable'
    case '27':
      return 'N1 mode not allowed'
    case '28':
      return 'Restricted service area'
    case '31':
      return 'Redirection to EPC required'
    case '43':
      return 'LADN not available'
    case '62':
      return 'No network slices available'
    case '65':
      return 'Maximum number of PDU sessions reached'
    case '67':
      return 'Insufficient resources for specific slice and DNN'
    case '69':
      return 'Insufficient resources for specific slice'
    case '71':
      return 'ngKSI already in use'
    case '72':
      return 'Non-3GPP access to 5GCN not allowed'
    case '73':
      return 'Serving network not authorized'
    case '74':
      return 'Temporarily not authorized for this SNPN'
    case '75':
      return 'Permanently not authorized for this SNPN'
    case '76':
      return 'Not authorized for this CAG or authorized for CAG cells only'
    case '77':
      return 'Wireline access area not allowed'
    case '78':
      return 'PLMN not allowed to operate at the present UE location'
    case '79':
      return 'UAS services not allowed'
    case '90':
      return 'Payload was not forwarded'
    case '91':
      return 'DNN not supported or not subscribed in the slice'
    case '92':
      return 'Insufficient user-plane resources for the PDU session'
    case '95':
      return 'Semantically incorrect message'
    case '96':
      return 'Invalid mandatory information'
    case '97':
      return 'Message type non-existent or not implemented'
    case '98':
      return 'Message type not compatible with the protocol state'
    case '99':
      return 'Information element non-existent or not implemented'
    case '100':
      return 'Conditional IE error'
    case '101':
      return 'Message not compatible with the protocol state'
    case '111':
      return 'Protocol error, unspecified'
    default:
      return 'Unknown'
  }
}

mobile.lte5gBandToFrequency = function (band, fiveG) {
  switch (band) {
    case 1:
    case 65:
    case 84:
    case 95:
    case 256:
      return '2100'
    case 2:
    case 25:
    case 33:
    case 35:
    case 36:
    case 37:
    case 39:
    case 98:
    case 101:
      return '1900'
    case 3:
    case 9:
    case 80:
      return '1800'
    case 4:
    case 10:
    case 66:
    case 86:
      return '1700'
    case 5:
    case 18:
    case 19:
    case 26:
    case 89:
      return '850'
    case 6:
    case 20:
    case 27:
    case 82:
    case 91:
    case 92:
      return '800'
    case 7:
    case 38:
    case 69:
      return '2600'
    case 8:
    case 81:
    case 93:
    case 94:
    case 100:
    case 106:
      return '900'
    case 11:
    case 21:
    case 32:
    case 50:
    case 51:
    case 45:
    case 74:
    case 75:
    case 76:
      return '1500'
    case 12:
    case 13:
    case 14:
    case 17:
    case 28:
    case 29:
    case 44:
    case 67:
    case 68:
    case 83:
    case 85:
    case 103:
    case 109:
      return '700'
    case 22:
    case 42:
    case 48:
    case 49:
    case 78:
      return '3500'
    case 23:
      return '2000'
    case 24:
    case 54:
    case 99:
      return '1600'
    case 30:
    case 40:
    case 97:
      return '2300'
    case 31:
    case 72:
    case 73:
      return '450'
    case 34:
      return fiveG ? '2100' : '2000'
    case 41:
    case 90:
      return '2500'
    case 43:
    case 77:
      return '3700'
    case 46:
    case 252:
      return '5200'
    case 47:
      return '5900'
    case 52:
      return '3300'
    case 53:
    case 254:
      return '2400'
    case 70:
      return fiveG ? '2000' : '1700'
    case 71:
    case 105:
    case 107:
      return '600'
    case 79:
      return '4900'
    case 87:
    case 88:
      return '410'
    case 96:
      return '6000'
    case 102:
      return '6200'
    case 104:
      return '6700'
    case 108:
      return '500'
    case 255:
      return fiveG ? '1600' : '5800'
    case 257:
    case 261:
      return '28000'
    case 258:
      return '26000'
    case 259:
      return '41000'
    case 260:
      return '39000'
    case 262:
      return '47000'
    case 263:
      return '60000'
    default:
      return i18n.t('N/A')
  }
}

mobile.umtsFrequencyToBand = function (frequnecy) {
  switch (frequnecy) {
    case '2100':
      return '1'
    case '1900':
      return '2'
    case '1800':
      return '3'
    case '1700':
      return '4'
    case '850':
      return '5'
    case 'J800':
      return '6'
    case '2600':
      return '7'
    case '900':
      return '8'
    case 'J1700':
      return '9'
    case '1500':
      return '11'
    case '700':
      return '12'
    case 'J850':
      return '19'
    case '800':
      return '20'
    case '3500':
      return '22'
    default:
      return i18n.t('N/A')
  }
}

mobile.getNetworkType = function (key) {
  const types = {
    1: i18n.t('Auto'),
    2: i18n.t('No service'),
    3: '2G',
    4: 'GSM',
    5: 'GPRS',
    6: 'EDGE',
    7: '3G',
    8: 'WCDMA',
    9: 'TDSCDMA',
    10: 'CDMA',
    11: 'EVDO',
    12: 'CDMA/EVDO',
    13: 'HSDPA',
    14: 'HSUPA',
    15: 'HSPA+',
    16: 'EHRPD',
    17: 'HDR',
    18: 'UMTS',
    19: 'HSDPA+HSUPA',
    20: '4G',
    21: 'LTE',
    22: '5G',
    23: 'NR5G',
    24: '5G-NSA',
    25: '5G-SA',
    26: 'CAT-M1',
    27: 'CAT-NB',
    28: 'eMTC',
    29: 'NBIoT',
    30: '2G/3G',
    31: 'GSM/WCDMA',
    32: '2G/4G',
    33: 'GSM/LTE',
    34: '3G/4G',
    35: 'WCDMA/LTE',
    36: '3G/5G',
    37: 'WCDMA/NR5G',
    38: '4G/5G',
    39: 'LTE/NR5G'
  }
  return types[key] || i18n.t('Unknown')
}

mobile.badgeColors = {
  excellent: 'bg-theme-bg-status-good text-theme-text-on-status-good',
  good: 'bg-theme-bg-status-positive text-theme-text-on-status-positive',
  fair: 'bg-theme-bg-status-fair text-theme-text-on-status-fair',
  poor: 'bg-theme-bg-status-poor text-theme-text-on-status-poor',
  no_signal: 'bg-theme-bg-status-bad text-theme-text-on-status-bad'
}
export const badgeContextColors = {
  excellent: 'bg-theme-bg-status-good-subtle text-theme-text-on-status-good-subtle border-theme-border-status-good',
  good: 'bg-theme-bg-status-positive-subtle text-theme-text-on-status-positive-subtle border-theme-border-status-positive',
  fair: 'bg-theme-bg-status-fair-subtle text-theme-text-on-status-fair-subtle border-theme-border-status-fair',
  poor: 'bg-theme-bg-status-poor-subtle text-theme-text-on-status-poor-subtle border-theme-border-status-poor',
  no_signal: 'bg-theme-bg-status-bad-subtle text-theme-text-on-status-bad-subtle border-theme-border-status-bad'
}

const badgeValues = {
  excellent: () => i18n.t('Excellent'),
  good: () => i18n.t('Good'),
  fair: () => i18n.t('Fair'),
  poor: () => i18n.t('Poor'),
  fair_poor: () => i18n.t('Fair to poor'),
  no_signal: () => i18n.t('Very poor')
}

mobile.rssiValue = function (value, lte) {
  if (lte) {
    if (value > -65) return { value: badgeValues.excellent(), customColor: mobile.badgeColors.excellent, customContextColor: badgeContextColors.excellent }
    else if (value >= -75) return { value: badgeValues.good(), customColor: mobile.badgeColors.good, customContextColor: badgeContextColors.good }
    else if (value >= -85) return { value: badgeValues.fair(), customColor: mobile.badgeColors.fair, customContextColor: badgeContextColors.fair }
    else if (value > -95) return { value: badgeValues.poor(), customColor: mobile.badgeColors.poor, customContextColor: badgeContextColors.poor }
    else return { value: badgeValues.no_signal(), customColor: mobile.badgeColors.no_signal, customContextColor: badgeContextColors.no_signal }
  }
  if (value >= -70) return { value: badgeValues.excellent(), customColor: mobile.badgeColors.excellent, customContextColor: badgeContextColors.excellent }
  else if (value >= -85) return { value: badgeValues.good(), customColor: mobile.badgeColors.good, customContextColor: badgeContextColors.good }
  else if (value >= -100) return { value: badgeValues.fair(), customColor: mobile.badgeColors.fair, customContextColor: badgeContextColors.fair }
  else if (value > -110) return { value: badgeValues.poor(), customColor: mobile.badgeColors.poor, customContextColor: badgeContextColors.poor }
  else return { value: badgeValues.no_signal(), customColor: mobile.badgeColors.no_signal, customContextColor: badgeContextColors.no_signal }
}

mobile.rscpValue = function (value) {
  if (value > -60) return { value: badgeValues.excellent(), customColor: mobile.badgeColors.excellent, customContextColor: badgeContextColors.excellent }
  else if (value > -75) return { value: badgeValues.good(), customColor: mobile.badgeColors.good, customContextColor: badgeContextColors.good }
  else if (value > -85) return { value: badgeValues.fair(), customColor: mobile.badgeColors.fair, customContextColor: badgeContextColors.fair }
  else if (value > -95) return { value: badgeValues.poor(), customColor: mobile.badgeColors.poor, customContextColor: badgeContextColors.poor }
  else return { value: badgeValues.no_signal(), customColor: mobile.badgeColors.no_signal, customContextColor: badgeContextColors.no_signal }
}

mobile.ecioValue = function (value) {
  if (value >= -6) return { value: badgeValues.excellent(), customColor: mobile.badgeColors.excellent, customContextColor: badgeContextColors.excellent }
  else if (value >= -10) return { value: badgeValues.good(), customColor: mobile.badgeColors.good, customContextColor: badgeContextColors.good }
  else return { value: badgeValues.fair_poor(), customColor: mobile.badgeColors.poor, customContextColor: badgeContextColors.poor }
}

mobile.rsrpValue = function (value) {
  if (value >= -80) return { value: badgeValues.excellent(), customColor: mobile.badgeColors.excellent, customContextColor: badgeContextColors.excellent }
  else if (value > -90) return { value: badgeValues.good(), customColor: mobile.badgeColors.good, customContextColor: badgeContextColors.good }
  else if (value > -100) return { value: badgeValues.fair_poor(), customColor: mobile.badgeColors.fair, customContextColor: badgeContextColors.fair }
  else return { value: badgeValues.poor(), customColor: mobile.badgeColors.no_signal, customContextColor: badgeContextColors.no_signal }
}

mobile.rsrqValue = function (value) {
  if (value >= -10) return { value: badgeValues.excellent(), customColor: mobile.badgeColors.excellent, customContextColor: badgeContextColors.excellent }
  else if (value > -15) return { value: badgeValues.good(), customColor: mobile.badgeColors.good, customContextColor: badgeContextColors.good }
  else if (value > -20) return { value: badgeValues.fair_poor(), customColor: mobile.badgeColors.fair, customContextColor: badgeContextColors.fair }
  else return { value: badgeValues.poor(), customColor: mobile.badgeColors.no_signal, customContextColor: badgeContextColors.no_signal }
}

mobile.sinrValue = function (value) {
  if (value >= 20) return { value: badgeValues.excellent(), customColor: mobile.badgeColors.excellent, customContextColor: badgeContextColors.excellent }
  else if (value > 13) return { value: badgeValues.good(), customColor: mobile.badgeColors.good, customContextColor: badgeContextColors.good }
  else if (value > 0) return { value: badgeValues.fair_poor(), customColor: mobile.badgeColors.fair, customContextColor: badgeContextColors.fair }
  else return { value: badgeValues.poor(), customColor: mobile.badgeColors.no_signal, customContextColor: badgeContextColors.no_signal }
}

/**
 * @description Function sorts modems list in order (primary, secondary, external)
 * @param modems - modems data
 * @returns {[Object]} - sorted modem list
 */
const modemSort = function (modems) {
  return modems.sort((a, b) => {
    // sorting to find primary modems
    if (a.primary) return -1
    if (b.primary) return 1
    // sorting external modems by index
    if (!a.builtin) {
      if (a.index < b.index) return -1
      return 1
    }
    return 0
  })
}
/**
 * @description Translate modem names and add index to external modems
 * @param modems
 * @returns {[Object]} - modem list with translated names
 */

const translateModemNames = function (modems) {
  return modems.map(modem => ({
    ...modem,
    name: modemNames[modem.name] ? modemNames[modem.name]().concat(!modem.builtin ? ' ' + modem.index : '') : mobile.createModemName(modems, modem.id),
    shortName: shortModemNames[modem.name] ? shortModemNames[modem.name]().concat(!modem.builtin ? ' ' + modem.index : '') : mobile.createModemName(modems, modem.id, true),
    operator: modem.operator === '000 000' ? 'N/A' : modem.operator,
    provider: modem.provider === '000 000' ? 'N/A' : modem.provider,
    operator_state: mobile.limitedService(modem) ? 'Limited service' : modem.operator_state
  }))
}
/**
 * @description Checks if modem is camping on an emergency cell
 * @param modem
 * @returns {boolean} true if camping, false otherwise
 */
mobile.limitedService = function (modem) {
  return Array.isArray(modem.cell_info) && modem.cell_info?.some(cell => cell.ue_state === 2)
}
/**
 * @description Checks if show modem name
 * @param modem
 * @returns {boolean} true if device is dual modem or modem is external, false otherwise
 */
mobile.shouldShowModemName = function (modem) {
  return (modem.builtin && mobile.store.board?.hwinfo?.dual_modem) || modem.builtin === false
}
/**
 * @description Checks if it should allow SIM unlock (PIN)
 * @param modem
 * @returns {boolean} true if SIM unlock is allowed
 */
mobile.shouldAllowSimUnlock = function (modem) {
  return modem.pinstate?.includes('PIN') && modem.pinleft > 0
}
/**
 * @description Checks if modem is in low power mode
 * @param modem
 * @returns {boolean} true if modem is LOW_POWER
 */
mobile.modemLowPower = function (modem) {
  return modem.mode === 3
}
/**
 * @description Checks if SIM is blocked and requires PUK code
 * @param modem
 * @returns {boolean} true if SIM requires PUK code
 */
mobile.requiresPuk = function (modem) {
  return modem.pinstate?.includes('PUK') && modem.pinleft === 0
}
/**
 * @description Checks if it should allow SIM unblock (PUK)
 * @param modem
 * @returns {boolean} true if SIM unblock is allowed
 */
mobile.shouldAllowSimUnblock = function (modem) {
  return mobile.requiresPuk(modem) && modem.pukleft > 5
}
/**
 * @description Checks if modem is offline, unreachable
 * @param modem
 * @returns {boolean} true if modem is offline, false otherwise
 */
mobile.modemOffline = function (modem) {
  return modem?.offline === '1'
}
/**
 * @description Checks if modem has WWAN GNSS Conflict and GPS is on
 * @param modem
 * @returns {boolean} true if modem has WWAN GNSS Conflict and GPS is on, false otherwise
 */
mobile.getGnssState = function (modem) {
  return (modem?.wwan_gnss_conflict && modem?.gnss_state === 1) ?? false
}
/**
 * @description Checks if modem is connected to 3G network
 * @param modem
 * @returns {boolean} true if modem uses 3G network type
 */
mobile.connectedTo3g = function (modem) {
  return ['WCDMA', 'HSDPA', 'HSUPA', 'HSPA', 'UMTS'].some(networkType => modem.ntype?.includes(networkType))
}
/**
 * @description Checks if modem is connected to 4G network
 * @param modem
 * @returns {boolean} true if modem uses 4G network type
 */
mobile.connectedTo4g = function (modem) {
  return ['lte', 'cat', 'nb', 'emtc'].some(networkType => modem.ntype?.toLowerCase().includes(networkType))
}
/**
 * @description Checks if modem is connected to 5G network
 * @param modem
 * @returns {boolean} true if modem uses 5G network type
 */
mobile.connectedTo5g = function (modem) {
  return mobile.connectedTo5gNsa(modem) || mobile.connectedTo5gSa(modem)
}
/**
 * @description Checks if modem is connected to 5G SA network
 * @param modem
 * @returns {boolean} true if modem uses 5G SA network type
 */
mobile.connectedTo5gSa = function (modem) {
  return modem.ntype?.toLowerCase().includes('5g-sa') ?? false
}
/**
 * @description Checks if modem is connected to 5G NSA network
 * @param modem
 * @returns {boolean} true if modem uses 5G NSA network type
 */
mobile.connectedTo5gNsa = function (modem) {
  return modem.ntype?.toLowerCase().includes('5g-nsa') ?? false
}
/**
 * @description Checks if modem is connected to 4G/5G network
 * @param modem
 * @returns {boolean} true if modem uses 4G/5G network type
 */
mobile.connectedTo4g5g = function (modem) {
  return mobile.connectedTo4g(modem) || mobile.connectedTo5g(modem)
}
/**
 * @description creates and returns translated modem name
 * @param modem
 * @returns {string} translated modem name
 */
mobile.createModemName = function (modems, modemId, short) {
  const modemName = short ? mobile.shortModemNames : mobile.modemNames
  const modem = modems.find(m => m.id === modemId)
  const builtinNumber = modems.filter(m => m.builtin).length
  if (modem) {
    if (!modem.builtin) return modemName[2]()
    if (modem.primary && modem.builtin && builtinNumber > 1) return modemName[0]()
    else if (!modem.primary && modem.builtin && builtinNumber > 1) return modemName[1]()
    else if (modem.builtin) return modemName[3]()
  }
  return modemName[4]()
}
/**
 * @description finds modem by id from store modemList
 * @param modemId - modem id
 * @returns {Object} - modem
 */
mobile.getModemById = function (modemId) {
  if (mobile.store.modemList.length === 0) mobile.store.modemList = mobile.parseModems(mobile.store.board.modems)
  return mobile.store.modemList.find(m => m.id === modemId) || {}
}
/**
 * @description function checks maximum number of simcards in modems
 * @param {Object[]} modems - modems list
 * @returns {number} - sim count
 */
mobile.simCount = function (modems) {
  return modems.length > 0
    ? Math.max.apply(
        Math,
        modems.map(o => o.sim_count ?? o.simcount)
      )
    : 0
}
/**
 * @description function filters and formats sim card options by modem,
 *              if modem is not provided, returns options for the first modem in the list,
 *              if no modem is found, returns an empty array
 * @param {Array[]} modemList - list of modems
 * @param {string} modemId - modem id
 * @returns {Array[]} - sim card option list
 */
mobile.getModemSimCardOptions = function (modemList, modemId) {
  if (!modemId) modemId = modemList[0]?.id
  if (!modemId) return []

  const modem = modemList.find(m => m.id === modemId)
  if (!modem) return []

  return Array.from({ length: modem.sim_count ?? modem.simcount }, (_, i) => [(i + 1).toString(), 'SIM' + mobile.adjustSimNumber(i + 1, modem.id)])
}
export default {
  install(app) {
    mobile.store = useMainStore()
    app.config.globalProperties.$mobile = mobile
  }
}
