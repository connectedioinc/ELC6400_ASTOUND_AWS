<template>
  <vuci-named-section
    v-slot="{ s }"
    ref="section"
    :uci-data="uciData"
    :name="isAddSection ? section.id : sectionId"
    :title="$t('Server configuration')"
    :endpoints="[{ endpoint: `data_to_server/collections/${isAddSection ? sectionId : section.id}/servers/config` }]"
    :after-save="(_, res) => updateCertificateWarnings(res)"
    data-key="outputs"
  >
    <vuci-form-item-select
      :uci-section="s"
      name="plugin"
      :label="$t('Type')"
      :help="$t('Data server type.')"
      :options="pluginOptions"
    />
    <!-- HTTP -->
    <vuci-form-item-input
      :uci-section="s"
      name="http_host"
      :label="$t('Server address')"
      rules="url"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'http'"
    />
    <vuci-form-item-list
      :uci-section="s"
      name="http_header"
      :label="$t('HTTP headers')"
      :help="$t('Allows to add custom headers to the HTTP requests.')"
      :placeholder="$t('Content-Type: application/json')"
      rules="string"
      :depend="s.plugin === 'http'"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="http_tls"
      :label="$t('Enable secure connection')"
      :depend="s.plugin === 'http'"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="http_device_files"
      :label="$t('Certificate files from device')"
      :depend="certificatesStore.hasVuciAppCertificates && s.plugin === 'http' && s.http_tls === '1'"
    >
      <template #help>
        {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated') }}
        <router-link to="/system/admin/certificates">{{ $t('here') }}</router-link
        >.
      </template>
    </vuci-form-item-switch>
    <vuci-form-item-upload
      :uci-section="s"
      name="http_cafile"
      :label="$t('Certificate authority file')"
      max-size="16MB"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'http' && s.http_tls === '1' && s.http_device_files !== '1'"
      :warnings="(_, self) => getCertificateUploadWarning(self)"
    >
      <template #fileName="{ fileName }">
        {{ normalizeFileName(fileName) }}
      </template>
    </vuci-form-item-upload>
    <vuci-form-item-upload
      :uci-section="s"
      name="http_certfile"
      :label="$t('Client certificate')"
      max-size="16MB"
      :depend="s.plugin === 'http' && s.http_tls === '1' && s.http_device_files !== '1'"
      :warnings="(_, self) => getCertificateUploadWarning(self)"
    >
      <template #fileName="{ fileName }">
        {{ normalizeFileName(fileName) }}
      </template>
    </vuci-form-item-upload>
    <vuci-form-item-upload
      :uci-section="s"
      name="http_keyfile"
      :label="$t('Client private keyfile')"
      max-size="16MB"
      :depend="s.plugin === 'http' && s.http_tls === '1' && s.http_device_files !== '1'"
    >
      <template #fileName="{ fileName }">
        {{ normalizeFileName(fileName) }}
      </template>
    </vuci-form-item-upload>
    <vuci-form-item-select
      :uci-section="s"
      name="http_cafile"
      :label="$t('Certificate authority file')"
      :options="caOptions"
      :warnings="getCertificateWarning"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'http' && s.http_tls === '1' && s.http_device_files === '1'"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="http_certfile"
      :label="$t('Client certificate')"
      :options="certOptionsForNonRequired"
      :warnings="getCertificateWarning"
      :depend="s.plugin === 'http' && s.http_tls === '1' && s.http_device_files === '1'"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="http_keyfile"
      :label="$t('Client private keyfile')"
      :options="keyOptionsNonTpm2ForNonRequired"
      :depend="s.plugin === 'http' && s.http_tls === '1' && s.http_device_files === '1'"
    />
    <!-- MQTT -->
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_host"
      :label="$t('Server address')"
      :help="$t('Hostname or ip address of the broker to connect to.')"
      placeholder="www.example.com"
      :rules="['host', val => validateMqttServerAddress(val, section, uciData)]"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'mqtt'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_port"
      :label="$t('Port')"
      :help="$t('Port number.')"
      initial="1883"
      placeholder="1883"
      rules="port"
      :depend="s.plugin === 'mqtt'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_keepalive"
      :label="$t('Keepalive')"
      :help="$t('Keepalive time in seconds.')"
      initial="60"
      placeholder="60"
      rules="irange(1,640)"
      :depend="s.plugin === 'mqtt'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_topic"
      :label="$t('Topic')"
      :help="$t('MQTT topic to be used for publishing the data.')"
      :placeholder="$t('Topic')"
      maxlength="65535"
      rules="mqtt_client_id"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'mqtt'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_client_id"
      :label="$t('Client ID')"
      :help="$t('Client ID to send with the data. If empty, a random client ID will be generated.')"
      :placeholder="$t('Client ID')"
      rules="mqtt_client_id"
      maxlength="64"
      :depend="s.plugin === 'mqtt'"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="mqtt_qos"
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
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_msg_count"
      :label="$t('Failed message count')"
      :help="$t('How many MQTT messages should fail before reinitializing connection with broker. Value \'0\' does not count failed messages.')"
      initial="0"
      placeholder="0"
      rules="irange(0,2147483647)"
      :depend="s.plugin === 'mqtt'"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="mqtt_tls"
      :label="$t('Enable secure connection')"
      :depend="s.plugin === 'mqtt'"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="mqtt_tls_type"
      :label="$t('TLS type')"
      :help="$t('Choose TLS type.')"
      :options="tlsTypeOptions"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'mqtt' && s.mqtt_tls === '1'"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="mqtt_insecure"
      :label="$t('Allow insecure connection')"
      :help="$t('Allow not verifying server authentication.')"
      :depend="s.plugin === 'mqtt' && s.mqtt_tls === '1' && s.mqtt_tls_type === 'cert'"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="mqtt_device_files"
      :label="$t('Certificate files from device')"
      :depend="certificatesStore.hasVuciAppCertificates && s.plugin === 'mqtt' && s.mqtt_tls === '1' && s.mqtt_tls_type === 'cert'"
    >
      <template #help>
        {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated') }}
        <router-link to="/system/admin/certificates">{{ $t('here') }}</router-link
        >.
      </template>
    </vuci-form-item-switch>
    <vuci-form-item-upload
      :uci-section="s"
      name="mqtt_cafile"
      :label="$t('Certificate authority file')"
      max-size="16MB"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'mqtt' && s.mqtt_tls === '1' && s.mqtt_tls_type === 'cert' && s.mqtt_device_files !== '1'"
      :warnings="(_, self) => getCertificateUploadWarning(self)"
    >
      <template #fileName="{ fileName }">
        {{ normalizeFileName(fileName) }}
      </template>
    </vuci-form-item-upload>
    <vuci-form-item-upload
      :uci-section="s"
      name="mqtt_certfile"
      :label="$t('Client certificate')"
      max-size="16MB"
      :depend="s.plugin === 'mqtt' && s.mqtt_tls === '1' && s.mqtt_tls_type === 'cert' && s.mqtt_device_files !== '1'"
      :warnings="(_, self) => getCertificateUploadWarning(self)"
    >
      <template #fileName="{ fileName }">
        {{ normalizeFileName(fileName) }}
      </template>
    </vuci-form-item-upload>
    <vuci-form-item-upload
      :uci-section="s"
      name="mqtt_keyfile"
      :label="$t('Client private keyfile')"
      max-size="16MB"
      :depend="s.plugin === 'mqtt' && s.mqtt_tls === '1' && s.mqtt_tls_type === 'cert' && s.mqtt_device_files !== '1'"
    >
      <template #fileName="{ fileName }">
        {{ normalizeFileName(fileName) }}
      </template>
    </vuci-form-item-upload>
    <vuci-form-item-select
      :uci-section="s"
      name="mqtt_cafile"
      :label="$t('Certificate authority file')"
      :options="caOptions"
      :required="collectionSection.enabled === '1'"
      :warnings="getCertificateWarning"
      :depend="s.plugin === 'mqtt' && s.mqtt_tls === '1' && s.mqtt_tls_type === 'cert' && s.mqtt_device_files === '1'"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="mqtt_certfile"
      :label="$t('Client certificate')"
      :options="certOptionsForNonRequired"
      :warnings="getCertificateWarning"
      :depend="s.plugin === 'mqtt' && s.mqtt_tls === '1' && s.mqtt_tls_type === 'cert' && s.mqtt_device_files === '1'"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="mqtt_keyfile"
      :label="$t('Client private keyfile')"
      :options="keyOptionsNonTpm2ForNonRequired"
      :depend="s.plugin === 'mqtt' && s.mqtt_tls === '1' && s.mqtt_tls_type === 'cert' && s.mqtt_device_files === '1'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_psk"
      :label="$t('Pre-Shared-Key')"
      :help="$t('The pre-shared-key in hex format with no leading “0x”.')"
      maxlength="128"
      rules="hexstring"
      :required="collectionSection.enabled === '1'"
      password
      sensitive
      :depend="s.plugin === 'mqtt' && s.mqtt_tls === '1' && s.mqtt_tls_type === 'psk'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_identity"
      :label="$t('Identity')"
      :help="$t('The identity of this client.')"
      maxlength="128"
      rules="uciname"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'mqtt' && s.mqtt_tls === '1' && s.mqtt_tls_type === 'psk'"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="mqtt_use_credentials"
      :label="$t('Use credentials')"
      :help="$t('Enables use of username and password for authentication.')"
      :depend="s.plugin === 'mqtt'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_username"
      :label="$t('Username')"
      :help="$t('Username for MQTT authentication.')"
      rules="credentials_validate"
      maxlength="512"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'mqtt' && s.mqtt_use_credentials === '1'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="mqtt_password"
      :label="$t('Password')"
      :help="$t('Password for MQTT authentication.')"
      rules="credentials_validate"
      maxlength="512"
      password
      sensitive
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'mqtt' && s.mqtt_use_credentials === '1'"
    />
    <!-- FTP -->
    <vuci-form-item-input
      :uci-section="s"
      name="ftp_dir"
      placeholder="/path/to/"
      :label="$t('The directory of the file')"
      :help="$t('Remote FTP directory to upload file to.')"
      :depend="s.plugin === 'ftp'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="ftp_host"
      placeholder="www.example.com"
      :label="$t('Host')"
      :help="$t('The domain name or IP address of the server.')"
      rules="host"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'ftp'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="ftp_port"
      :label="$t('Port')"
      :help="$t('The TCP/IP port of the server.')"
      rules="port"
      initial="21"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'ftp'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="ftp_username"
      :label="$t('Username')"
      :help="$t('The username of the FTP server.')"
      rules="credentials_validate('allow-space')"
      :depend="s.plugin === 'ftp'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="ftp_password"
      :label="$t('Password')"
      :help="$t('The password of the FTP server.')"
      rules="credentials_validate"
      maxlength="512"
      password
      sensitive
      :depend="s.plugin === 'ftp'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="ftp_file_name"
      :label="$t('Extra prefix to file name')"
      :help="$t('Extra information to be added to file name.')"
      placeholder="prefix"
      :depend="s.plugin === 'ftp'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="ftp_buff_size"
      :label="$t('Buffer size')"
      :help="$t('The size of the buffer to be used for uploading to FTP server.')"
      rules="irange(1,10485760)"
      initial="1024"
      :depend="s.plugin === 'ftp'"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="ftp_overflow"
      :label="$t('Overflow')"
      :help="$t('Upload file to FTP server if buffer overflowed.')"
      :depend="s.plugin === 'ftp'"
      initial="1"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="ftp_mode"
      :label="$t('Mode')"
      :help="$t('The schedule mode to be used for uploading to FTP server.')"
      :depend="s.plugin === 'ftp'"
      initial="interval"
      :options="modeOptions"
    />
    <vuci-form-item-input
      ref="ftp_interval"
      :uci-section="s"
      name="ftp_interval"
      :label="$t('Interval')"
      :help="$t('Upload files to server every x seconds.')"
      rules="irange(1,3600)"
      initial="120"
      :depend="s.plugin === 'ftp' && s.ftp_mode === 'interval'"
      :warnings="getIntervalFtpWarning"
      @change="onFtpIntervalChange"
    />
    <vuci-form-item-select
      :uci-section="s"
      :label="$t('Minute')"
      :help="$t('Uploading will be performed on this specific minute only.')"
      :options="minuteOpts"
      name="ftp_minute"
      rules="irange(-1,59)"
      initial="-1"
      :depend="s.plugin === 'ftp' && s.ftp_mode === 'fixed'"
    />
    <vuci-form-item-select
      :uci-section="s"
      :label="$t('Hour')"
      :help="$t('Uploading will be performed on this specific hour only.')"
      :options="hourOpts"
      name="ftp_hour"
      rules="irange(-1,23)"
      initial="-1"
      :depend="s.plugin === 'ftp' && s.ftp_mode === 'fixed'"
    />
    <vuci-form-item-select
      :uci-section="s"
      :label="$t('Day')"
      :help="$t('Uploading will be performed on this day only.')"
      :options="dayOpts"
      name="ftp_day"
      :rules="validateFtpDay"
      initial="-1"
      :depend="s.plugin === 'ftp' && s.ftp_mode === 'fixed'"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="ftp_cwd"
      :label="$t('Directory traversing method')"
      :help="$t('Directory traversing method for FTP (multicwd, nocwd, cwd).')"
      initial="multicwd"
      :depend="s.plugin === 'ftp'"
      :options="traversingOptions"
    />
    <!-- Lua -->
    <vuci-form-item-button
      :uci-section="s"
      name="downloadExamplepOutputLua"
      :label="$t('Lua data example script')"
      :text="$t('Download')"
      :depend="s.plugin === 'lua'"
      no-write
      @click="downloadExampleLua('/servers/actions/download_example_output_lua', $t('output example lua'))"
    />
    <vuci-form-item-upload
      :uci-section="s"
      name="lua_out_script"
      :label="$t('Lua script')"
      :help="$t('Path to the lua script.')"
      :depend="s.plugin === 'lua'"
      max-size="16MB"
      :required="collectionSection.enabled === '1'"
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
    <!-- SMS -->
    <vuci-form-item-select
      :uci-section="s"
      name="sms_recipient_format"
      :label="$t('Recipients')"
      :help="$t('You can choose to add a single number or use a phone group list.')"
      :depend="s.plugin === 'sms'"
      initial="single"
      :options="recipientOptions"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="sms_phone"
      :label="$t('Recipient\'s phone number')"
      :help="$t('To whom the message will be sent. The number must be specified in full format, country code included. e.g., +37000000000.')"
      rules="phonedigit"
      placeholder="+37000000000"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'sms' && s.sms_recipient_format === 'single'"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="sms_group"
      :label="$t('Phone group')"
      :options="phoneGroups"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'sms' && s.sms_recipient_format === 'group'"
    >
      <template #help>
        {{ $t("Recipient's phone number users group. Configure it") }}
        <router-link to="/system/admin/group/phone"> {{ $t('here') }} </router-link>.
      </template>
    </vuci-form-item-select>
    <vuci-form-item-select
      :uci-section="s"
      name="sms_modem_id"
      :label="$t('Modem')"
      :help="$t('Specifies the modem for SMS sending.')"
      :options="modems"
      :depend="s.plugin === 'sms' && modems.length > 1"
    />
    <!-- SMTP -->
    <vuci-form-item-input
      :uci-section="s"
      name="smtp_subject"
      :label="$t('Subject')"
      :help="$t('Subject of an email.')"
      rules="subject_rule"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'smtp'"
    />
    <vuci-form-item-list
      :uci-section="s"
      name="smtp_recipients"
      :label="$t('Recipient\'s email address')"
      rules="email"
      placeholder="mail@domain.com"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'smtp'"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="smtp_account"
      :label="$t('Email account')"
      :placeholder="$t('No email accounts created')"
      :options="emailUsers"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'smtp'"
    >
      <template #help>
        {{ $t("Sender's email configuration. Configure email account") }}
        <router-link to="/system/admin/group/email">{{ $t('here') }}</router-link
        >.
      </template>
    </vuci-form-item-select>
    <!-- Socket -->
    <vuci-form-item-input
      :uci-section="s"
      name="soc_address"
      placeholder="www.example.com"
      :label="$t('Server address')"
      :help="$t('Socket\'s server address.')"
      rules="host"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'socket'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="soc_port"
      placeholder="22"
      :label="$t('Server port')"
      :help="$t('Socket\'s server port.')"
      rules="port"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'socket'"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="soc_udp"
      label="UDP"
      :help="$t('Use UDP as the protocol.')"
      :depend="s.plugin === 'socket'"
      initial="0"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="soc_timeout"
      :label="$t('Timeout')"
      :help="$t('Specifies the receiving or sending data timeout.')"
      initial="10"
      placeholder="10"
      rules="irange(0,120)"
      :depend="s.plugin === 'socket'"
    />
    <!-- Funtionality which will be included in 7.6 fw -->
    <!-- Telegram -->
    <!-- <vuci-form-item-input
      :uci-section="s"
      name="telegram_chat_id"
      :label="$t('Telegram chat id')"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'telegram'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="telegram_token"
      :label="$t('Telegram bot token')"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'telegram'"
    />
    <vuci-form-item-switch
      :uci-section="s"
      name="telegram_notifications"
      :label="$t('Notify user')"
      :depend="s.plugin === 'telegram'"
    /> -->
    <!-- File Path -->
    <!-- <vuci-form-item-input
      :uci-section="s"
      name="file_path"
      :label="$t('File name')"
      :required="collectionSection.enabled === '1'"
      :depend="s.plugin === 'file'"
    />
    <vuci-form-item-input
      :uci-section="s"
      name="file_size"
      :label="$t('File size')"
      :help="$t('Maximum file size in bytes.')"
      rules="irange(1,2097152)"
      :depend="s.plugin === 'file'"
    /> -->
    <!-- Azure -->
    <vuci-form-item-select
      :uci-section="s"
      name="azure_configuration_type"
      :label="$t('Configuration type')"
      :depend="s.plugin === 'azure'"
      :options="azureConfigurationType"
      :initial="initialAzureConfigurationType"
      :no-write="needToDelete('azure')"
    />
    <vuci-form-item-select
      :uci-section="s"
      name="azure_connection_type"
      :label="$t('Connection type')"
      :help="$t('Connection type to an existing IoT Hub.')"
      :depend="s.plugin === 'azure' && s.azure_configuration_type === 'unique'"
      :options="azureTypeOptions"
      :no-write="needToDelete('azure')"
    />
    <vuci-form-item-input
      :uci-section="s"
      :label="$t('Connection String')"
      :help="$t('Connection string based on primary key used in API calls which allows device to communicate with IoT Hub.')"
      name="azure_connection_string"
      rules="string"
      maxlength="4096"
      :depend="s.plugin === 'azure' && s.azure_connection_type === 'iothub' && s.azure_configuration_type === 'unique'"
      :no-write="needToDelete('azure')"
      :required="collectionSection.enabled === '1'"
    />
    <vuci-form-item-select
      :uci-section="s"
      :label="$t('Azure IoT Hub instance')"
      name="azure_section_name"
      :options="azurePlugAndPlaySectionNames"
      :depend="s.plugin === 'azure' && s.azure_configuration_type === 'existing'"
      :no-write="needToDelete('azure')"
      :required="collectionSection.enabled === '1'"
    />
    <vuci-form-item-input
      :uci-section="s"
      :label="$t('ID Scope')"
      :help="$t('Unique identifier that is assigned to an Azure IoT Hub during its creation and is used to uniquely identify the specific provisioning service the device will register through.')"
      name="azure_id_scope"
      rules="string"
      placeholder="0ne00000000"
      maxlength="100"
      :depend="s.plugin === 'azure' && s.azure_connection_type === 'provisioning' && s.azure_configuration_type === 'unique'"
      :no-write="needToDelete('azure')"
      :required="collectionSection.enabled === '1'"
    />
    <vuci-form-item-input
      :uci-section="s"
      :label="$t('Registration ID')"
      :help="
        $t(
          'The registration ID is used to uniquely identify a device registration with the Device Provisioning Service. Registration ID is the X.509 certificate common name (CN) field of the individual device\'s certificate'
        )
      "
      name="azure_registration_id"
      rules="string"
      maxlength="64"
      :depend="s.plugin === 'azure' && s.azure_connection_type === 'provisioning' && s.azure_configuration_type === 'unique'"
      :no-write="needToDelete('azure')"
      :required="collectionSection.enabled === '1'"
    />
    <vuci-form-item-input
      :uci-section="s"
      :label="$t('Global Device Endpoint')"
      :help="$t('Destination for messages sent by IoT devices to the Azure IoT Hub (will default to global.azure-devices-provisioning.net if not set).')"
      name="azure_global_prov_uri"
      rules="url"
      :placeholder="$t('global.azure-devices-provisioning.net')"
      initial="global.azure-devices-provisioning.net"
      :depend="s.plugin === 'azure' && s.azure_connection_type === 'provisioning' && s.azure_configuration_type === 'unique'"
      :no-write="needToDelete('azure')"
      :required="collectionSection.enabled === '1'"
    />
    <vuci-form-item-select
      :uci-section="s"
      :help="$t('Method used to confirm a device\'s identity in Device Provisioning Service.')"
      :label="$t('Attestation mechanism')"
      name="azure_attestation_mechanism"
      :options="attestationType"
      :depend="s.plugin === 'azure' && s.azure_connection_type === 'provisioning'"
      :no-write="needToDelete('azure')"
    />
    <vuci-form-item-input
      :uci-section="s"
      :label="$t('Symmetric Key')"
      :help="$t('The derived device key from the DPS Primary Key.')"
      name="azure_symmetric_key"
      maxlength="128"
      rules="string"
      :depend="s.plugin === 'azure' && s.azure_connection_type === 'provisioning' && s.azure_attestation_mechanism === 'symmetric_key'"
      :no-write="needToDelete('azure')"
      :required="collectionSection.enabled === '1'"
    />
    <vuci-form-item-upload
      :uci-section="s"
      name="azure_x509certificate"
      :label="$t('X.509 Certificate')"
      :help="$t('Upload the &quot;leaf&quot; certificate file.')"
      :depend="s.plugin === 'azure' && s.azure_connection_type === 'provisioning' && s.azure_attestation_mechanism === 'x509_certificate' && s.azure_device_files !== '1'"
      :no-write="needToDelete('azure')"
      max-size="16MB"
      :required="collectionSection.enabled === '1'"
    />
    <vuci-form-item-upload
      :uci-section="s"
      name="azure_x509privatekey"
      :label="$t('X.509 Private Key')"
      :help="$t('Upload the &quot;leaf&quot; key file.')"
      :depend="s.plugin === 'azure' && s.azure_connection_type === 'provisioning' && s.azure_attestation_mechanism === 'x509_certificate' && s.azure_device_files !== '1'"
      :no-write="needToDelete('azure')"
      max-size="16MB"
      :required="collectionSection.enabled === '1'"
    />
  </vuci-named-section>
</template>

<script>
import { useCertificatesStore } from '@/stores/certificates'
import { useCertificateUtils } from '@/composables/useCertificateUtils'
import { normalizeFileName, getCertificateWarning } from '@/plugins/certificates'
import { formBus } from '@ui-core/vuci-form/src/form-bus'
export default {
  // Funtionality which will be included in 7.6 fw
  inject: [
    'outputOptions',
    'modemList',
    'azureSections',
    'warningMessages',
    'setWarningMessages',
    'phoneGroupList',
    'emailUserList',
    'downloadExampleLua',
    'validateMqttServerAddress',
    'updateCertificateWarnings',
    'getCertificateUploadWarning'
  ],
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
    }
  },
  setup() {
    const certificatesStore = useCertificatesStore()
    const { caOptions, certOptionsForNonRequired, keyOptionsNonTpm2ForNonRequired } = useCertificateUtils()
    return { certificatesStore, caOptions, certOptionsForNonRequired, keyOptionsNonTpm2ForNonRequired }
  },
  data() {
    return {
      qosOptions: ['0', '1', '2'],
      tlsTypeOptions: [
        ['cert', this.$t('Certificate based')],
        ['psk', this.$t('Pre-Shared-Key based')]
      ],
      azureTypeOptions: [
        ['iothub', this.$t('Shared Access Signature (SAS) key')],
        ['provisioning', this.$t('Device Provisioning Service (DPS)')]
      ],
      azureConfigurationType: [
        ['unique', this.$t('Unique Azure Iot Hub configuration')],
        ['existing', this.$t('Existing Azure Iot Hub configuration')]
      ],
      attestationType: [
        ['x509_certificate', this.$t('X.509 Certificates')],
        ['symmetric_key', this.$t('Symmetric Key')]
      ],
      modeOptions: [
        ['interval', this.$t('Interval')],
        ['fixed', this.$t('Fixed')]
      ],
      traversingOptions: [
        ['nocwd', this.$t('No CWD')],
        ['cwd', this.$t('Single CWD')],
        ['multicwd', this.$t('Multi CWD')]
      ],
      recipientOptions: [
        ['single', this.$t('Single')],
        ['group', this.$t('Group')]
      ]
      // Funtionality which will be included in 7.6 fw
      // familyOptions: [
      //   ['ipv4', this.$t('IPv4')],
      //   ['ipv6', this.$t('IPv6')],
      //   ['unix', this.$t('UNIX')]
      // ],
    }
  },
  computed: {
    pluginOptions() {
      return this.outputOptions().plugins.map(option => [option.name, this.$dataSenderParameters.outputPluginTranslate()[option.name]])
    },
    sectionData() {
      return this.uciData.outputs.find(section => section.id === (this.isAddSection ? this.section.id : this.sectionId))
    },
    collectionSection() {
      return this.uciData.collection.find(section => section.output === (this.isAddSection ? this.section.id : this.sectionId))
    },
    sectionId() {
      return this.uciData?.[this.isAddSection ? 'collection' : 'outputs']?.find(section => (this.isAddSection ? this.section.id === section.output : section.id === this.section.output)).id
    },
    azurePlugAndPlaySectionNames() {
      return this.azureSections()
        .filter(s => s.name && s?.enabled === '1')
        .map(option => [option.name, option.name])
    },
    initialAzureConfigurationType() {
      return this.azurePlugAndPlaySectionNames.length > 0 ? 'existing' : 'unique'
    },
    modems() {
      return this.modemList().map(modem => [modem.id, modem.name])
    },
    phoneGroups() {
      return this.phoneGroupList().map(group => group.name)
    },
    emailUsers() {
      return this.emailUserList().map(group => group.name)
    },
    dayOpts() {
      const options = Array.from({ length: 31 }, (_, i) => `${i + 1}`)
      options.unshift(['-1', this.$t('Every day')])
      return options
    },
    hourOpts() {
      const options = Array.from({ length: 24 }, (_, i) => `${i}`)
      options.unshift(['-1', this.$t('Every hour')])
      return options
    },
    minuteOpts() {
      const options = Array.from({ length: 60 }, (_, i) => `${i}`)
      options.unshift(['-1', this.$t('Every minute')])
      return options
    }
  },
  mounted() {
    formBus.on('collection-period-change', this.ftpIntervalCheckWarnings)
  },
  unmounted() {
    formBus.off('collection-period-change', this.ftpIntervalCheckWarnings)
  },
  methods: {
    needToDelete(plugin) {
      return !this.outputOptions()
        .plugins.map(option => option.name)
        .includes(plugin)
    },
    validateFtpDay(val) {
      this.$VuciValidator.value = val
      const res = this.$VuciValidator.irange(1, 31)
      return { isValid: res.isValid || val === '-1', message: this.$t('Value must be an integer and range of the value must be from 1 to 31 or value should be equal to -1.') }
    },
    getIntervalFtpWarning(value) {
      return (
        this.sectionData.plugin === 'ftp' &&
        parseInt(this.collectionSection.period) > parseInt(value) &&
        this.$t('If the interval is shorter than the period, it may cause errors during data collecting.')
      )
    },
    ftpIntervalCheckWarnings() {
      this.$refs.ftp_interval?.checkWarnings()
    },
    onFtpIntervalChange() {
      formBus.emit('output-ftp-interval-change')
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
