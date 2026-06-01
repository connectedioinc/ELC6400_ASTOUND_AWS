<template>
  <vuci-named-section
    v-slot="{ s }"
    ref="section"
    :uci-data="uciData"
    :title="isAddSection ? '' : $utils.getModalTitle($t('data'), section.name)"
    :name="section.id"
    :endpoints="[{ endpoint: `data_to_server/collections/${collectionSection().id}/data/config` }]"
    data-key="inputs"
    :after-save="(_, res) => updateCertificateWarnings(res)"
  >
    <vuci-form-item-switch
      :uci-section="s"
      :label="$t('Enable')"
      :help="$t('Enables data to server input instance.')"
      name="enabled"
    />
    <vuci-form-item-input
      v-show="isAddSection || newInput"
      :uci-section="s"
      name="name"
      :label="$t('Name')"
      :help="$t('Name of data input.')"
      maxlength="64"
      :rules="v => [v.uciname, inputNameExists]"
      required
    />
    <vuci-form-item-select
      :uci-section="s"
      name="plugin"
      :label="$t('Type')"
      :help="$t('Data input type.')"
      :options="pluginOptions"
      @change="onPluginChange"
    />
    <tlt-form-model-item v-if="s.plugin === 'gps' && showGpsAlert">
      <tlt-alert
        id="gps-info"
        class="max-w-xs"
        :action="{ text: $t('Go to GPS configuration'), onClick: () => $router.push('/services/gps/general') }"
        :text="$t('GPS is selected in data configuration. Please ensure that your device\'s GPS is enabled for proper functionality.')"
        inline
        type="info"
      />
    </tlt-form-model-item>
    <vuci-form-item-button
      :uci-section="s"
      name="downloadExampleInputLua"
      :label="$t('Lua data example script')"
      :text="$t('Download')"
      :depend="s.plugin === 'lua'"
      no-write
      @click="downloadExampleLua('/data/actions/download_example_input_lua', $t('input example lua'))"
    />
    <vuci-form-item-upload
      :uci-section="s"
      name="lua_script"
      :label="$t('Lua script')"
      :required="s.enabled === '1' && s.plugin === 'lua'"
      :depend="s.plugin === 'lua'"
      :readonly="$session.group !== 'root'"
    >
      <template
        v-if="$session.group !== 'root'"
        #after-content="{ controlRef }"
      >
        <tlt-tooltip
          :target="() => controlRef"
          placement="bottom-start"
          fallback-placements="top-start"
          :content="$t('Current user is unauthorized to edit scripts.')"
        />
      </template>
    </vuci-form-item-upload>
    <!-- MDC -->
    <vuci-form-item-select
      :uci-section="s"
      name="mdc_period"
      :label="$t('Data period')"
      :options="periodOptions"
      :depend="s.plugin === 'mdcollect'"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="mdc_current"
      :label="$t('Current')"
      :depend="s.plugin === 'mdcollect'"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="mdc_modem_id"
      :label="$t('Modem')"
      :options="modems"
      :depend="s.plugin === 'mdcollect' && modemList().length > 1"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="mdc_sim"
      :label="$t('SIM card')"
      :options="$mobile.getModemSimCardOptions(modemList(), s?.mdc_modem_id)"
      :depend="s.plugin === 'mdcollect' && simCount > 1"
    />
    <!-- BLUETOOTH -->
    <vuci-form-item-select
      :uci-section="s"
      name="bl_filter"
      :label="$t('Data filtering')"
      :options="bluetoothOptions"
      :depend="s.plugin === 'bluetooth'"
    />
    <vuci-form-item-list
      :uci-section="s"
      name="bl_filter_mac"
      :label="$t('MAC address')"
      :help="$t('Filter data by device MAC address.')"
      rules="macaddr"
      placeholder="11:22:33:44:55:66"
      :required="s.enabled === '1' && s.plugin === 'bluetooth' && s.bl_filter === 'mac'"
      :depend="s.plugin === 'bluetooth' && s.bl_filter === 'mac'"
      :maxlines="10"
    />
    <vuci-form-item-list
      :uci-section="s"
      name="bl_filter_name"
      :label="$t('Device name')"
      :help="$t('Filter data by device name.')"
      :placeholder="$t('Device name')"
      maxlength="64"
      :required="s.enabled === '1' && s.plugin === 'bluetooth' && s.bl_filter === 'name'"
      :depend="s.plugin === 'bluetooth' && s.bl_filter === 'name'"
      :maxlines="10"
      rules="string"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="bl_segments"
      :label="$t('Segment count')"
      :help="$t('Max segment count in one JSON string sent to server.')"
      rules="irange(1,64)"
      initial="1"
      :required="s.enabled === '1' && s.plugin === 'bluetooth'"
      :depend="s.plugin === 'bluetooth'"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="bl_object"
      :label="$t('Send as object')"
      :help="$t('Check to send JSON segment as object and not as array element.')"
      :depend="s.plugin === 'bluetooth' && s.bl_segments === '1'"
    />
    <!-- MODBUS -->
    <vuci-form-item-select
      :uci-section="s"
      name="modbus_filter"
      :label="$t('Data filtering')"
      :options="modbusOptions"
      :depend="s.plugin === 'modbus'"
      :no-write="needToDelete('modbus')"
    />
    <vuci-form-item-list
      :uci-section="s"
      name="modbus_filter_server_id"
      :label="$t('Server ID')"
      :help="$t('Data will be sent to server only from server device with this Modbus ID (0-255).')"
      rules="irange(0,255)"
      placeholder="1"
      :required="s.enabled === '1' && s.plugin === 'modbus' && s.modbus_filter === 'id'"
      :depend="s.plugin === 'modbus' && s.modbus_filter === 'id'"
      :no-write="needToDelete('modbus')"
      :maxlines="20"
    />
    <vuci-form-item-list
      :uci-section="s"
      name="modbus_filter_server_ip"
      :label="$t('Server IP')"
      :help="$t('Data will be sent to server from server device with this IP address only (Modbus TCP servers only).')"
      rules="ip4addr"
      placeholder="0.0.0.0"
      :required="s.enabled === '1' && s.plugin === 'modbus' && s.modbus_filter === 'ip'"
      :depend="s.plugin === 'modbus' && s.modbus_filter === 'ip'"
      :no-write="needToDelete('modbus')"
      :maxlines="20"
    />
    <vuci-form-item-list
      :uci-section="s"
      name="modbus_filter_request"
      :label="$t('Request name')"
      :help="$t('Filter records by request name.')"
      rules="string"
      maxlength="64"
      :required="s.enabled === '1' && s.plugin === 'modbus' && s.modbus_filter === 'name'"
      :depend="s.plugin === 'modbus' && s.modbus_filter === 'name'"
      :no-write="needToDelete('modbus')"
      :maxlines="20"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="modbus_segments"
      :label="$t('Segment count')"
      :help="$t('Max segment count in one JSON string sent to server.')"
      rules="irange(1,64)"
      initial="1"
      :required="s.enabled === '1' && s.plugin === 'modbus'"
      :depend="s.plugin === 'modbus'"
      :no-write="needToDelete('modbus')"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="modbus_object"
      :label="$t('Send as object')"
      :help="$t('Check to send JSON segment as object and not as array element.')"
      :depend="s.plugin === 'modbus' && s.modbus_segments === '1'"
      :no-write="needToDelete('modbus')"
    />
    <!-- MODBUS alarms -->
    <vuci-form-item-select
      :uci-section="s"
      name="modbus_alarm_filter"
      :label="$t('Data filtering')"
      :options="modbusAlarmsOptions"
      :depend="s.plugin === 'modbus_alarm'"
    />
    <vuci-form-item-list
      :uci-section="s"
      name="modbus_alarm_filter_server_id"
      :label="$t('Server ID filter')"
      :help="$t('Data will be sent to server only from server device with this Modbus ID (0-255).')"
      rules="irange(0,255)"
      :required="s.enabled === '1' && s.plugin === 'modbus_alarm' && s.modbus_alarm_filter === 'server_id'"
      :depend="s.plugin === 'modbus_alarm' && s.modbus_alarm_filter === 'server_id'"
      :maxlines="10"
    />
    <vuci-form-item-list
      :uci-section="s"
      name="modbus_alarm_filter_register"
      :label="$t('Register number filter')"
      :help="$t('Data will be sent to server only if Modbus register or coil is the same (1-65536).')"
      rules="irange(1,65536)"
      :required="s.enabled === '1' && s.plugin === 'modbus_alarm' && s.modbus_alarm_filter === 'register'"
      :depend="s.plugin === 'modbus_alarm' && s.modbus_alarm_filter === 'register'"
      :maxlines="10"
    />
    <vuci-form-item-list
      :uci-section="s"
      name="modbus_alarm_filter_alarm_id"
      :label="$t('Alarm ID filter')"
      :help="$t('Data will be sent to server only if id of alarm from configuration is the same.')"
      rules="uciname"
      :required="s.enabled === '1' && s.plugin === 'modbus_alarm' && s.modbus_alarm_filter === 'alarm_id'"
      :depend="s.plugin === 'modbus_alarm' && s.modbus_alarm_filter === 'alarm_id'"
      :maxlines="10"
    />
    <!-- MQTT -->
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_in_host"
      :label="$t('Server address')"
      :help="$t('Hostname or ip address of the broker to connect to.')"
      placeholder="www.example.com"
      :rules="['host', val => validateMqttServerAddress(val, section, uciData)]"
      :required="s.enabled === '1' && s.plugin === 'mqtt'"
      :depend="s.plugin === 'mqtt'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_in_port"
      :label="$t('Port')"
      :help="$t('Port number.')"
      initial="1883"
      placeholder="1883"
      rules="port"
      :depend="s.plugin === 'mqtt'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_in_keepalive"
      :label="$t('Keepalive')"
      :help="$t('Keepalive time in seconds.')"
      initial="60"
      placeholder="60"
      rules="irange(0,2147483647)"
      :depend="s.plugin === 'mqtt'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_in_topic"
      :label="$t('Topic')"
      :help="$t('MQTT topic to be used for publishing the data.')"
      :placeholder="$t('Topic')"
      maxlength="65535"
      rules="mqtt_client_id"
      :required="s.enabled === '1' && s.plugin === 'mqtt'"
      :depend="s.plugin === 'mqtt'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_in_client_id"
      :label="$t('Client ID')"
      :help="$t('Client ID to send with the data. If empty, a random client ID will be generated.')"
      :placeholder="$t('Client ID')"
      rules="mqtt_client_id"
      maxlength="64"
      :depend="s.plugin === 'mqtt'"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="mqtt_in_qos"
      :label="$t('QoS')"
      :help="
        $t(
          'MQTT Quality of Service. Allowed values: %s 0 - when we prefer that the message will not arrive at all rather than arrive twice %s \
                    1 - when we want the message to arrive at least once but don\'t care if it arrives twice (or more) %s \
                    2 - when we want the message to arrive exactly once. A higher QoS value means a slower transfer'
        ).format('<br/>', '<br/>', '<br/>')
      "
      rawhtml
      :options="qosOptions"
      :depend="s.plugin === 'mqtt'"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="mqtt_in_tls"
      :label="$t('Enable secure connection')"
      :depend="s.plugin === 'mqtt'"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="mqtt_in_tls_type"
      :label="$t('TLS type')"
      :help="$t('Choose TLS type.')"
      :options="tlsTypeOptions"
      :required="s.enabled === '1' && s.plugin === 'mqtt' && s.mqtt_in_tls === '1'"
      :depend="s.plugin === 'mqtt' && s.mqtt_in_tls === '1'"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="mqtt_in_insecure"
      :label="$t('Allow insecure connection')"
      :help="$t('Allow not verifying server authentication.')"
      :depend="s.plugin === 'mqtt' && s.mqtt_in_tls === '1' && s.mqtt_in_tls_type === 'cert'"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="mqtt_device_files"
      :label="$t('Certificate files from device')"
      :depend="certificatesStore.hasVuciAppCertificates && s.plugin === 'mqtt' && s.mqtt_in_tls === '1' && s.mqtt_in_tls_type === 'cert'"
    >
      <template #help>
        {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated') }}
        <router-link to="/system/admin/certificates">{{ $t('here') }}</router-link
        >.
      </template>
    </vuci-form-item-switch>
    <vuci-form-item-upload
      :uci-section="s"
      name="mqtt_in_cafile"
      :label="$t('Certificate authority file')"
      max-size="16MB"
      :required="s.enabled === '1' && s.plugin === 'mqtt' && s.mqtt_in_tls === '1' && s.mqtt_in_tls_type === 'cert' && s.mqtt_device_files !== '1'"
      :warnings="(_, self) => getCertificateUploadWarning(self)"
      :depend="s.plugin === 'mqtt' && s.mqtt_in_tls === '1' && s.mqtt_in_tls_type === 'cert' && s.mqtt_device_files !== '1'"
    >
      <template #fileName="{ fileName }">
        {{ normalizeFileName(fileName) }}
      </template>
    </vuci-form-item-upload>
    <vuci-form-item-upload
      :uci-section="s"
      name="mqtt_in_certfile"
      :label="$t('Client certificate')"
      max-size="16MB"
      :warnings="(_, self) => getCertificateUploadWarning(self)"
      :depend="s.plugin === 'mqtt' && s.mqtt_in_tls === '1' && s.mqtt_in_tls_type === 'cert' && s.mqtt_device_files !== '1'"
    >
      <template #fileName="{ fileName }">
        {{ normalizeFileName(fileName) }}
      </template>
    </vuci-form-item-upload>
    <vuci-form-item-upload
      :uci-section="s"
      name="mqtt_in_keyfile"
      :label="$t('Client private keyfile')"
      max-size="16MB"
      :depend="s.plugin === 'mqtt' && s.mqtt_in_tls === '1' && s.mqtt_in_tls_type === 'cert' && s.mqtt_device_files !== '1'"
    >
      <template #fileName="{ fileName }">
        {{ normalizeFileName(fileName) }}
      </template>
    </vuci-form-item-upload>
    <vuci-form-item-select
      :uci-section="s"
      name="mqtt_in_cafile"
      :label="$t('Certificate authority file')"
      :options="caOptions"
      :required="s.enabled === '1' && s.plugin === 'mqtt' && s.mqtt_in_tls === '1' && s.mqtt_in_tls_type === 'cert' && s.mqtt_device_files === '1'"
      :depend="s.plugin === 'mqtt' && s.mqtt_in_tls === '1' && s.mqtt_in_tls_type === 'cert' && s.mqtt_device_files === '1'"
      :warnings="getCertificateWarning"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="mqtt_in_certfile"
      :label="$t('Client certificate')"
      :options="certOptionsForNonRequired"
      :depend="s.plugin === 'mqtt' && s.mqtt_in_tls === '1' && s.mqtt_in_tls_type === 'cert' && s.mqtt_device_files === '1'"
      :warnings="getCertificateWarning"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="mqtt_in_keyfile"
      :label="$t('Client private keyfile')"
      :options="keyOptionsNonTpm2ForNonRequired"
      :depend="s.plugin === 'mqtt' && s.mqtt_in_tls === '1' && s.mqtt_in_tls_type === 'cert' && s.mqtt_device_files === '1'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_in_psk"
      :label="$t('Pre-Shared-Key')"
      :help="$t('The pre-shared-key in hex format with no leading “0x”.')"
      maxlength="128"
      rules="hexstring"
      :placeholder-prefix="false"
      :depend="s.plugin === 'mqtt' && s.mqtt_in_tls === '1' && s.mqtt_in_tls_type === 'psk'"
      :required="s.enabled === '1' && s.plugin === 'mqtt' && s.mqtt_in_tls === '1' && s.mqtt_in_tls_type === 'psk'"
      sensitive
      password
    />
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_in_identity"
      :label="$t('Identity')"
      :help="$t('The identity of this client.')"
      maxlength="255"
      rules="uciname"
      :required="s.enabled === '1' && s.plugin === 'mqtt' && s.mqtt_in_tls === '1' && s.mqtt_in_tls_type === 'psk'"
      :depend="s.plugin === 'mqtt' && s.mqtt_in_tls === '1' && s.mqtt_in_tls_type === 'psk'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_in_username"
      :label="$t('Username')"
      :help="$t('Username for MQTT authentication.')"
      rules="credentials_validate"
      maxlength="512"
      :depend="s.plugin === 'mqtt'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_in_password"
      :label="$t('Password')"
      :help="$t('Password for MQTT authentication.')"
      rules="credentials_validate"
      maxlength="512"
      :depend="s.plugin === 'mqtt'"
      password
      sensitive
    />
    <!-- Funtionality which will be included in 7.6 fw -->
    <!-- GSM -->
    <vuci-form-item-select
      :uci-section="s"
      name="gsm_modem_id"
      :label="$t('Modem')"
      :options="modems"
      :depend="s.plugin === 'gsm' && modemList().length > 1"
    />
    <!-- DNP3 -->
    <vuci-form-item-select
      :uci-section="s"
      name="dnp3_filter"
      :label="$t('Data filtering')"
      :options="dnp3Options"
      :depend="s.plugin === 'dnp3'"
      :no-write="needToDelete('dnp3')"
    />
    <vuci-form-item-list
      :uci-section="s"
      name="dnp3_filter_address"
      :label="$t('DNP3 address')"
      :help="$t('Filter data by defined DNP3 address.')"
      rules="irange(0,65519)"
      placeholder="65519"
      :required="s.enabled === '1' && s.plugin === 'dnp3' && s.dnp3_filter === 'address'"
      :depend="s.plugin === 'dnp3' && s.dnp3_filter === 'address'"
      :no-write="needToDelete('dnp3')"
      :maxlines="10"
    />
    <vuci-form-item-list
      :uci-section="s"
      name="dnp3_filter_ip"
      :label="$t('IP address')"
      :help="$t('Filter data by defined IP address.')"
      rules="ipaddr"
      placeholder="0.0.0.0"
      :required="s.enabled === '1' && s.plugin === 'dnp3' && s.dnp3_filter === 'ip'"
      :depend="s.plugin === 'dnp3' && s.dnp3_filter === 'ip'"
      :no-write="needToDelete('dnp3')"
      :maxlines="10"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="dnp3_segments"
      :label="$t('Segment count')"
      :help="$t('Max segment count in one JSON string sent to server.')"
      rules="irange(1,64)"
      initial="1"
      :required="s.enabled === '1' && s.plugin === 'dnp3'"
      :depend="s.plugin === 'dnp3'"
      :no-write="needToDelete('dnp3')"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="dnp3_object"
      :label="$t('Send as object')"
      :help="$t('Check to send JSON segment as object and not as array element.')"
      :depend="s.plugin === 'dnp3' && s.dnp3_segments === '1'"
      :no-write="needToDelete('dnp3')"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="dnp3_db"
      :label="$t('Database')"
      :help="$t('Database location.')"
      :options="dnp3DatabaseOptions"
      :depend="s.plugin === 'dnp3'"
      :no-write="needToDelete('dnp3')"
    />
    <!-- Mbus -->
    <vuci-form-item-select
      :uci-section="s"
      name="mbus_filter"
      :label="$t('Data filtering')"
      :options="filterOptions"
      :depend="s.plugin === 'mbus'"
      :no-write="needToDelete('mbus')"
    />
    <vuci-form-item-list
      :uci-section="s"
      name="mbus_filter_name"
      :label="$t('M-Bus group name')"
      :help="$t('Filter data by defined M-Bus group name.')"
      :required="s.enabled === '1' && s.plugin === 'mbus'"
      :depend="s.plugin === 'mbus' && s.mbus_filter === 'name'"
      :no-write="needToDelete('mbus')"
      :maxlines="10"
      rules="string"
      maxlength="64"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="mbus_filter_invert"
      :label="$t('Invert filter')"
      :help="$t('Inverts filter condition.')"
      :depend="s.plugin === 'mbus' && s.mbus_filter !== 'all'"
      :no-write="needToDelete('mbus')"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="mbus_segments"
      :label="$t('Segment count')"
      :help="$t('Max segment count in one JSON string sent to server.')"
      rules="irange(1,64)"
      initial="1"
      :required="s.enabled === '1' && s.plugin === 'mbus'"
      :depend="s.plugin === 'mbus'"
      :no-write="needToDelete('mbus')"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="mbus_object"
      :label="$t('Send as object')"
      :help="$t('Check to send JSON segment as object and not as array element.')"
      :depend="s.plugin === 'mbus' && s.mbus_segments === '1'"
      :no-write="needToDelete('mbus')"
    />
    <!-- OPCUA -->
    <vuci-form-item-select
      :uci-section="s"
      name="opcua_filter"
      :label="$t('Data filtering')"
      :options="filterOptions"
      :depend="s.plugin === 'opcua'"
      :no-write="needToDelete('opcua')"
    />
    <vuci-form-item-list
      :uci-section="s"
      name="opcua_filter_name"
      :label="$t('OPC UA value group name')"
      :help="$t('Filter data by defined OPC UA value group name.')"
      :depend="s.plugin === 'opcua' && s.opcua_filter === 'name'"
      :no-write="needToDelete('opcua')"
      :maxlines="10"
      :required="s.enabled === '1' && s.plugin === 'opcua' && s.opcua_filter === 'name'"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="opcua_filter_invert"
      :label="$t('Invert filter')"
      :help="$t('Inverts filter condition.')"
      :depend="s.plugin === 'opcua' && s.opcua_filter !== 'all'"
      :no-write="needToDelete('opcua')"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="opcua_segments"
      :label="$t('Segment count')"
      :help="$t('Max segment count in one JSON string sent to server.')"
      rules="irange(1,64)"
      initial="1"
      :required="s.enabled === '1' && s.plugin === 'opcua'"
      :depend="s.plugin === 'opcua'"
      :no-write="needToDelete('opcua')"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="opcua_object"
      :label="$t('Send as object')"
      :help="$t('Check to send JSON segment as object and not as array element.')"
      :depend="s.plugin === 'opcua' && s.opcua_segments === '1'"
      :no-write="needToDelete('opcua')"
    />
    <!-- Impulse counter -->
    <vuci-form-item-select
      :uci-section="s"
      name="impulse_counter_filter"
      :label="$t('Data filtering')"
      :options="impulseCounterOptions"
      :depend="s.plugin === 'impulse_counter'"
      :no-write="needToDelete('impulse_counter')"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="impulse_counter_filter_pin"
      :label="$t('Impulse counter pin')"
      :options="impulseCounterPinOptions"
      :help="$t('Filter data by defined impulse counter pin.')"
      multiple
      :depend="s.plugin === 'impulse_counter' && s.impulse_counter_filter === 'pin'"
      :required="s.enabled === '1' && s.plugin === 'impulse_counter' && s.impulse_counter_filter === 'pin'"
      :no-write="needToDelete('impulse_counter')"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="impulse_counter_filter_invert"
      :help="$t('Inverts filter condition.')"
      :label="$t('Invert filter')"
      :depend="s.plugin === 'impulse_counter' && s.impulse_counter_filter !== 'all'"
      :no-write="needToDelete('impulse_counter')"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="impulse_counter_segments"
      :label="$t('Max segment count')"
      :help="$t('Max segment count in one JSON string sent to server.')"
      rules="irange(1,64)"
      initial="1"
      :required="s.enabled === '1' && s.plugin === 'impulse_counter'"
      :depend="s.plugin === 'impulse_counter'"
      :no-write="needToDelete('impulse_counter')"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="impulse_counter_object"
      :label="$t('Send as object')"
      :help="$t('Check to send JSON segment as object and not as array element.')"
      :depend="s.plugin === 'impulse_counter' && s.impulse_counter_segments === '1'"
      :no-write="needToDelete('impulse_counter')"
    />
    <!-- WIFI -->
    <vuci-form-item-select
      :uci-section="s"
      name="wifi_filter"
      :label="$t('Data filtering')"
      :options="wifiFilterOptions"
      :depend="s.plugin === 'wifiscan'"
    />
    <vuci-form-item-list
      :uci-section="s"
      name="wifi_filter_name"
      :label="$t('Device hostname')"
      maxlength="64"
      :required="s.enabled === '1' && s.plugin === 'wifiscan' && s.wifi_filter === 'name'"
      :depend="s.plugin === 'wifiscan' && s.wifi_filter === 'name'"
      :maxlines="10"
    />
    <vuci-form-item-list
      :uci-section="s"
      name="wifi_filter_mac"
      :label="$t('MAC address')"
      rules="macaddr"
      placeholder="11:22:33:44:55:66"
      :required="s.enabled === '1' && s.plugin === 'wifiscan' && s.wifi_filter === 'mac'"
      :depend="s.plugin === 'wifiscan' && s.wifi_filter === 'mac'"
      :maxlines="10"
    />
    <vuci-form-item-list
      :uci-section="s"
      name="wifi_filter_signal"
      :label="$t('Signal strength')"
      rules="irange(-100, -1)"
      :required="s.enabled === '1' && s.plugin === 'wifiscan' && s.wifi_filter === 'signal'"
      :depend="s.plugin === 'wifiscan' && s.wifi_filter === 'signal'"
      :maxlines="10"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="wifi_segments"
      :label="$t('Segment count')"
      :help="$t('Max segment count in one JSON string sent to server.')"
      rules="irange(1,64)"
      initial="1"
      :required="s.enabled === '1' && s.plugin === 'wifiscan'"
      :depend="s.plugin === 'wifiscan'"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="wifi_object"
      :label="$t('Send as object')"
      :help="$t('Check to send JSON segment as object and not as array element.')"
      :depend="s.plugin === 'wifiscan' && s.wifi_segments === '1'"
    />
    <!-- IO -->
    <vuci-form-item-select
      :uci-section="s"
      name="io_name"
      :label="$t('I/O pin')"
      :help="$t('I/O pin name.')"
      :options="ioOptions"
      :depend="s.plugin === 'io'"
    />
    <!-- SMS -->
    <vuci-form-item-select
      :uci-section="s"
      name="sms_modem_id"
      :label="$t('Modem')"
      :help="$t('Specifies the modem for listening.')"
      :options="modems"
      :depend="s.plugin === 'sms' && modems.length > 1"
    />
    <!-- DLMS -->
    <vuci-form-item-select
      :uci-section="s"
      name="dlms_filter"
      :label="$t('Data filtering')"
      :options="filterOptions"
      :depend="s.plugin === 'dlms'"
      :no-write="needToDelete('dlms')"
    />
    <vuci-form-item-list
      :uci-section="s"
      name="dlms_filter_name"
      :label="$t('DLMS value group name')"
      maxlength="64"
      :required="s.enabled === '1' && s.plugin === 'dlms' && s.dlms_filter === 'name'"
      :depend="s.plugin === 'dlms' && s.dlms_filter === 'name'"
      :no-write="needToDelete('dlms')"
      :maxlines="10"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="dlms_filter_invert"
      :label="$t('Invert filter')"
      :help="$t('Inverts filter condition.')"
      :depend="s.plugin === 'dlms' && s.dlms_filter !== 'all'"
      :no-write="needToDelete('dlms')"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="dlms_segments"
      :label="$t('Segment count')"
      :help="$t('Max segment count in one JSON string sent to server.')"
      rules="irange(1,64)"
      initial="1"
      :required="s.enabled === '1' && s.plugin === 'dlms'"
      :depend="s.plugin === 'dlms'"
      :no-write="needToDelete('dlms')"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="dlms_object"
      :label="$t('Send as object')"
      :help="$t('Check to send JSON segment as object and not as array element.')"
      :depend="s.plugin === 'dlms' && s.dlms_segments === '1'"
      :no-write="needToDelete('dlms')"
    />
    <!-- IEC 60870-5 -->
    <vuci-form-item-select
      :uci-section="s"
      name="iec60870_filter"
      :label="$t('Data filtering')"
      :options="iec60870FilterOptions"
      :depend="s.plugin === 'iec60870'"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="iec60870_filter_client_id"
      :label="$t('Client')"
      :options="iec60870ClientOptions"
      :depend="s.plugin === 'iec60870' && s.iec60870_filter === 'client_id'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="iec60870_filter_information_object_address"
      :label="$t('Information object address')"
      :help="$t('Filter by information object address')"
      rules="irange(0, 16777215)"
      placeholder="1"
      required
      :depend="s.plugin === 'iec60870' && s.iec60870_filter === 'information_object_address'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="iec60870_filter_common_address"
      :label="$t('Common address')"
      :help="$t('Filter by common address')"
      rules="irange(1, 65535)"
      placeholder="1"
      required
      :depend="s.plugin === 'iec60870' && s.iec60870_filter === 'common_address'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="iec60870_segments"
      :label="$t('Segment count')"
      :help="$t('Max segment count in one JSON string sent to server. Use 0 for automatic segment count')"
      rules="irange(0,64)"
      initial="0"
      required
      :depend="s.plugin === 'iec60870'"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="format"
      :label="$t('Format type')"
      :help="$t('Type of data formatting.')"
      :options="formatTypeOptions"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="members"
      :label="$t('Values')"
      :help="$t('Select values based on the data input type. If no values are selected, all values will be included.')"
      :placeholder="$t('All values included')"
      :options="parameterOptions"
      :depend="s.format === 'json' && parameterOptions.length > 0"
      multiple
    />
    <tlt-inline-message
      v-show="s.format === 'json' && industrialPlugins().includes(s.plugin)"
      type="warning"
      :message="$t('JSON format type does not support binary data.')"
    />
    <vuci-form-item-text-area
      :uci-section="s"
      name="format_str"
      :label="$t('Format string')"
      :help="$t('Specifies custom format string.')"
      :placeholder="placeholder"
      maxlength="4096"
      :required="s.enabled === '1' && s.format === 'custom'"
      :depend="s.format === 'custom'"
    />
    <template v-if="s.format === 'custom'">
      <tlt-form-accordion
        v-if="formattedParameters.length > 0"
        name="string-list"
        :title="$t('string list')"
      >
        <tlt-form-model-item>
          <t-parameters class="w-full">
            <strong>{{ $t('String list') }}:</strong>
            <t-parameters-list>
              <t-parameters-list-item
                v-for="param in formattedParameters"
                :key="param.parameter"
                v-bind="param"
              />
            </t-parameters-list>
          </t-parameters>
        </tlt-form-model-item>
      </tlt-form-accordion>
      <tlt-form-accordion
        name="tag-expansion-list"
        :title="$t('tag expansion list')"
      >
        <tlt-form-model-item>
          <t-parameters class="w-full">
            <strong>{{ $t('Tag expansion list') }}:</strong>
            <t-parameters-list>
              <t-parameters-list-item
                v-for="param in tagExpansionParameters"
                :key="param.parameter"
                v-bind="param"
              />
            </t-parameters-list>
          </t-parameters>
        </tlt-form-model-item>
      </tlt-form-accordion>
    </template>
    <vuci-form-item-input
      :uci-section="s"
      name="na_str"
      :label="$t('Empty value')"
      :help="$t('A string which will be placed if any value cannot be received.')"
      initial="N/A"
      maxlength="64"
      :required="s.enabled === '1' && s.format === 'custom'"
      :depend="s.format === 'custom'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="delimiter"
      :label="$t('Delimiter')"
      :help="$t('Specifies delimiters for multiple data segments.')"
      initial=","
      placeholder=","
      :rules="'max_bytes(1)'"
      :required="s.enabled === '1' && s.format === 'custom'"
      :depend="s.format === 'custom'"
    />
    <vuci-form-item-button
      :uci-section="s"
      name="downloadExampleFormatLua"
      :label="$t('Lua format example script')"
      :text="$t('Download')"
      :depend="s.format === 'lua'"
      no-write
      @click="downloadExampleLua('/format/actions/download_example_format_lua', $t('example format lua'))"
    />
    <tlt-inline-message
      v-show="s.format === 'lua'"
      type="warning"
      :message="$t('Some data input types may not work correctly with the provided Lua format example script. Review and adapt the script as needed to ensure compatibility.')"
    />
    <vuci-form-item-upload
      :uci-section="s"
      name="format_script"
      :label="$t('Lua format script')"
      :depend="s.format === 'lua'"
      :readonly="$session.group !== 'root'"
      :required="s.enabled === '1' && s.format === 'lua'"
    >
      <template
        v-if="$session.group !== 'root'"
        #after-content="{ controlRef }"
      >
        <tlt-tooltip
          :target="() => controlRef"
          placement="bottom-start"
          fallback-placements="top-start"
          :content="$t('Current user is unauthorized to edit scripts.')"
        />
      </template>
    </vuci-form-item-upload>
    <vuci-form-item-button
      v-show="showButton"
      :uci-section="s"
      name="add"
      :readonly="inputAddReadOnly"
      :text="$t('+ New data input')"
      :has-label="false"
      type="text"
      :help="inputAddReadOnly ? $t('Only a total of %s data inputs can be created for each collection instance').format(limitData().max_inputs) : null"
      @click="self => $emit('add-input', self)"
    />
  </vuci-named-section>
</template>

<script>
import TltAlert from '@/components/Messenger/TltAlert.vue'
import { useCertificatesStore } from '@/stores/certificates'
import { useCertificateUtils } from '@/composables/useCertificateUtils'
import { normalizeFileName, getCertificateWarning } from '@/plugins/certificates'
export default {
  components: { TltAlert },
  inject: {
    inputOptions: {},
    modemList: {},
    industrialPlugins: {},
    collectionSection: {},
    ioData: {},
    iec60870Clients: {},
    editableSections: {
      default: {}
    },
    formatOptions: {},
    limitData: {},
    setSection: {
      default: () => {}
    },
    setUciData: {
      default: () => {}
    },
    downloadExampleLua: {
      default: () => {}
    },
    validateMqttServerAddress: {
      default: () => {}
    },
    updateCertificateWarnings: {
      default: () => {}
    },
    getCertificateUploadWarning: {
      default: () => {}
    }
  },
  props: {
    section: {
      type: Object,
      required: true
    },
    uciData: {
      type: Object,
      required: true
    },
    isAddSection: {
      type: Boolean,
      required: false
    },
    newInput: {
      type: Boolean,
      required: false
    },
    showButton: {
      type: Boolean,
      default: false
    }
  },
  emits: ['add-input'],
  setup() {
    const certificatesStore = useCertificatesStore()
    const { caOptions, certOptionsForNonRequired, keyOptionsNonTpm2ForNonRequired } = useCertificateUtils()
    return { certificatesStore, caOptions, certOptionsForNonRequired, keyOptionsNonTpm2ForNonRequired }
  },
  data() {
    return {
      tagExpansionParameters: [
        {
          description: this.$t('Non-extended tag usage'),
          parameter: '%tag%'
        },
        {
          description: this.$t('Default value'),
          parameter: '%{tag:-Default value}%'
        },
        {
          description: this.$t('Alternative value'),
          parameter: '%{tag:+Value}%'
        },
        {
          description: this.$t('Value offset and length'),
          parameter: ['%{tag:offset}%', '%{tag:offset:length}%']
        },
        {
          description: this.$t('Value length'),
          parameter: '%{tag@#}%'
        },
        {
          description: this.$t('Escape value'),
          parameter: '%{tag@E}%'
        },
        {
          description: this.$t('Convert first letter to uppercase'),
          parameter: ['%{tag@u}% ', '%{tag^}%', '%{tag^[letter to convert]}%']
        },
        {
          description: this.$t('Convert all letters to uppercase'),
          parameter: ['%{tag@U}%', '%{tag^^}%', '%{tag^^[letter to convert]}%']
        },
        {
          description: this.$t('Convert first letter to lowercase'),
          parameter: ['%{tag@l}%', '%{tag,}%', '%{tag,[letter to convert]}%']
        },
        {
          description: this.$t('Convert all letters to lowercase'),
          parameter: ['%{tag@L}%', '%{tag,,}%', '%{tag,,[letter to convert]}%']
        },
        {
          description: this.$t('Replace pattern with the value'),
          parameter: '%{tag/pattern/value}%'
        }
      ],
      pluginOptionTranslate: {
        base: [
          ['time', this.$t('Time now')],
          ['local_time', this.$t('Local time')],
          ['time_iso_8601', this.$t('Time (ISO 8601)')],
          ['fw', this.$t('Firmware version')],
          ['name', this.$t('The name of the sender')],
          ['id', this.$t('ID of the sender')]
        ],
        bluetooth: [
          ['timestamp', this.$t('Date (Linux timestamp)')],
          ['date', this.$t('Date (Day/Month/Year Hour:Minute:Second)')],
          ['date_iso_8601', this.$t('Date (ISO 8601)')],
          ['mac', this.$t('MAC address')],
          ['name', this.$t('Device name')],
          ['rssi', this.$t('RSSI')],
          ['data', this.$t('Device data (JSON object)')]
        ],
        gsm: [
          ['connstate', this.$t('Connection state')],
          ['psstate', this.$t('Package domain service state')],
          ['netstate', this.$t('Network link state')],
          ['imei', this.$t('IMEI')],
          ['iccid', this.$t('SIM ICCID')],
          ['model', this.$t('Model')],
          ['manuf', this.$t('Manufacturer')],
          ['serial', this.$t('Serial number')],
          ['revision', this.$t('Revision number')],
          ['imsi', this.$t('IMSI')],
          ['simstate', this.$t('SIM card state')],
          ['pinstate', this.$t('PIN state')],
          ['modemtime', this.$t('Operator station time (GMT)')],
          ['rssi', this.$t('RSSI')],
          ['rscp', this.$t('RSCP')],
          ['ecio', this.$t('EC/IO')],
          ['rsrp', this.$t('RSRP')],
          ['sinr', this.$t('SINR')],
          ['rsrq', this.$t('RSRQ')],
          ['cellid', this.$t('Cell ID')],
          ['operator', this.$t('Operator name')],
          ['opernum', this.$t('Operator number')],
          ['conntype', this.$t('Data carrier type')],
          ['temp', this.$t('Modem temperature')],
          ['pincount', this.$t('PIN/PUK count')],
          ['network', this.$t('Network information')],
          ['serving', this.$t('Serving cell information')],
          ['modem', this.$t('Modem ID')],
          ['ip', this.$t('Interface IP')],
          ['ipv6', this.$t('Interface IPV6')]
        ],
        mdcollect: [
          ['tx', this.$t('Total data transferred')],
          ['rx', this.$t('Total data received')]
        ],
        mnfinfo: [
          ['name', this.$t('Device name')],
          ['serial', this.$t('Serial number')],
          ['mac', this.$t('MAC address')],
          ['maceth', this.$t('WAN MAC address')],
          ['batch', this.$t('Batch')],
          ['hwver', this.$t('Hardware version')]
        ],
        modbus: [
          ['timestamp', this.$t('Date (Linux timestamp)')],
          ['date', this.$t('Date (Day/Month/Year Hour:Minute:Second)')],
          ['date_iso_8601', this.$t('Date (ISO 8601)')],
          ['bdate', this.$t('Binary Date (binary Linux timestamp, UINT32BE)')],
          ['server_id', this.$t('MODBUS server ID')],
          ['server_name', this.$t('MODBUS server name')],
          ['bserver_id', this.$t('MODBUS server ID (binary UINT8)')],
          ['ip', this.$t('MODBUS server IP')],
          ['name', this.$t('Request name')],
          ['addr', this.$t('Start register')],
          ['baddr', this.$t('Start register (binary UINT16BE)')],
          ['full_addr', this.$t('Full MODBUS register address')],
          ['data', this.$t('Register data (JSON object)')],
          ['raw_data', this.$t('Raw data')],
          ['size', this.$t('Data size')]
        ],
        modbus_alarm: [
          ['timestamp', this.$t('Date (Linux timestamp)')],
          ['alarm_id', this.$t('Alarm configuration ID')],
          ['server_id', this.$t('MODBUS server ID')],
          ['test_data', this.$t('Values to be compared against')],
          ['condition', this.$t('Condition for comparing values')],
          ['data', this.$t('Values from server that were checked')],
          ['register', this.$t('MODBUS register or coil number')]
        ],
        mqtt: [
          ['data', this.$t('MQTT message payload')],
          ['topic', this.$t('MQTT topic')],
          ['retain', this.$t('MQTT retain flag')]
        ],
        wifiscan: [
          ['timestamp', this.$t('Date (Linux timestamp)')],
          ['date', this.$t('Date (Day/Month/Year Hour:Minute:Second)')],
          ['date_iso_8601', this.$t('Date (ISO 8601)')],
          ['mac', this.$t('Wifi device MAC address')],
          ['host', this.$t('Wifi device hostname')],
          ['signal', this.$t('Signal strength')]
        ],
        dlms: [
          ['name', this.$t('DLMS value group name')],
          ['timestamp', this.$t('Date (Linux timestamp)')],
          ['date', this.$t('Date (Day/Month/Year Hour:Minute:Second)')],
          ['date_iso_8601', this.$t('Date (ISO 8601)')],
          ['bdate', this.$t('Binary Date (binary Linux timestamp, UINT32BE)')],
          ['size', this.$t('DLMS data size in bytes')],
          ['data', this.$t('DLMS value group data')]
        ],
        dnp3: [
          ['name', this.$t('Request name')],
          ['timestamp', this.$t('Date (Linux timestamp)')],
          ['date', this.$t('Date (Day/Month/Year Hour:Minute:Second)')],
          ['date_iso_8601', this.$t('Date (ISO 8601)')],
          ['q_bits', this.$t('Quality bits')],
          ['ip', this.$t('Outstation IP')],
          ['port', this.$t('Outstation Port')],
          ['address', this.$t('Outstation remote address')],
          ['group', this.$t('Data object group')],
          ['index', this.$t('Index')],
          ['data', this.$t('DNP3 data')]
        ],
        opcua: [
          ['name', this.$t('OPC UA value group name')],
          ['timestamp', this.$t('Date (Linux timestamp)')],
          ['date', this.$t('Date (Day/Month/Year Hour:Minute:Second)')],
          ['date_iso_8601', this.$t('Date (ISO 8601)')],
          ['bdate', this.$t('Binary Date (binary Linux timestamp, UINT32BE)')],
          ['size', this.$t('Data size in bytes')],
          ['data', this.$t('OPC UA value group data')]
        ],
        impulse_counter: [
          ['pin_name', this.$t('Impulse counter pin')],
          ['timestamp', this.$t('Date (Linux timestamp)')],
          ['date', this.$t('Date (Day/Month/Year Hour:Minute:Second)')],
          ['date_iso_8601', this.$t('Date (ISO 8601)')],
          ['count', this.$t('Impulse counter count')]
        ],
        mbus: [
          ['name', this.$t('M-Bus group name')],
          ['timestamp', this.$t('Date (Linux timestamp)')],
          ['date', this.$t('Date (Day/Month/Year Hour:Minute:Second)')],
          ['date_iso_8601', this.$t('Date (ISO 8601)')],
          ['bdate', this.$t('Binary Date (binary Linux timestamp, UINT32BE)')],
          ['size', this.$t('M-Bus data size in bytes')],
          ['data', this.$t('M-Bus group data')]
        ],
        io: [
          ['name', this.$t('I/O pin name')],
          ['type', this.$t('Pin type')],
          ['state', this.$t('Pin state')],
          ['custom_name', this.$t('I/O pin custom name')],
          ['value', this.$t('Floating point pin value for Analog input/current loop pins')]
        ],
        nflog: [
          ['in', this.$t('Output interface name')],
          ['out', this.$t('Input interface name')],
          ['smac', this.$t('Source MAC address')],
          ['dmac', this.$t('Destination MAC address')],
          ['uid', this.$t('UID of the user that has generated the packet')],
          ['gid', this.$t('GID of the user that has generated the packet')],
          ['time.sec', this.$t('Packet timestamp seconds')],
          ['time.usec', this.$t('Packet timestamp microseconds')],
          ['ip.src', this.$t('Source IP address')],
          ['ip.dst', this.$t('Destination IP address')],
          ['ip.len', this.$t('Total length of IP packet in bytes')],
          ['ip.tos', this.$t('Type Of Service')],
          ['ip.ttl', this.$t('Time To Live')],
          ['ip.id', this.$t('Unique ID for IP datagram')],
          ['ip.proto', this.$t('Protocol name')],
          ['tcp.sport', this.$t('Source port')],
          ['tcp.dport', this.$t('Destination port')],
          ['tcp.seq', this.$t('Receive Sequence number')],
          ['tcp.ack', this.$t('Same as the Receive Sequence number, but for the other end of the TCP connection')],
          ['tcp.window', this.$t('The TCP Receive Window size')],
          ['tcp.psh', this.$t('%s flag').format('PSH')],
          ['tcp.rst', this.$t('%s flag').format('RST')],
          ['tcp.syn', this.$t('%s flag').format('SYN')],
          ['tcp.fin', this.$t('%s flag').format('FIN')],
          ['tcp.urg', this.$t('The Urgent Pointer')],
          ['mark', this.$t('Packet mark')]
        ],
        sms: [
          ['index', this.$t('SMS index')],
          ['text', this.$t('SMS text')],
          ['sender', this.$t("Sender's phone number")],
          ['date', this.$t('SMS date')],
          ['timestamp', this.$t('SMS timestamp')],
          ['date_iso_8601', this.$t('Date (ISO 8601)')]
        ],
        gps: [
          ['latitude', this.$t('Latitude')],
          ['longitude', this.$t('Longitude')],
          ['altitude', this.$t('Altitude')],
          ['angle', this.$t('Angle')],
          ['speed', this.$t('Speed')],
          ['accuracy', this.$t('GPS accuracy')],
          ['satellites', this.$t('Number of satellites')],
          ['fix_status', this.$t('GPS fix status')],
          ['timestamp', this.$t('Timestamp')],
          ['date', this.$t('Date and time')],
          ['date_iso_8601', this.$t('Date (ISO 8601)')]
        ],
        iec60870: [
          ['id', this.$t('Identifier')],
          ['timestamp', this.$t('Date (Linux timestamp)')],
          ['date', this.$t('Date (Day/Month/Year Hour:Minute:Second)')],
          ['date_iso_8601', this.$t('Date in ISO 8601 format')],
          ['client_id', this.$t('Client configuration id')],
          ['client_name', this.$t('Client configuration name')],
          ['data_type', this.$t('Information object type')],
          ['name', this.$t('Information object name')],
          ['common_address', this.$t('Information object common address')],
          ['information_object_address', this.$t('Information object address')],
          ['cause_of_transmission', this.$t('Cause of transmission')],
          ['data', this.$t('Information object value')]
        ]
        // Funtionality which will be included in 7.6 fw
        // chilli: [
        //   ['enabled', this.$t('Hotspot instance enabled')],
        //   ['interfaces', this.$t('Hotspot networks')],
        //   ['users', this.$t('Connected users')]
        // ],
      },
      qosOptions: ['0', '1', '2'],
      tlsTypeOptions: [
        ['cert', this.$t('Certificate based')],
        ['psk', this.$t('Pre-Shared-Key based')]
      ],
      periodOptions: [
        ['day', this.$t('Day')],
        ['week', this.$t('Week')],
        ['month', this.$t('Month')]
      ],
      bluetoothOptions: [
        ['all', this.$t('All')],
        ['mac', this.$t('Device mac address')],
        ['name', this.$t('Device name')]
      ],
      modbusOptions: [
        ['all', this.$t('All')],
        ['ip', this.$t('Server IP address')],
        ['id', this.$t('Server ID')],
        ['name', this.$t('Request name')]
      ],
      modbusAlarmsOptions: [
        ['all', this.$t('All')],
        ['server_id', this.$t('Server ID')],
        ['alarm_id', this.$t('Alarm ID')],
        ['register', this.$t('Register number')]
      ],
      dnp3Options: [
        ['all', this.$t('All')],
        ['address', this.$t('Address')],
        ['ip', this.$t('IP')]
      ],
      filterOptions: [
        ['all', this.$t('All')],
        ['name', this.$t('Name')]
      ],
      iec60870FilterOptions: [
        ['all', this.$t('All')],
        ['client_id', this.$t('Client')],
        ['information_object_address', this.$t('Information object address')],
        ['common_address', this.$t('Common address')]
      ],
      impulseCounterOptions: [
        ['all', this.$t('All')],
        ['pin', this.$t('Pin Name')]
      ],
      wifiFilterOptions: [
        ['all', this.$t('All')],
        ['name', this.$t('Name')],
        ['mac', this.$t('MAC address')],
        ['signal', this.$t('Signal strength')]
      ],
      dnp3DatabaseOptions: [
        ['/tmp/dnp3.db', this.$t('RAM')],
        ['/usr/share/dnp3.db', this.$t('Flash')]
      ],
      placeholders: {
        modbus: '{"TS": "%timestamp%", "D": "%bdate%", "data": %data%}',
        bluetooth: '{"TS": "%timestamp%", "D": "%bdate%", "data": %data%}',
        wifiscan: '{"TS": "%timestamp%", "D": "%date%", "strength": %signal%}',
        dnp3: '{"TS": "%timestamp%", "D": "%date%", "group": %group%, "index": %index%, "data": %data%, "request name": %name%}',
        mbus: '{"TS": %timestamp%, "name": "%name%", "data": "%data%"}',
        opcua: '{"TS": %timestamp%, "name": "%name%", "data": "%data%"}',
        impulse_counter: '{"TS": %timestamp%, "pin_name": "%pin%", "count": %count%}',
        base: '{ TS: "%time%", name: "%name%", id: "%id%" }',
        iec60870: '{ TS: %timestamp%, name: "%name%", data: %data% }'
      },
      showGpsAlert: false
    }
  },
  computed: {
    impulseCounterPinOptions() {
      return this.ioData()
        .filter(input => input.type === 'gpio' && (input.direction === 'in' || !input.direction) && input.counter_support !== '0')
        .map(pin => [pin.id, pin.name_with_pins])
    },
    placeholder() {
      return this.placeholders[this.section.plugin] || ''
    },
    pluginOptions() {
      const collectionInputs = this.uciData.collection.find(collection => collection.id === this.collectionSection().id)
      const alreadyUsedPlugins = this.uciData.inputs.filter(input => collectionInputs.input.includes(input.id) && input.id !== this.section.id).map(input => input.plugin)
      return this.inputOptions()
        .plugins.filter(option => !(option.solo_collection && alreadyUsedPlugins.includes(option.name)))
        .map(option => [option.name, this.$dataSenderParameters.inputPluginTranslate()[option.name]])
    },
    parameterOptions() {
      return this.pluginOptionTranslate[this.inputSection.plugin] || []
    },
    formattedParameters() {
      return this.parameterOptions.map(([optionKey, description]) => ({ description, parameter: `%${optionKey}%` }))
    },
    inputAddReadOnly() {
      if (!this.isAddSection) return
      return this.editableSections().length >= this.limitData().max_inputs
    },
    inputSection() {
      return this.uciData.inputs.filter(s => s.id === this.section.id)[0]
    },
    simCount() {
      return this.$mobile.simCount(this.modemList())
    },
    formatTypeOptions() {
      return this.formatOptions().map(option => [option, this.$dataSenderParameters.formatTranslate()[option]])
    },
    modems() {
      return this.modemList().map(modem => [modem.id, modem.name])
    },
    ioOptions() {
      return this.ioData()
        .filter(io => ['dwi', 'acl', 'adc', 'relay', 'gpio'].includes(io.type))
        .map(io => [io.id, io.name_with_pins])
    },
    iec60870ClientOptions() {
      return this.iec60870Clients().map(client => [client.id, client.name || '-'])
    }
  },
  methods: {
    inputNameExists(val) {
      if (this.uciData.inputs.filter(o => o.name === val).length > 1) {
        return { isValid: false, message: this.$t("Instance '%s' already exists.").format(val) }
      }
      return { isValid: true }
    },
    needToDelete(plugin) {
      return !this.inputOptions()
        .plugins.map(option => option.name)
        .includes(plugin)
    },
    onPluginChange(_, option) {
      const parameterList = this.parameterOptions.map(([optionKey]) => optionKey)
      if (this.section.members) {
        this.setSection(section => {
          section.members = this.section.members.filter(member => parameterList.includes(member))
        })
      }
      this.showGpsAlert = false
      if (option === 'gps') {
        this.$axios
          .get('/api/gps/status')
          .then(({ data }) => {
            this.showGpsAlert = !data.uptime
          })
          .catch(() => {
            this.$message.error(this.$t('Failed to load GPS status data.'))
          })
      }
    },
    getCertificateWarning(certificatePath) {
      return getCertificateWarning(certificatePath, this.certificatesStore.generatedCertificates)
    },
    normalizeFileName(fileName) {
      return normalizeFileName(fileName)
    }
  }
}
</script>
