import { i18n } from '@ui-core/plugins/i18n'

export const dataSender = {}

dataSender.encoderTranslate = function () {
  return {
    '': i18n.t('None'),
    base64: 'Base64'
  }
}
dataSender.formatTranslate = function () {
  return {
    json: 'JSON',
    custom: i18n.t('Custom'),
    lua: i18n.t('Lua script')
  }
}
dataSender.outputPluginTranslate = function () {
  return {
    http: 'HTTP',
    mqtt: 'MQTT',
    azure: i18n.t('Azure IoT Hub'),
    ftp: 'FTP',
    lua: 'Lua',
    sms: 'SMS',
    smtp: 'SMTP',
    socket: i18n.t('Socket')
    // Funtionality which will be included in 7.6 fw
    // file: 'File',
    // telegram: 'Telegram',
  }
}
dataSender.inputPluginTranslate = function () {
  return {
    base: i18n.t('Base'),
    bluetooth: i18n.t('Bluetooth'),
    dnp3: 'DNP3',
    gsm: 'GSM',
    mbus: i18n.t('M-Bus data'),
    mdcollect: i18n.t('Mobile usage'),
    mnfinfo: i18n.t('MNF info'),
    modbus: i18n.t('Modbus'),
    modbus_alarm: i18n.t('Modbus alarms'),
    mqtt: 'MQTT',
    opcua: 'OPC UA',
    wifiscan: i18n.t('Wifi scanner'),
    dlms: 'DLMS',
    lua: i18n.t('Lua script'),
    impulse_counter: i18n.t('Impulse counter'),
    eventlog: i18n.t('Event Log'),
    io: i18n.t('Input/Output'),
    nflog: i18n.t('Traffic log'),
    sms: 'SMS',
    gps: 'GPS',
    iec60870: 'IEC 60870-5'
    // Funtionality which will be included in 7.6 fw
    // chilli: i18n.t('Hotspot'),
    // file: i18n.t('File'),
  }
}
export default {
  install(app) {
    app.config.globalProperties.$dataSenderParameters = dataSender
  }
}
