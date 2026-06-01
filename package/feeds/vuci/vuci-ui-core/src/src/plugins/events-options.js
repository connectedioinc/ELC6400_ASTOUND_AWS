import { i18n } from '@ui-core/plugins/i18n'

export const events = {}

events.getTypes = function () {
  return {
    Config: i18n.t('Config change'),
    DHCP: i18n.t('New DHCP client'),
    Reboot: i18n.t('Reboot'),
    Startup: i18n.t('Startup'),
    SSH: i18n.t('SSH'),
    'Web UI': i18n.t('Web UI'),
    WiFi: i18n.t('New WiFi client'),
    'Mobile Data': i18n.t('Mobile data'),
    Failover: i18n.t('WAN failover'),
    SMS: i18n.t('SMS'),
    'Signal strength': i18n.t('Signal strength'),
    'SIM switch': i18n.t('SIM switch'),
    'Switch Events': i18n.t('Port state'),
    'Switch Topology': i18n.t('Topology changes'),
    GPS: i18n.t('GPS'),
    Fota: i18n.t('FOTA')
  }
}

events.getSubTypes = function () {
  return {
    // shared
    all: i18n.t('All'),
    // signal strength
    'Signal strength dropped below -113 dBm': '-121dBm -113dBm',
    'Signal strength dropped below -98 dBm': '-113dBm -98dBm',
    'Signal strength dropped below -93 dBm': '-98dBm -93dBm',
    'Signal strength dropped below -75 dBm': '-93dBm -75dBm',
    'Signal strength dropped below -60 dBm': '-75dBm -60dBm',
    'Signal strength dropped below -50 dBm': '-60dBm -50dBm',
    // config
    avl: 'AVL',
    aws_jobs: 'AWS jobs',
    azure_iothub: 'Azure IoT Hub',
    bacnet_router: 'Bacnet',
    bfd: 'BFD',
    bgp: 'BGP',
    ble_devices: i18n.t('Bluetooth devices'),
    blesem: 'Bluetooth',
    buttons: i18n.t('Buttons'),
    call_utils: i18n.t('Call utilities'),
    chilli: 'Hotspot',
    cli: 'CLI',
    data_sender: i18n.t('Data to server'),
    ddns: 'DDNS',
    dhcp: 'DHCP',
    dmvpn: 'DMVPN',
    dnp3_client: i18n.t('DNP3 TCP client'),
    dnp3_outstation: i18n.t('DNP3 outstation'),
    dropbear: 'SSH',
    easycwmp: 'TR-069',
    eigrp: 'EIGRP',
    email_to_sms: i18n.t('Email to SMS'),
    emailrelay: i18n.t('Email relay'),
    eoip: 'EoIP',
    etherwake: i18n.t('Wake on LAN'),
    events_reporting: i18n.t('Events reporting'),
    event_juggler: i18n.t('Event juggler'),
    firewall: 'Firewall',
    frr: i18n.t('Dynamic routes'),
    fstab: i18n.t('SD & USB tools'),
    gps: 'GPS',
    hostblock: i18n.t('Site blocking'),
    'https-dns-proxy': i18n.t('HTTPS DNS proxy'),
    igmpproxy: 'IGMP',
    impulse_counter: i18n.t('Impulse counter'),
    iojuggler: i18n.t('I/O juggler'),
    ioman: i18n.t('I/O status'),
    io_scheduler: i18n.t('I/O scheduler'),
    iot: 'Cumulocity',
    iottw: 'ThingWorx',
    ip_blockd: i18n.t('IP block'),
    ipsec: 'IPsec',
    landingpage: i18n.t('Landing page'),
    minidlna: 'MiniDLNA',
    modbus_client: i18n.t('Modbus TCP client'),
    modbus_server: i18n.t('Modbus server'),
    modbusgateway: i18n.t('Modbus gateway'),
    mosquitto: i18n.t('MQTT broker'),
    mqtt_pub: i18n.t('MQTT publisher'),
    multi_wifi: 'Multi AP',
    mwan3: i18n.t('Failover'),
    network: i18n.t('Network'),
    nhrp: i18n.t('NHRP routing'),
    nlbwmon: i18n.t('Network usage'),
    ntpclient: i18n.t('NTP client'),
    ntpd: 'NTPD',
    ntpserver: i18n.t('NTP server'),
    opcua_client: 'OPC UA',
    opcua_server: i18n.t('OPC UA server'),
    openvpn: 'OpenVPN',
    operctl: i18n.t('Mobile operator list'),
    ospf: i18n.t('OSPF routing'),
    overview: i18n.t('Overview'),
    p910nd: i18n.t('Printer server'),
    package_restore: i18n.t('Package restore'),
    pam: 'PAM',
    periodic_reboot: i18n.t('Reboot scheduler'),
    ping_reboot: i18n.t('Ping reboot'),
    poe: i18n.t('Ports settings'),
    port_mirroring: i18n.t('Port mirroring'),
    pptpd: 'PPTP',
    privoxy: i18n.t('Proxy blocker'),
    profiles: i18n.t('Profiles'),
    qos: 'QoS',
    quota_limit: i18n.t('Mobile data limit'),
    relayd: i18n.t('Relay'),
    rip: i18n.t('RIP routing'),
    rms_mqtt: 'RMS',
    rpcd: i18n.t('Users management'),
    rs_console: 'RS console',
    rs_modbus: 'RS modbus',
    rs_modem: 'RS modem',
    rs_ntrip: 'RS NTRIP',
    rs_overip: 'RS overIP',
    rut_fota: 'Fota',
    samba: i18n.t('Network shares'),
    sim_switch: i18n.t('SIM switch'),
    simcard: i18n.t('SIM card'),
    sim_idle_protection: i18n.t('SIM idle protection'),
    smpp: 'SMPP',
    sms_gateway: i18n.t('SMS gateway'),
    sms_utils: i18n.t('SMS utilities'),
    snmpd: 'SNMP',
    snmptrap: 'SNMP Trap',
    socat: i18n.t('Console'),
    sqm: 'SQM',
    sshfs: 'SSHFS',
    stunnel: 'Stunnel',
    system: i18n.t('System'),
    tailscale: 'Tailscale',
    telnetd: 'Telnet',
    thingworx: 'ThingWorx',
    tinc: 'Tinc VPN',
    travelmate: 'Travelmate',
    udprelay: i18n.t('UDP broadcast relay'),
    uhttpd: i18n.t('Web server'),
    ulogd: i18n.t('Traffic logging'),
    upnpd: 'UPNP',
    user_groups: i18n.t('User groups'),
    vrrpd: 'VRRP',
    widget: 'Widget',
    wifi_scanner: i18n.t('WiFi scanner'),
    wireless: i18n.t('Wireless'),
    xl2tpd: 'L2TP',
    zerotier: 'Zerotier',
    // wifi
    'client connected': i18n.t('Connected'),
    'client disconnected': i18n.t('Disconnected'),
    // gps
    'left geofence': i18n.t('Left geofence'),
    'entered geofence': i18n.t('Entered geofence'),
    // ssh
    succeeded: i18n.t('Successful authentication'),
    bad: i18n.t('Unsuccessful authentication'),
    // switch topology
    'Changes in topology': i18n.t('Topology changes'),
    // switch events
    'Port link state': i18n.t('Link state'),
    'Port speed for': i18n.t('Link speed'),
    'changed to DOWN': i18n.t('Unplugged'),
    'changed to UP': i18n.t('Plugged in'),
    // reboot
    'web ui': i18n.t('From Web UI'),
    'input/output': i18n.t('From input/output'),
    'ping reboot': i18n.t('From ping reboot'),
    'wget reboot': i18n.t('From wget reboot'),
    'reboot scheduler': i18n.t('From reboot scheduler'),
    'from button': i18n.t('From button'),
    'sms reboot': i18n.t('From SMS'),
    // startup
    'Device startup completed': i18n.t('Device startup completed'),
    'unexpected shutdown': i18n.t('After unexpected shutdown'),
    // failover
    'Switched to main': i18n.t('Switched to main'),
    'Switched to backup': i18n.t('Switched to failover'),
    // mobile data
    'data connected': i18n.t('Connected'),
    'data disconnected': i18n.t('Disconnected'),
    // sms
    'received from': i18n.t('SMS received'),
    // webui Events Reporting
    'Password auth succeeded': i18n.t('Successful authentication'),
    'Bad password attempt': i18n.t('Unsuccessful authentication'),
    // webui Event Juggler
    'successfully authenticated on HTTP': i18n.t('Successful authentication'),
    'Invalid password attempt for': i18n.t('Unsuccessful authentication'),
    // sim switch
    'to SIM1': i18n.t('Changing to SIM1'),
    'to SIM2': i18n.t('Changing to SIM2'),
    // dhcp
    lan: i18n.t('Connected from LAN'),
    wifi: i18n.t('Connected from WiFi'),
    'is now available': i18n.t('Firmware update is now available')
  }
}

