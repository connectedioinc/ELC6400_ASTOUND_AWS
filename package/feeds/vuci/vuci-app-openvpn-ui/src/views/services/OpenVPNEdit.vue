<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="vpnData"
    config="openvpn"
    editing
    :after-load="afterLoad"
    :extra-load="extraLoad"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      data-key="openVpn"
      :endpoints="[{ endpoint: 'openvpn/config' }]"
      :name="section.id"
      :exception-options="['type']"
      :error-handlers="{ edit: handleEditErrors }"
      :after-save="afterSave"
    >
      <tlt-card :title="$utils.getModalTitle($t('general'), section.name)">
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable configuration')"
          :help="$t('Enable current configuration.')"
          name="enable"
        />
        <tlt-inline-message
          v-show="maxServerReached && s.type !== 'server'"
          type="info"
          :message="$t('Maximum number of OpenVPN server instances has been reached.')"
        />
        <vuci-form-item-radio-group
          :uci-section="s"
          :label="$t('Role')"
          :help="$t('Choose a role for OpenVPN isntance.')"
          name="type"
          :options="selectedRole"
          @change="(_, value) => s.configuration === 'external' && value === 'server' && (s.configuration = 'manual')"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Name')"
          :help="$t('Name of the OpenVPN instance.')"
          name="name"
          maxlength="64"
          required
          :rules="['fieldvalidation(\'^[a-zA-Z0-9_ ]+$\')', () => $utils.validateNoDuplicates(uciData.openVpn, 'name', s.name, $t('name'))]"
        />
        <vuci-form-item-radio-group
          :uci-section="s"
          :label="$t('Configuration type')"
          :help="$t('Choose configuration type.')"
          name="configuration"
          initial="manual"
          :options="selectedConfiguration.filter(t => (s.type === 'server' ? t.value !== 'external' : t))"
          @change="
            () => {
              if (s.configuration === 'custom') {
                s.keepalive = ''
                s.port = ''
              }
            }
          "
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('VPN providers')"
          :help="$t('Choose from a list of available VPN providers.')"
          :options="providerOptions"
          name="external_service"
          :depend="s.configuration === 'external' && s.type === 'client'"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('VPN servers')"
          :help="$t('Choose from a list of available VPN servers.')"
          :options="externalServers"
          name="server_list"
          :depend="s.configuration === 'external' && s.type === 'client'"
        />
        <vuci-form-item-list
          :uci-section="s"
          :label="$t('Remote host/IP address')"
          :help="$t('IP address or domain name of the OpenVPN server.')"
          name="remote"
          rules="host"
          placeholder="0.0.0.0"
          :depend="s.type === 'client' && s.server_list === 'custom'"
          :required="s.enable === '1' && s.configuration === 'manual'"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Username')"
          :help="$t('VPN client username.')"
          name="user"
          placeholder="User"
          rules="credentials_validate"
          maxlength="512"
          :depend="s.configuration === 'external' && s.type === 'client'"
          force-write
          :required="((s.auth_mode === 'tls/pass' || s.auth_mode === 'pass') && s.enable === '1' && s.configuration === 'manual') || s.configuration === 'external'"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Password')"
          :help="$t('VPN client password.')"
          name="pass"
          placeholder="Password"
          :required="((s.auth_mode === 'tls/pass' || s.auth_mode === 'pass') && s.enable === '1' && s.configuration === 'manual') || s.configuration === 'external'"
          password
          sensitive
          rules="credentials_validate"
          maxlength="512"
          :depend="s.configuration === 'external' && s.type === 'client'"
        />
        <vuci-form-item-upload
          ref="customUpload"
          :uci-section="s"
          name="config"
          :label="$t('OpenVPN configuration file')"
          :help="$t('This will overwrite your current configuration.')"
          max-size="16MB"
          :depend="s.configuration === 'custom'"
          :required="s.enable === '1' && s.configuration === 'custom'"
          @change="configUploaded = false"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable parsing')"
          :help="$t('By enabling parsing, you can modify the configuration in the future.')"
          name="parse"
          :depend="s.configuration === 'custom' && !!s.config"
        />
        <vuci-form-item-radio-group
          v-show="s.configuration === 'manual' || (s.parse === '1' && s.config_parsed === '1' && configUploaded)"
          :uci-section="s"
          :label="$t('Authentication')"
          :help="$t('Choose a method to authenticate your OpenVPN network.')"
          name="auth_mode"
          initial="tls"
          :options="selectedAuthMode"
          @change="(_, value) => value === 'skey' && (s.topology = 'net30')"
        />
        <tlt-form-accordion
          v-show="s.configuration === 'manual' || (s.parse === '1' && s.config_parsed === '1' && configUploaded)"
          :name="`${s.id}_general_section`"
        >
          <vuci-form-item-radio-group
            :uci-section="s"
            :label="$t('TUN/TAP')"
            :help="$t('Virtual VPN interface type.')"
            name="dev"
            initial="tun"
            :options="selectedInterfaceType"
          />
          <vuci-form-item-radio-group
            v-show="s.dev === 'tun'"
            :uci-section="s"
            :label="$t('Topology')"
            :help="$t('Virtual addressing topology determines how IP addressing and routing are handled between the server and clients.')"
            name="topology"
            initial="net30"
            :options="topologyOptions.filter(i => (s.auth_mode === 'skey' ? i.value !== 'subnet' : i))"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Protocol')"
            :help="$t('The transport protocol used for the connection. Note: UDP and TCP do not support IPv6 connections, use UDP6 or TCP6 instead.')"
            :options="protoOptions"
            name="proto"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Port')"
            :help="$t('TCP/UDP port for both local and remote endpoints. Make sure that this port is open in the firewall.')"
            name="port"
            rules="port"
            placeholder="1194"
          />
          <vuci-form-item-list
            :uci-section="s"
            :label="$t('Push option')"
            :help="$t('Push a configuration option back to the client for remote execution.')"
            name="push"
            placeholder="route 192.168.1.0 255.255.255.0"
            rules="string"
            :depend="isOneOf(s.auth_mode, ['tls', 'tls/pass', 'pass']) && s.type === 'server' && s.dev === 'tun'"
          />
          <vuci-form-item-list
            :uci-section="s"
            :label="$t('Extra options')"
            :help="$t('Enter any additional options to be added to the OpenVPN configuration (e.g., persist-key). If an option is already in use, the new option will take precedence.')"
            name="extra"
            :rules="extraOptionsRule"
            :validator-hint="extraOptionsHint"
          />
        </tlt-form-accordion>
      </tlt-card>
      <tlt-card
        v-show="s.configuration === 'manual' || (s.parse === '1' && s.config_parsed === '1' && configUploaded)"
        :title="$utils.getModalTitle($t('network'))"
      >
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Virtual network IP address')"
          :help="$t('IP address used for the virtual network.')"
          name="server_ip"
          :rules="[
            'ip4addr',
            v => pairOfFieldsRequired({ name: $t('Virtual network IP address'), value: v }, { name: $t('Virtual network netmask'), value: s.server_netmask }),
            validateRemotePrivateNetwork
          ]"
          placeholder="172.16.1.0"
          :depend="s.type === 'server' && s.dev === 'tun' && isOneOf(s.auth_mode, ['tls', 'tls/pass', 'pass'])"
          @change="updateValidations"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Virtual network netmask')"
          :help="$t('Subnet mask used for the virtual network.')"
          :rules="[
            'netmask',
            v => netmaskValidate(v, s.server_ip),
            v => pairOfFieldsRequired({ name: $t('Virtual network IP address'), value: s.server_ip }, { name: $t('Virtual network netmask'), value: v })
          ]"
          name="server_netmask"
          allow-create
          :options="netmaskOptions"
          :depend="s.type === 'server' && s.dev === 'tun' && isOneOf(s.auth_mode, ['tls', 'tls/pass', 'pass'])"
          @change="updateValidations"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Local tunnel endpoint IP')"
          :help="$t('IP address of the virtual local network interface.')"
          name="local_ip"
          :rules="[
            'ip4addr',
            v => pairOfFieldsRequired({ name: $t('Local tunnel endpoint IP'), value: v }, { name: $t('Remote tunnel endpoint IP'), value: s.remote_ip }),
            validateRemotePrivateNetwork
          ]"
          :placeholder="s.type === 'server' ? '172.16.0.1' : '172.16.0.2'"
          :depend="s.auth_mode === 'skey' && s.dev === 'tun'"
          @change="updateValidations"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Remote tunnel endpoint IP')"
          :help="$t('IP address of the virtual remote network interface.')"
          name="remote_ip"
          :rules="['ip4addr', v => pairOfFieldsRequired({ name: $t('Remote tunnel endpoint IP'), value: v }, { name: $t('Local tunnel endpoint IP'), value: s.local_ip })]"
          :placeholder="s.type === 'server' ? '172.16.0.2' : '172.16.0.1'"
          :depend="s.auth_mode === 'skey' && s.dev === 'tun'"
          @change="updateValidations"
        />
        <vuci-form-item-list
          :uci-section="s"
          :label="$t('Remote host/IP address')"
          :help="$t('IP address or domain name of the OpenVPN server.')"
          name="remote"
          rules="host"
          placeholder="0.0.0.0"
          :depend="s.type === 'client'"
          :required="s.enable === '1' && s.configuration === 'manual'"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Bridge')"
          :help="$t('Assign a TAP interface to a bridge.')"
          :options="bridgeInterfaces.concat(bridge)"
          name="to_bridge"
          :depend="s.dev === 'tap'"
        />
        <tlt-form-accordion :name="`${s.id}_network_section`">
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Assign IP start')"
            :help="$t('Assign IP addresses starting from a pool of subnets to be dynamically allocated to connecting clients.')"
            :depend="s.dev === 'tun' && s.auth_mode !== 'skey' && s.type === 'server'"
            placeholder="172.16.1.100"
            name="ifconfig_pool_start"
            :rules="['ip4addr', startEndValidator]"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Assign IP end')"
            :help="$t('Assign IP addresses ending at a pool of subnets to be dynamically allocated to connecting clients.')"
            :depend="s.dev === 'tun' && s.auth_mode !== 'skey' && s.type === 'server'"
            placeholder="172.16.1.200"
            name="ifconfig_pool_end"
            :rules="['ip4addr', startEndValidator]"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Virtual network IPv6 address')"
            :help="$t('IPv6 address used for the virtual network.')"
            name="server_ipv6"
            :rules="['ipmask6', checkIPv6Range]"
            :depend="s.dev === 'tun' && s.auth_mode !== 'skey' && s.type === 'server'"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Assign IPv6 address')"
            :help="$t('Specify an IPv6 address pool for dynamic assignment to clients.')"
            :depend="s.dev === 'tun' && s.auth_mode !== 'skey' && s.type === 'server'"
            name="ifconfig_ipv6_pool"
            rules="ipmask6"
          />
          <vuci-form-item-list
            :uci-section="s"
            :label="$t('Remote network')"
            :help="$t('IP address of the remote LAN.')"
            :rules="['subnet', validateRemotePrivateNetwork]"
            name="network"
            placeholder="192.168.2.0/24"
            :depend="s.type === 'client' && s.dev === 'tun'"
            @change="updateValidations"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Local tunnel endpoint IPv6')"
            :help="$t('IPv6 address of the virtual local network interface.')"
            name="local_ipv6"
            :rules="['ipmask6', v => pairOfFieldsRequired({ name: $t('Local tunnel endpoint IPv6'), value: v }, { name: $t('Remote tunnel endpoint IPv6'), value: s.remote_ipv6 }), checkIPv6Range]"
            :depend="s.dev === 'tun' && s.auth_mode === 'skey'"
            @change="updateValidations"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Remote tunnel endpoint IPv6')"
            :help="$t('IPv6 address of the virtual remote network interface.')"
            name="remote_ipv6"
            :rules="['ip6addr', v => pairOfFieldsRequired({ name: $t('Remote tunnel endpoint IPv6'), value: v }, { name: $t('Local tunnel endpoint IPv6'), value: s.local_ipv6 })]"
            :depend="s.dev === 'tun' && s.auth_mode === 'skey'"
            @change="updateValidations"
          />
          <vuci-form-item-radio-group
            :uci-section="s"
            :label="$t('LZO')"
            :help="$t('Use fast LZO compression. With LZO compression, your VPN connection will generate less network traffic.')"
            name="comp_lzo"
            initial="none"
            :options="selectedLzo"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Client to client')"
            :help="$t('Allow client-to-client traffic.')"
            name="client_to_client"
            :depend="s.auth_mode !== 'skey' && s.type === 'server'"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Resolve retry')"
            :help="$t('Try to resolve the server hostname for X seconds before giving up.')"
            name="resolv_retry"
            :rules="resolveValidation"
            placeholder="20"
            initial="infinite"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Keep alive')"
            :help="$t('Try to keep the connection alive. Two values are required: ping_interval and ping_restart, e.g., 10 120.')"
            name="keepalive"
            :rules="keepAliveValidation"
            maxlength="16"
            placeholder="10 120"
          />
        </tlt-form-accordion>
      </tlt-card>
      <tlt-card
        v-show="s.configuration === 'manual' || (s.parse === '1' && s.config_parsed === '1' && configUploaded)"
        :title="$utils.getModalTitle($t('security'))"
        :initial-active="false"
      >
        <vuci-form-item-upload
          :uci-section="s"
          name="userpass"
          :label="$t('Usernames & Passwords')"
          :help="
            $t(`File containing usernames and passwords against which the server can authenticate clients. Each username and password pair should be placed on a single line and separated by a space.`)
          "
          max-size="16MB"
          :depend="isOneOf(s.auth_mode, ['tls/pass', 'pass']) && s.type === 'server'"
          :required="s.enable === '1' && s.configuration === 'manual'"
        />
        <template v-if="s.type === 'client'">
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Username')"
            :help="$t('VPN client username.')"
            name="user"
            placeholder="User"
            :rules="['credentials_validate', v => pairOfFieldsRequired({ name: $t('Username'), value: v }, { name: $t('Password'), value: s.pass })]"
            maxlength="512"
            :depend="isOneOf(s.auth_mode, ['tls/pass', 'pass'])"
            force-write
            :required="(s.auth_mode === 'tls/pass' || s.auth_mode === 'pass') && s.enable === '1' && s.configuration === 'manual'"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Password')"
            :help="$t('VPN client password.')"
            name="pass"
            placeholder="Password"
            :required="(s.auth_mode === 'tls/pass' || s.auth_mode === 'pass') && s.enable === '1' && s.configuration === 'manual'"
            password
            sensitive
            :rules="['credentials_validate', v => pairOfFieldsRequired({ name: $t('Password'), value: s.user }, { name: $t('Username'), value: v })]"
            maxlength="512"
            :depend="isOneOf(s.auth_mode, ['tls/pass', 'pass'])"
          />
        </template>
        <tlt-form-accordion
          v-if="isOneOf(s.auth_mode, ['tls/pass', 'pass'])"
          :name="`${s.id}_security_section`"
        >
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Encryption')"
            :help="$t('Packet encryption algorithm (cipher).')"
            :options="isOneOf(s.auth_mode, ['tls', 'tls/pass', 'pass']) ? cypher : cypherBasic"
            :warnings="getCipherWarning"
            name="cipher"
            initial="AES-256-CBC"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="data_ciphers"
            :label="$t('Data ciphers')"
            :help="$t('Select allowed data ciphers from the list; add a custom value if needed.')"
            :options="s.auth_mode === 'skey' ? skeyDataCiphers : dataCiphers"
            :warnings="getDataCypherWarning"
            multiple
            allow-create
            rules="fieldvalidation(\'^[a-zA-Z0-9-]+$\')"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Allow duplicate certificates')"
            :help="$t('All clients can have the same certificates.')"
            name="duplicate_cn"
            :depend="s.type === 'server' && s.auth_mode !== 'skey'"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Authentication algorithm')"
            name="auth"
            initial="sha256"
            :warnings="getAuthWarning"
            :options="authOptions"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Additional HMAC authentication')"
            :help="$t('Add an additional layer of HMAC authentication on top of the TLS control channel to protect against DoS attacks.')"
            :options="tlsAuthOptions"
            name="tls_security"
            initial="none"
            :depend="s.auth_mode !== 'skey'"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('HMAC key direction')"
            :help="$t('The HMAC authentication key direction value is arbitrary and must be opposite between communicating parties (or omitted entirely).')"
            :options="keyOptions"
            name="key_direction"
            :initial="s.type === 'server' ? '0' : '1'"
            :depend="s.tls_security === 'tls-auth'"
          />
        </tlt-form-accordion>
        <template v-if="!isOneOf(s.auth_mode, ['tls/pass', 'pass'])">
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Encryption')"
            :help="$t('Packet encryption algorithm (cipher).')"
            :options="isOneOf(s.auth_mode, ['tls', 'tls/pass', 'pass']) ? cypher : cypherBasic"
            :warnings="getCipherWarning"
            name="cipher"
            initial="AES-256-CBC"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="data_ciphers"
            :label="$t('Data ciphers')"
            :help="$t('Select allowed data ciphers from the list; add a custom value if needed.')"
            :options="s.auth_mode === 'skey' ? skeyDataCiphers : dataCiphers"
            :warnings="getDataCypherWarning"
            multiple
            rules="fieldvalidation(\'^[a-zA-Z0-9-]+$\')"
            allow-create
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Allow duplicate certificates')"
            :help="$t('All clients can have the same certificates.')"
            name="duplicate_cn"
            :depend="s.type === 'server' && s.auth_mode !== 'skey'"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Authentication algorithm')"
            name="auth"
            initial="sha256"
            :warnings="getAuthWarning"
            :options="authOptions"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Additional HMAC authentication')"
            :help="$t('Add an additional layer of HMAC authentication on top of the TLS control channel to protect against DoS attacks.')"
            :options="tlsAuthOptions"
            name="tls_security"
            initial="none"
            :depend="s.auth_mode !== 'skey'"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('HMAC key direction')"
            :help="$t('The HMAC authentication key direction value is arbitrary and must be opposite between communicating parties (or omitted entirely).')"
            :options="keyOptions"
            name="key_direction"
            :initial="s.type === 'server' ? '0' : '1'"
            :depend="s.tls_security === 'tls-auth' && s.auth_mode !== 'skey'"
          />
        </template>
      </tlt-card>
      <tlt-card
        v-show="s.configuration === 'manual' || (s.parse === '1' && s.config_parsed === '1' && configUploaded)"
        :title="$utils.getModalTitle($t('certificates'))"
      >
        <vuci-form-item-switch
          :uci-section="s"
          name="use_pkcs"
          :label="$t('Use PKCS #12 format')"
          :help="$t('Use PKCS #12 archive file format to bundle all the members of a chain of trust.')"
          :depend="s.auth_mode !== 'skey'"
          @change="updateSameNameField(s.use_pkcs, section)"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Certificate files from device')"
          name="device_files"
          :help="`${$t('Choose this option if you want to select certificate files from the device. Certificate files can be generated')}
          <a class=link href='/system/admin/certificates/generation'>${$t('here')}</a>`"
          :depend="(notExternalOrCustom(s) || isCustomAndUpload(s)) && isOneOf(s.auth_mode, ['tls', 'tls/pass', 'pass']) && s.use_pkcs === '0' && $store.hasPackages('vuci-app-certificates')"
          rawhtml
        />
        <template #help>
          {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated') }}
          <router-link to="/system/admin/certificates">{{ $t('here.') }}</router-link>
        </template>
        <tlt-hint
          v-if="s.auth_mode !== 'skey' && s.use_pkcs === '0' && s.auth_mode !== 'pass'"
          expand-to="top-right"
          :hints="showTPM2Badge(s.key) ? [{ info: $t('The selected key file is already in TPM2 storage.') }] : []"
        >
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Store %s key in TPM').format(s.type === 'server' ? $t('server') : $t('client'))"
            name="use_tpm"
            initial="1"
            :help="$t('When enabled, key will be stored in TPM2 secure storage if space is available.')"
            :depend="$store.board?.hwinfo?.tpm && s.auth_mode !== 'skey' && s.use_pkcs === '0' && s.auth_mode !== 'pass'"
            :readonly="showTPM2Badge(s.key)"
          />
        </tlt-hint>
        <vuci-form-item-upload
          :uci-section="s"
          name="pkcs12"
          :label="$t('PKCS #12 certificate chain')"
          :help="$t('Uploads a PKCS #12 certificate chain file.')"
          :depend="s.auth_mode !== 'skey' && !isPkcsDisabled"
          :required="s.enable === '1' && s.configuration === 'manual'"
        />
        <vuci-form-item-upload
          :uci-section="s"
          name="secret"
          :label="$t('Static pre-shared key')"
          :help="$t('A pre-shared key (PSK) is a shared secret that was previously shared between two parties using some secure channel before it needs to be used.')"
          max-size="16MB"
          :depend="(notExternalOrCustom(s) || isCustomAndUpload(s)) && s.auth_mode == 'skey'"
          :required="s.enable === '1' && s.configuration === 'manual'"
        />
        <template v-if="s.type === 'server'">
          <vuci-form-item-upload
            ref="ca"
            :uci-section="s"
            name="ca"
            :label="$t('Certificate authority%s').format(optionalField(s))"
            :help="$t('The digital certificate verifies the ownership of a public key by the named subject of the certificate.')"
            :depend="s.auth_mode !== 'skey' && isDeviceFilesDisabled && isPkcsDisabled"
            max-size="16MB"
            :warnings="getUploadWarning"
            force-write
            :required="s.enable === '1' && s.configuration === 'manual'"
          >
            <template #fileName="{ fileName }">
              {{ normalizeFileName(fileName) }}
            </template>
          </vuci-form-item-upload>
          <vuci-form-item-upload
            ref="cert"
            :uci-section="s"
            name="cert"
            :label="$t('Server certificate%s').format(optionalField(s))"
            :help="$t('Certificate servers validate or certify keys as part of a public key infrastructure.')"
            :depend="s.auth_mode !== 'skey' && isDeviceFilesDisabled && isPkcsDisabled"
            :warnings="getUploadWarning"
            max-size="16MB"
            force-write
            :required="s.enable === '1' && s.configuration === 'manual'"
          >
            <template #fileName="{ fileName }">
              {{ normalizeFileName(fileName) }}
            </template>
          </vuci-form-item-upload>

          <vuci-form-item-upload
            ref="key"
            :uci-section="s"
            name="key"
            :label="$t('Server key%s').format(optionalField(s))"
            :depend="s.auth_mode !== 'skey' && isDeviceFilesDisabled && isPkcsDisabled"
            :help="$t('Upload key file.')"
            max-size="16MB"
            force-write
            :required="s.enable === '1' && s.configuration === 'manual'"
          >
            <template
              v-if="showTPM2Badge(s.key)"
              #before
            >
              <tlt-badge
                type="success"
                class="shrink-0"
              >
                TPM2
              </tlt-badge>
            </template>
            <template #fileName="{ fileName }">
              {{ normalizeFileName(fileName) }}
            </template>
          </vuci-form-item-upload>
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Certificate authority')"
            :help="$t('The digital certificate verifies the ownership of a public key by the named subject of the certificate.')"
            :options="caCertOptions"
            :warnings="getWarning"
            name="ca"
            :depend="s.auth_mode !== 'skey' && s.device_files === '1' && isPkcsDisabled"
            :required="s.enable === '1' && s.configuration === 'manual'"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Server certificate')"
            :help="$t('Certificate servers validate or certify keys as part of a public key infrastructure.')"
            :options="serverCertOptions"
            :warnings="getWarning"
            name="cert"
            :depend="s.auth_mode !== 'skey' && s.device_files === '1' && isPkcsDisabled"
            :required="s.enable === '1' && s.configuration === 'manual'"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Server key')"
            :help="$t('It has been generated for the same purpose as server certificate.')"
            :options="serverKeyOptions"
            name="key"
            :depend="s.auth_mode !== 'skey' && s.device_files === '1' && isPkcsDisabled"
            :required="s.enable === '1' && s.configuration === 'manual'"
            @change="showTPM2Badge(s.key) ? (s.use_tpm = '1') : null"
          />
        </template>
        <template v-if="s.type === 'client'">
          <vuci-form-item-upload
            ref="ca"
            :uci-section="s"
            name="ca"
            :label="$t('Certificate authority%s').format(optionalField(s))"
            :help="$t('The digital certificate verifies the ownership of a public key by the named subject of the certificate.')"
            :depend="s.auth_mode !== 'skey' && isDeviceFilesDisabled && isPkcsDisabled"
            :warnings="getUploadWarning"
            max-size="16MB"
            force-write
            :required="s.enable === '1' && s.configuration === 'manual'"
          >
            <template #fileName="{ fileName }">
              {{ normalizeFileName(fileName) }}
            </template>
          </vuci-form-item-upload>
          <vuci-form-item-upload
            ref="cert"
            :uci-section="s"
            name="cert"
            :label="$t('Client certificate%s').format(optionalField(s))"
            :help="$t('Identify a client or a user, authenticating the client to the server and establishing precisely who they are.')"
            :depend="!isOneOf(s.auth_mode, ['skey', 'pass']) && isDeviceFilesDisabled && isPkcsDisabled"
            :warnings="getUploadWarning"
            max-size="16MB"
            force-write
            :required="s.enable === '1' && s.configuration === 'manual'"
          >
            <template #fileName="{ fileName }">
              {{ normalizeFileName(fileName) }}
            </template>
          </vuci-form-item-upload>
          <vuci-form-item-upload
            ref="key"
            :uci-section="s"
            name="key"
            :label="$t('Client key%s').format(optionalField(s))"
            :depend="!isOneOf(s.auth_mode, ['skey', 'pass']) && isDeviceFilesDisabled && isPkcsDisabled"
            :help="$t('Upload key file.')"
            max-size="16MB"
            force-write
            :required="s.enable === '1' && s.configuration === 'manual'"
          >
            <template
              v-if="showTPM2Badge(s.key)"
              #before
            >
              <tlt-badge
                type="success"
                class="shrink-0"
              >
                TPM2
              </tlt-badge>
            </template>
            <template #fileName="{ fileName }">
              {{ normalizeFileName(fileName) }}
            </template>
          </vuci-form-item-upload>
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Certificate authority')"
            :help="$t('The digital certificate verifies the ownership of a public key by the named subject of the certificate.')"
            :options="caCertOptions"
            :warnings="getWarning"
            name="ca"
            :depend="s.auth_mode !== 'skey' && s.device_files === '1' && isPkcsDisabled"
            :required="s.enable === '1' && s.configuration === 'manual'"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Client certificate')"
            :help="$t('Identify a client or a user, authenticating the client to the server and establishing precisely who they are.')"
            :options="clientCertOptions"
            :warnings="getWarning"
            name="cert"
            :depend="!isOneOf(s.auth_mode, ['skey', 'pass']) && s.device_files === '1' && isPkcsDisabled"
            :required="s.enable === '1' && s.configuration === 'manual'"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Client key')"
            :help="$t('It has been generated for the same purpose as a client certificate.')"
            :options="clientKeyOptions"
            name="key"
            :depend="!isOneOf(s.auth_mode, ['skey', 'pass']) && s.device_files === '1' && isPkcsDisabled"
            :required="s.enable === '1' && s.configuration === 'manual'"
            @change="showTPM2Badge(s.key) ? (s.use_tpm = '1') : null"
          />
        </template>
        <!-- these should go under the all others files -->
        <vuci-form-item-upload
          :uci-section="s"
          name="tls_auth"
          :label="$t('HMAC authentication key')"
          :depend="s.tls_security == 'tls-auth' && s.auth_mode !== 'skey'"
          max-size="16MB"
          force-write
          :required="s.enable === '1' && s.configuration === 'manual'"
        />
        <vuci-form-item-upload
          :uci-section="s"
          name="tls_crypt"
          :label="$t('HMAC key')"
          :depend="s.tls_security === 'tls-crypt' && s.auth_mode !== 'skey'"
          max-size="16MB"
          force-write
          :required="s.enable === '1' && s.configuration === 'manual'"
        />
        <tlt-form-accordion
          v-show="s.auth_mode !== 'skey' && !(s.auth_mode === 'pass' && s.type === 'client' && s.use_pkcs === '0')"
          :name="`${s.id}_certificates_section`"
        >
          <vuci-form-item-upload
            ref="dh"
            :uci-section="s"
            :label="$t('Diffie Hellman parameters (optional)')"
            :help="$t('Diffie-Hellman key exchange is a specific method of exchanging cryptographic keys.')"
            name="dh"
            :depend="isDeviceFilesDisabled && s.type === 'server'"
            max-size="16MB"
            force-write
          >
            <template #fileName="{ fileName }">
              {{ normalizeFileName(fileName) }}
            </template>
          </vuci-form-item-upload>
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Diffie Hellman parameters (optional)')"
            :help="$t('Diffie-Hellman key exchange is a specific method of exchanging cryptographic keys.')"
            :options="dhCertOptions"
            name="dh"
            :depend="!isDeviceFilesDisabled && s.type === 'server'"
          />
          <vuci-form-item-upload
            :uci-section="s"
            :label="$t('CRL file (optional)')"
            :help="$t(`Revoking a certificate means to invalidate a previously signed certificate so that it can no longer be used for authentication purposes. Upload a .pem revocation file.`)"
            name="crl_verify"
            max-size="16MB"
            :depend="s.type === 'server'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="askpass"
            :label="$t('PKCS #12 passphrase')"
            :help="$t('Passphrase to decrypt PKCS #12 certificates.')"
            :depend="!isPkcsDisabled"
            password
            sensitive
            rules="credentials_validate"
            maxlength="512"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Private key decryption password (optional)')"
            :help="$t('Decrypt private key with password (Optional).')"
            :depend="isPkcsDisabled"
            name="askpass"
            rules="credentials_validate"
            maxlength="512"
            password
            sensitive
          />
        </tlt-form-accordion>
      </tlt-card>
    </vuci-named-section>
    <vuci-typed-section
      :show="section.type === 'server' && (section.auth_mode === 'tls' || section.auth_mode === 'tls/pass') && section.dev === 'tun' && section.configuration === 'manual'"
      :title="$t('TLS clients')"
      type="client"
      :help="$t('Here you can add your VPN clients so that they may be reachable from the server.')"
      :edit-form="editModal"
      :table-actions="['column-list', 'search']"
      :columns="columns"
      :endpoints="[{ endpoint: `openvpn/${section.id}/clients/config` }]"
      :uci-data="uciData"
      :add-title="$t('Add new TLS client instance')"
      data-key="tlsClients"
      :edit-form-props="{
        father: section.id
      }"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
        />
      </template>
      <template #common_name="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          rules="nospace"
          placeholder="name.surname@domain.com"
          maxlength="64"
          name="common_name"
          required
        />
      </template>
      <template #local_ip="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          rules="ip4addr"
          placeholder="172.16.1.6"
          name="local_ip"
          :required="s.remote_ip !== ''"
          @change="updateValidations"
        />
      </template>
      <template #local_ipv6="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          rules="ipmask6"
          placeholder="0000:0000:0000:0000:0000:0000:0000:0000/0"
          name="local_ipv6"
        />
      </template>
      <template #remote_ip="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          rules="ip4addr"
          placeholder="172.16.1.5"
          name="remote_ip"
          :required="s.local_ip !== ''"
          @change="updateValidations"
        />
      </template>
      <template #local_net="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          rules="ipmask4"
          placeholder="172.16.1.6/24"
          name="local_net"
          required
          @change="updateValidations"
        />
      </template>
      <template #private_network="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          rules="netmask"
          placeholder="255.255.255.0"
          name="private_network"
          @change="updateValidations"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.name"
          :label="$t('Name')"
          prop="name"
          required
          rules="uciname"
          maxlength="15"
        />
      </template>
      <template #action-buttons="{ s, actions }">
        <div class="justify-end gap-2.5 flex">
          <tlt-button
            button-id="edit"
            class="gap-1!"
            size="md"
            type="text"
            icon-left="edit"
            @click="actions.edit(s.id)"
          >
            {{ $t('Edit') }}
          </tlt-button>
          <tlt-hint :hints="configuredDeviceDeleteHint(s)">
            <tlt-button
              button-id="delete"
              size="md"
              color="error"
              type="text"
              :readonly="configuredDeviceDeleteHint(s).length > 0"
              @click="actions.delete(s.id)"
            >
              {{ $t('Delete') }}
            </tlt-button>
          </tlt-hint>
        </div>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import { ipv4Utils, ipv6Utils } from '@/utils/ipUtils'
import EditForm from './OpenVPNClientEdit'
import { parseIPv6 } from '@/validation-rules'
import { normalizeFileName, isTPM2, getCertificateWarning, showTPM2Warning } from '@/plugins/certificates'
import { useCertificatesStore } from '@/stores/certificates'

export default {
  inject: ['formOptions', 'warningMessages', 'setWarningMessages'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      configUploaded: false,
      editModal: markRaw(EditForm),
      vpnData: {},
      // extra options rules are here because it is difficult to escape all of the quotation marks in the template
      extraOptionsRule: "fieldvalidation('^[^`']+$',0)",
      extraOptionsHint: this.$t("All characters are allowed except `,'"),
      netmaskOptions: [['', this.$t('-- Please select --')], '255.255.255.0', '255.255.0.0', '255.0.0.0'],
      keyOptions: ['0', '1'],
      providerOptions: [
        ['nord', 'Nord VPN'],
        ['express', 'Express VPN']
      ],
      externalServers: [
        ['uk', this.$t('United Kingdom')],
        ['usa', this.$t('USA')],
        ['aus', this.$t('Australia')],
        ['sa', this.$t('South Africa')],
        ['custom', this.$t('Custom')]
      ],
      skeyDataCiphers: ['AES-128-CBC', 'AES-192-CBC', 'AES-256-CBC'],
      dataCiphers: ['AES-128-CBC', 'AES-192-CBC', 'AES-256-CBC', 'AES-128-GCM', 'AES-192-GCM', 'AES-256-GCM', 'CHACHA20-POLY1305', 'BF-CBC'],
      cypher: [
        ['AES-256-CBC', this.$t('AES-256-CBC 256 (default)')],
        ['AES-256-OFB', 'AES-256-OFB 256'],
        ['AES-256-CFB8', 'AES-256-CFB8 256'],
        ['AES-256-CFB1', 'AES-256-CFB1 256'],
        ['AES-256-CFB', 'AES-256-CFB 256'],
        ['AES-256-GCM', 'AES-256-GCM 256'],
        ['AES-192-GCM', 'AES-192-GCM 192'],
        ['AES-192-CBC', 'AES-192-CBC 192'],
        ['AES-192-OFB', 'AES-192-OFB 192'],
        ['AES-192-CFB8', 'AES-192-CFB8 192'],
        ['AES-192-CFB1', 'AES-192-CFB1 192'],
        ['AES-192-CFB', 'AES-192-CFB 192'],
        ['AES-128-GCM', 'AES-128-GCM 128'],
        ['AES-128-OFB', 'AES-128-OFB 128'],
        ['AES-128-CFB8', 'AES-128-CFB8 128'],
        ['AES-128-CFB1', 'AES-128-CFB1 128'],
        ['AES-128-CFB', 'AES-128-CFB 128'],
        ['AES-128-CBC', 'AES-128-CBC 128'],
        ['RC2-64-CBC', 'RC2-64-CBC 64'],
        ['CAST5-CBC', 'CAST5-CBC 128'],
        ['RC2-40-CBC', 'RC2-40-CBC 40'],
        ['BF-CBC', 'BF-CBC 128'],
        ['DESX-CBC', 'DESX-CBC 192'],
        ['DES-EDE3-CBC', 'DES-EDE3-CBC 192'],
        ['DES-EDE-CBC', 'DES-EDE-CBC 128'],
        ['RC2-CBC', 'RC2-CBC 128'],
        ['DES-CBC', 'DES-CBC 64'],
        ['none', this.$t('None')]
      ],
      cypherBasic: [
        ['AES-256-CBC', this.$t('AES-256-CBC 256 (default)')],
        ['AES-192-CBC', 'AES-192-CBC 192'],
        ['AES-128-CBC', 'AES-128-CBC 128'],
        ['CAST5-CBC', 'CAST5-CBC 128'],
        ['BF-CBC', 'BF-CBC 128'],
        ['DESX-CBC', 'DESX-CBC 192'],
        ['DES-EDE3-CBC', 'DES-EDE3-CBC 192'],
        ['DES-EDE-CBC', 'DES-EDE-CBC 128'],
        ['DES-CBC', 'DES-CBC 64'],
        ['none', this.$t('None')]
      ],
      authOptions: [
        ['none', this.$t('None')],
        ['md5', 'MD5'],
        ['sha1', 'SHA1'],
        ['sha256', this.$t('SHA256 (default)')],
        ['sha384', 'SHA384'],
        ['sha512', 'SHA512']
      ],
      tlsAuthOptions: [
        ['none', this.$t('None')],
        ['tls-auth', this.$t('Authentication only (tls-auth)')],
        ['tls-crypt', this.$t('Authentication and encryption (tls-crypt)')]
      ],
      lzo: [
        ['', this.$t('None')],
        ['yes', this.$t('Yes')],
        ['no', this.$t('No')]
      ],
      bridge: [['none', this.$t('None')]],
      fileNames: {
        ca: this.$t('Certificate authority'),
        serverCert: this.$t('Server certificate'),
        clientCert: this.$t('Client certificate'),
        serverKey: this.$t('Server key'),
        clientKey: this.$t('Client key'),
        secret: this.$t('Static pre-shared key'),
        userpass: this.$t('Usernames & Passwords'),
        openVPNConfFile: this.$t('OpenVPN configuration'),
        staticKey: this.$t('Static pre-shared key')
      },
      certificateWarnings: {
        1: this.$t("It's recommended to use a minimum RSA key length of 2048 bits for the certificate."),
        2: this.$t("It's recommended to use a minimum ECC key length of 256 bits for the certificate."),
        3: this.$t("It's recommended to use a minimum key length of 2048 bits for the certificate.")
      },
      selectedConfiguration: [
        {
          name: this.$t('Manual'),
          value: 'manual'
        },
        {
          name: this.$t('Upload config file'),
          value: 'custom'
        },
        {
          name: this.$t('External services'),
          value: 'external'
        }
      ],
      selectedAuthMode: [
        {
          name: this.$t('TLS'),
          value: 'tls'
        },
        {
          name: this.$t('TLS/Password'),
          value: 'tls/pass'
        },
        {
          name: this.$t('Password'),
          value: 'pass'
        },
        {
          name: this.$t('Static key'),
          value: 'skey'
        }
      ],
      selectedInterfaceType: [
        {
          name: this.$t('TUN (tunnel)'),
          value: 'tun'
        },
        {
          name: this.$t('TAP (bridged)'),
          value: 'tap'
        }
      ],
      topologyOptions: [
        {
          name: 'NET30',
          value: 'net30'
        },
        {
          name: 'P2P',
          value: 'p2p'
        },
        {
          name: 'SUBNET',
          value: 'subnet'
        }
      ],
      selectedLzo: [
        {
          name: this.$t('None'),
          value: 'none'
        },
        {
          name: this.$t('Adaptive'),
          value: 'adaptive'
        },
        {
          name: this.$t('Yes'),
          value: 'yes'
        },
        {
          name: this.$t('No'),
          value: 'no'
        }
      ]
    }
  },
  computed: {
    currentSection() {
      return this.vpnData?.openVpn?.find(i => i.id === this.section.id) || {}
    },
    editErrors() {
      return {
        1: this.$t('%s key is encrypted, please enter decryption password').format(this.$capitalize(this.currentSection.type)),
        2: this.$t('Incorrect file uploaded'),
        3: this.$t('The symbols %s are allowed for file name').format('a-zA-Z0-9._-@/()'),
        5: this.$t('Provided client key password is invalid'),
        6: this.$t('PKCS #12 passphrase is required'),
        7: this.$t('Provided PKCS #12 passphrase is invalid'),
        106: this.$t('Maximum number of server instances has been reached'),
        default: this.$t('Failed to edit configuration')
      }
    },
    isPkcsDisabled() {
      return this.currentSection.use_pkcs !== '1'
    },
    columns() {
      const cols = [
        { name: 'name', label: this.$t('Endpoint name') },
        {
          name: 'common_name',
          label: this.$t('Common name (CN)'),
          help: this.$t('Client certificate CN field (e.g., name.surname@domain.com).')
        }
      ]
      const topologyColumns = {
        net30: [
          { name: 'local_ip', label: this.$t('Virtual local endpoint'), help: this.$t('Virtual local endpoint (e.g., 172.16.1.6).') },
          { name: 'remote_ip', label: this.$t('Virtual remote endpoint'), help: this.$t('Virtual remote endpoint (e.g., 172.16.1.5).') }
        ],
        p2p: [
          { name: 'local_ip', label: this.$t('Virtual local endpoint'), help: this.$t('Virtual local endpoint (e.g., 172.16.1.6).') },
          { name: 'remote_ip', label: this.$t("Server's tunnel IP address"), help: this.$t("Server's tunnel IP address (e.g., 172.16.1.1).") }
        ],
        subnet: [{ name: 'local_net', label: this.$t('Virtual local subnet'), help: this.$t('Virtual local subnet (e.g., 172.16.1.6/24).') }]
      }
      if (this.currentSection?.topology in topologyColumns) {
        cols.push(...topologyColumns[this.currentSection?.topology])
      }
      cols.push({
        name: 'local_ipv6',
        label: this.$t('Local tunnel endpoint IPv6'),
        help: this.$t('IPv6 address of virtual local network interface.')
      })
      return cols
    },
    isDeviceFilesDisabled() {
      return this.currentSection.device_files !== '1'
    },
    clientKeyOptions() {
      if (!this.formOptions()?.certificates) return
      const filteredCerts = this.formOptions().certificates.filter(cert => (cert.cert_type === 'client' || cert.cert_type === 'import') && cert.type === 'key')
      return this.mapCertificateFiles(filteredCerts)
    },
    dhCertOptions() {
      let options = [['', this.$t('-- Please select --')]]
      if (!this.formOptions()?.certificates) return options
      const filteredCerts = this.formOptions().certificates.filter(cert => cert.type === 'dh')
      const mappedCerts = this.mapCertificateFiles(filteredCerts)
      return options.concat(mappedCerts)
    },
    serverKeyOptions() {
      if (!this.formOptions()?.certificates) return
      const filteredCerts = this.formOptions().certificates.filter(cert => (cert.cert_type === 'server' || cert.cert_type === 'import') && cert.type === 'key')
      return this.mapCertificateFiles(filteredCerts)
    },
    clientCertOptions() {
      if (!this.formOptions()?.certificates) return
      const filteredCerts = this.formOptions().certificates.filter(
        cert => (cert.cert_type === 'client' || cert.cert_type === 'import' || (cert.cert_type === 'scep' && !cert.fullname.startsWith('ca'))) && cert.type === 'cert'
      )
      return this.mapCertificateFiles(filteredCerts)
    },
    serverCertOptions() {
      if (!this.formOptions()?.certificates) return
      const filteredCerts = this.formOptions().certificates.filter(
        cert => (cert.cert_type === 'server' || cert.cert_type === 'import' || (cert.cert_type === 'scep' && !cert.fullname.startsWith('ca'))) && cert.type === 'cert'
      )
      return this.mapCertificateFiles(filteredCerts)
    },
    caCertOptions() {
      if (!this.formOptions()?.certificates) return
      const filteredCerts = this.formOptions().certificates.filter(
        cert => (cert.cert_type === 'ca' || cert.cert_type === 'import' || (cert.cert_type === 'scep' && cert.fullname.startsWith('ca'))) && cert.type === 'cert'
      )
      return this.mapCertificateFiles(filteredCerts)
    },
    lanInfo() {
      const isAccessPoint = this.$store.isAccessPoint
      const interfaces = this.formOptions().interfaces
      const lanInterfaces = interfaces.filter(iface => {
        const hasIpAddress = iface['ipv4-address'] || iface.ipaddr
        return isAccessPoint ? hasIpAddress && iface.id === 'lan' : iface.area_type === 'lan'
      })
      return lanInterfaces.flatMap(iface => {
        if (iface['ipv4-address']?.length) {
          return iface['ipv4-address'].map(ipv4 => ({
            ip: ipv4.address,
            net: ipv4Utils.numberToMask(ipv4.mask)
          }))
        }
        if (iface.ipaddr) {
          return [
            {
              ip: iface.ipaddr,
              net: iface.netmask
            }
          ]
        }
        return []
      })
    },
    bridgeInterfaces() {
      return this.formOptions()
        .networks.filter(i => i.type === 'bridge')
        .map(i => [i.id, this.$network.getName(i)])
    },
    maxServerReached() {
      return this.vpnData.openVpn?.filter(i => i.type === 'server').length > 0 && this.currentSection.type !== 'server'
    },
    protoOptions() {
      return [
        ['udp', 'UDP'],
        [`tcp-${this.currentSection.type}`, 'TCP'],
        ['udp4', 'UDP4'],
        [`tcp4-${this.currentSection.type}`, 'TCP4'],
        ['udp6', 'UDP6'],
        [`tcp6-${this.currentSection.type}`, 'TCP6']
      ]
    },
    selectedRole() {
      return [
        {
          name: this.$t('Client'),
          value: 'client'
        },
        {
          name: this.$t('Server'),
          value: 'server',
          disabled: this.maxServerReached
        }
      ]
    }
  },
  watch: {
    'vpnData.tlsClients': {
      handler: function () {
        this.duplicateCnWarning()
      }
    },
    'currentSection.use_tpm': {
      handler: 'showTPM2Warning'
    }
  },
  mounted() {
    this.configUploaded = !!this.currentSection.config
  },
  methods: {
    normalizeFileName(filePath) {
      return normalizeFileName(filePath)
    },
    showTPM2Badge(record) {
      return isTPM2(record, this.formOptions().certificates)
    },
    extraLoad() {
      if (this.vpnData.openVpn?.find(i => i.type === 'server')) return
      return { tlsClients: [] }
    },
    updateSameNameField(val, section) {
      if (val === '0') section.askpass = ''
    },
    getCipherWarning(value) {
      if (this.$utils.encryptionCypherWarning(value)) return this.$t('This privacy type is not considered secure. Consider using a more secure privacy type, such as AES.')
    },
    getAuthWarning(value) {
      if (this.$utils.authAlgorithmWarning(value.toUpperCase())) return this.$t('This algorithm is not cosidered secure. Consider using a more secure algorithm, such as SHA256.')
    },
    getDataCypherWarning(value) {
      const deprecatedCyphers = ['BF-CBC']
      const foundDeprecatedCypher = value.find(i => deprecatedCyphers.includes(i))
      if (foundDeprecatedCypher) {
        return this.$t(`Cypher '%s' is not considered secure. Consider using a more secure cipher, such as AES.`).format(foundDeprecatedCypher)
      }
    },
    afterLoad() {
      return this.$axios
        .bulkGet(['/api/interfaces/basic/status', { endpoint: `/api/openvpn/config/${this.currentSection.id}`, condition: this.currentSection.parse === '1' }])
        .then(async ([ifaces, vpn]) => {
          if (this.currentSection.parse === '1') {
            if (vpn.success) {
              const index = this.vpnData.openVpn.findIndex(i => i.id === this.currentSection.id)
              this.vpnData.openVpn[index] = vpn.data
            } else this.$message.error(this.$t('Failed to load instance data'))
          }
          if (ifaces.success) this.formOptions().ip6addresses = ifaces.data.find(i => i.device === 'br-lan')?.ip6addrs ?? []
          else this.$message.error(this.$t('Error while fetching IPv6 addresses'))
          if (this.section?.key) {
            await useCertificatesStore().getCertificates(true)
          }
          if (this.section.dh === 'none') this.currentSection.dh = ''
        })
        .catch(() => {
          return this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    checkIPv6Range(ip) {
      this.$VuciValidator.value = ip
      const expandedIp = ipv6Utils.expandIpv6(ip)
      const ipParsed = parseIPv6(expandedIp)
      const rangeArray = this.formOptions().ip6addresses.map(range => ipv6Utils.cidrToRange(range).map(parseIPv6))
      const res = rangeArray.some(
        ([rangeStart, rangeEnd]) => !rangeStart.some((segment, i) => i !== 7 && segment !== ipParsed[i] && rangeEnd[i] !== ipParsed[i] && (segment > ipParsed[i] || rangeEnd[i] < ipParsed[i]))
      )
      return res ? { isValid: false, message: this.$t('Provided IP cannot be in LAN network range') } : { isValid: true }
    },
    optionalField(val) {
      return val.configuration === 'custom' ? ` (${this.$t('optional')})` : ''
    },
    mapCertificateFiles(files) {
      return files.map(cert => [cert.path, normalizeFileName(cert.fullname)])
    },
    notExternalOrCustom(s) {
      return s.configuration === 'manual'
    },
    isCustomAndUpload(s) {
      return s.configuration === 'custom'
    },
    isOneOf(value, allowedValues) {
      return allowedValues.includes(value)
    },
    updateValidations(self) {
      self.vuciSection.validate()
    },
    resolveValidation(v) {
      this.$VuciValidator.value = v
      const res = this.$VuciValidator.uinteger()
      if (res.isValid || v === 'infinite') return { isValid: true }
      return { isValid: false, message: this.$t('Only word "infinite" or positive integers are accepted') }
    },
    keepAliveValidation(v) {
      if (!v.match(/^\d{1,4} \d{1,4}$/)) return { isValid: false, message: this.$t('Accepted values are a pair of numbers from 1 to 9999') }
      const [ping, pingRestart] = v.split(' ')
      if (parseInt(ping) > parseInt(pingRestart)) return { isValid: false, message: this.$t('First value cannot be higher than the second one') }
      return { isValid: true }
    },
    pairOfFieldsRequired(first, second) {
      const validation = !first.value || first.value.length === 0 || !second.value || second.value.length === 0
      if (validation)
        return {
          isValid: false,
          message: this.$t('"%s" and "%s" are both required at the same time').format(first.name, second.name)
        }
      return { isValid: true }
    },
    validateRemotePrivateNetwork(v) {
      const validator = { isValid: true }
      const lanInfo = this.lanInfo || []
      lanInfo.forEach(item => {
        const ipVal = v.split('/')[0]
        const [lanStart, lanEnd] = ipv4Utils.getIPRange(item.ip, item.net)
        if (ipv4Utils.checkIfInRange(ipVal, lanStart, lanEnd, true)) {
          validator.isValid = false
          validator.message = this.$t('Provided IP cannot be in LAN network range')
        }
      })
      return validator
    },
    // ideas taken from
    // https://stackoverflow.com/questions/27261281/function-for-subnet-mask
    maskToSubnet(val) {
      if (!(val > 0 && val < 33)) return false
      return [255, 255, 255, 255].map(() => [...Array(8).keys()].reduce(rst => rst * 2 + (val-- > 0), 0)).join('.')
    },
    netmaskValidate(netmaskValue = '', IPvalue = '') {
      const splittedIpValue = IPvalue.split('.')
      let splitedNetmask = netmaskValue.split('.')
      if (splitedNetmask.length === 1 && netmaskValue !== '') {
        netmaskValue = this.maskToSubnet(netmaskValue)
        if (netmaskValue === false) {
          return {
            isValid: false,
            message: this.$t('Must be one of the following values [255.255.255.0, 255.255.0.0, 255.0.0.0, or Range of values must be from 1 to 32')
          }
        }
        splitedNetmask = netmaskValue.split('.')
      }
      if (splittedIpValue.length !== 4 || splitedNetmask.length !== 4) {
        return { isValid: true }
      }
      const val = ipv4Utils.getIPRange(IPvalue, netmaskValue)
      if (IPvalue !== val[0]) {
        return {
          isValid: false,
          message: this.$t('To match specified netmask, "Remote network IP address" should be %s').format(val[0])
        }
      }
      return { isValid: true }
    },
    duplicateCnWarning() {
      const msg = this.$t('Allowing duplicate certificates and setting TLS client together is probably not what you want')
      if (this.currentSection.duplicate_cn === '1' && this.vpnData.tlsClients.length) {
        return this.$notification.info({ id: 'duplicate_cn', text: msg })
      }
      if (this.currentSection.duplicate_cn === '0') return this.$notification.remove(msg)
    },
    getUploadWarning(val) {
      return this.$utils.certificateWarnings(val, this.warningMessages(), this.vpnData.openVpn, this.certificateWarnings)
    },
    getWarning(val) {
      return getCertificateWarning(val, this.formOptions().certificates)
    },
    /**
     * @param {string} ip
     * @return {{isValid: boolean, message?: string}}
     */
    startEndValidator() {
      if (-ipv4Utils.compare(this.currentSection.ifconfig_pool_start, this.currentSection.ifconfig_pool_end) > 65536) {
        return {
          isValid: false,
          message: this.$t('The address range is too large (%s). The current maximum is 65536 addresses.').format(`${this.currentSection.ifconfig_pool_start} - ${this.section.ifconfig_pool_end}`)
        }
      }
      return {
        isValid: ipv4Utils.compare(this.currentSection.ifconfig_pool_start, this.currentSection.ifconfig_pool_end) <= -3,
        message: this.$t('Start IP must be smaller than End IP by more than 2 addresses.')
      }
    },
    showTPM2Warning() {
      if (this.currentSection.configuration !== 'manual' && this.currentSection.parse === '0') return
      showTPM2Warning(this.currentSection?.use_tpm, true)
    },
    afterSave(_, response) {
      const { messages, data } = response
      if (!messages) return this.setWarningMessages([])
      if (messages.find(i => i.code === 5)) this.$message.info(this.$t('TPM2 storage is full. The uploaded key could not be moved to TPM2 storage.'))
      if (!messages.some(i => i.source?.includes(':'))) {
        const simpleMessages = messages.filter(i => i.code !== 5).map(i => i.message)
        return simpleMessages.length ? this.$message.info('%s'.format(simpleMessages.join('\n'))) : null
      }
      const updatedMessages = this.warningMessages().filter(message => !data?.id || !message.source?.startsWith(data.id))
      return this.setWarningMessages(updatedMessages.concat(messages))
    },
    resetConfig(code) {
      if (code === 2) {
        this.$refs.customUpload.uciSection.config = ''
      }
      this.vpnData.openVpn.find(item => item.id === this.currentSection.id).enable = '0'
    },
    handleEditErrors(res) {
      const errorCode = res.data.errors[0].code
      this.resetConfig(errorCode)
      return this.editErrors[errorCode] || this.editErrors.default
    }
  }
}
</script>