events.addSwitchEvents = function (sourceObj, targetArr) {
  if (!sourceObj || !sourceObj['Switch Events']) {
    return
  }
  const lanPattern = /^LAN(\d*)$/
  const wanPattern = /^WAN(\d*)$/

  sourceObj['Switch Events'].forEach(event => {
    const matchLan = lanPattern.exec(event)
    const matchWan = wanPattern.exec(event)

    if (matchLan !== null) {
      const lanNumber = matchLan[1] ? matchLan[1] : null
      targetArr.push([matchLan[0], lanNumber ? i18n.t('LAN %s').format(lanNumber) : i18n.t('LAN')])
    } else if (matchWan !== null) {
      const wanNumber = matchWan[1] ? matchWan[1] : null
      targetArr.push([matchWan[0], wanNumber ? i18n.t('WAN %s').format(wanNumber) : i18n.t('WAN')])
    }
  })
}

events.getTranslatedTypes = function (availableEvents) {
  const availableTypes = Object.keys(availableEvents)
  const options = Object.entries(this.getTypes())
  return options.filter(([k]) => availableTypes.includes(k))
}

events.getTranslatedSubtypes = function (availableEvents) {
  const eventsOptions = {}
  const subtypeOptions = Object.entries(this.getSubTypes())
  this.addSwitchEvents(availableEvents, subtypeOptions)
  Object.entries(availableEvents).forEach(([type, subtypes]) => {
    eventsOptions[type] = subtypeOptions.filter(([v]) => subtypes.includes(v))
  })
  return eventsOptions
}

export default {
  install(app) {
    app.config.globalProperties.$eventsOptions = events
  }
}
