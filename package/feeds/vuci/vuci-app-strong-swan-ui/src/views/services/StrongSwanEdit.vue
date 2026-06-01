<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="ipsec"
    editing
    bulk-request
    :after-load="afterLoad"
    :before-save="beforeSave"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      data-key="ipsec"
      :endpoints="[{ endpoint: 'ipsec/config' }]"
      :name="section.id"
      :title="$utils.getModalTitle('IPsec', section.id)"
      :error-handlers="{ edit: handleEditErrors }"
      :after-save="afterSave"
    >
      <tlt-tabs :tabs="instanceTabs">
        <template #general>
          <vuci-form-item-switch
            :uci-section="s"
            name="enabled"
            :label="$t('Enable')"
            :help="$t('Turns the IPsec instance on or off.')"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="gateway"
            :label="$t('Remote endpoint')"
            :help="$t('Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).')"
            placeholder="0.0.0.0"
            :rules="validateDomain"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="keyexchange"
            :label="$t('Key exchange')"
            :options="keyExchangeOpts"
          >
            <template #help>
              <hint-helper
                :main-hint="$t('Internet Key Exchange (IKE) version used for exchanging keys.')"
                :hints="[
                  {
                    option: $t('IKEv1'),
                    hint: $t('More commonly used but contains known issues, for example, dealing with NAT.')
                  },
                  {
                    option: $t('IKEv2'),
                    hint: $t(
                      'Updated version with increased and improved capabilities, such as integrated NAT support, supported multihosting, deprecated exchange modes (does not use main or aggressive mode; only 4 messages required to establish a connection).'
                    )
                  }
                ]"
              /> </template
          ></vuci-form-item-select>
          <vuci-form-item-select
            :uci-section="s"
            name="authentication_method"
            :label="$t('Authentication method')"
            :help="
              $t(
                'Choose the authentication.\
            Pre-shared key or x.509 standard certificates.'
              )
            "
            :options="authMethodOpts"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Certificate files from device')"
            name="device_files"
            :depend="s.authentication_method === 'x509' || s.authentication_method === 'eap-mschapv2'"
            :initial="filesFromDevice ? '1' : '0'"
            no-write
          >
            <template #help>
              {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated') }}
              <router-link to="/system/admin/certificates">{{ $t('here') }}</router-link
              >.
            </template>
          </vuci-form-item-switch>
          <tlt-hint
            v-if="$store.board?.hwinfo?.tpm && currentSectionIpsec.keyexchange === 'ikev2' && ['x509', 'eap-mschapv2'].includes(s.authentication_method)"
            expand-to="top-right"
            :hints="showTPM2Badge(s.key) ? [{ info: $t('The selected key file is already in TPM2 storage.') }] : []"
          >
            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Store keys in TPM')"
              name="use_tpm"
              initial="1"
              :help="$t('When enabled, key will be stored in TPM2 secure storage if space is available.')"
              :depend="$store.board?.hwinfo?.tpm && currentSectionIpsec.keyexchange === 'ikev2' && ['x509', 'eap-mschapv2'].includes(s.authentication_method)"
              :readonly="showTPM2Badge(s.key)"
            />
          </tlt-hint>
          <vuci-form-item-input
            :uci-section="s"
            name="pre_shared_key"
            :label="$t('Pre-shared key')"
            :help="
              $t(
                'A shared password used for authentication IPsec peers.\
            All characters are allowed except \`'
              )
            "
            password
            sensitive
            rules="credentials_validate('allow-space')"
            minlength="5"
            maxlength="512"
            :depend="s.authentication_method === 'psk' && s.multiple_secrets !== '1'"
            required
          />
          <vuci-form-item-upload
            ref="key"
            :uci-section="s"
            name="key"
            :label="$t('Key')"
            :depend="(s.authentication_method === 'x509' || s.authentication_method === 'eap-mschapv2') && isDeviceFilesDisabled"
            :help="$t('Upload private key file.')"
            max-size="16MB"
            :required="s.authentication_method === 'x509'"
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
            :label="$t('Key')"
            :help="$t('It has been generated for the same purpose as server certificate.')"
            :options="serverKeyOptions"
            name="key"
            :depend="!isDeviceFilesDisabled"
            :required="s.authentication_method === 'x509'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="key_decrypt"
            :label="$t('Key decryption passphrase')"
            :help="$t('If the private key file is encrypted, the passphrase must be defined.')"
            :depend="s.authentication_method === 'x509' || s.authentication_method === 'eap-mschapv2'"
            placeholder="Passphrase"
            minlength="5"
            maxlength="512"
            rules="credentials_validate('allow-space')"
            password
            sensitive
          />
          <vuci-form-item-upload
            ref="leftcert"
            :uci-section="s"
            name="leftcert"
            :label="$t('Local certificate')"
            :help="$t('Upload this device certificate file.')"
            :depend="(s.authentication_method === 'x509' || s.authentication_method === 'eap-mschapv2') && isDeviceFilesDisabled"
            :warnings="getUploadWarning"
            max-size="16MB"
            :required="s.authentication_method === 'x509'"
          >
            <template #fileName="{ fileName }">
              {{ normalizeFileName(fileName) }}
            </template>
          </vuci-form-item-upload>
          <vuci-form-item-select
            :uci-section="s"
            name="leftcert"
            :label="$t('Local certificate')"
            :help="$t('Upload this device certificate file.')"
            :options="localCertOptions"
            :warnings="getWarning"
            :depend="!isDeviceFilesDisabled"
            :required="s.authentication_method === 'x509'"
          />
          <vuci-form-item-upload
            ref="cacert"
            :uci-section="s"
            name="cacert"
            :label="$t('CA certificate')"
            :help="$t('Upload CA certificate file.')"
            :depend="(s.authentication_method === 'x509' || s.authentication_method === 'eap-mschapv2') && isDeviceFilesDisabled"
            :warnings="getUploadWarning"
            max-size="16MB"
          >
            <template #fileName="{ fileName }">
              {{ normalizeFileName(fileName) }}
            </template>
          </vuci-form-item-upload>
          <vuci-form-item-select
            :uci-section="s"
            name="cacert"
            :label="$t('CA certificate')"
            :help="$t('Upload CA certificate file.')"
            :options="caCertOptions2"
            :warnings="getWarning"
            :depend="!isDeviceFilesDisabled"
          />
          <vuci-form-item-upload
            :uci-section="s"
            name="pkcs12_path"
            :label="$t('PKCS12 container')"
            :help="$t('Upload PKCS12 container file.')"
            :depend="s.authentication_method === 'pkcs12'"
            max-size="16MB"
            required
          />
          <vuci-form-item-input
            :uci-section="s"
            name="pkcs12_decrypt"
            :label="$t('PKCS12 decryption passphrase')"
            :help="$t('Passphrase to decrypt PKCS12 container.')"
            :depend="s.authentication_method === 'pkcs12'"
            placeholder="Passphrase"
            maxlength="512"
            rules="credentials_validate('allow-space')"
            password
            sensitive
          />
          <vuci-form-item-input
            :uci-section="s"
            name="local_identifier"
            :label="$t('Local identifier')"
            :help="
              $t(
                'How the left participant should be\
            identified for authentication.'
              )
            "
            placeholder="IP, FQDN"
            maxlength="255"
            :rules="validateIdentifier"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="remote_identifier"
            :label="$t('Remote identifier')"
            :help="
              $t(
                'How the right participant should be\
            identified for authentication.'
              )
            "
            placeholder="IP, FQDN"
            maxlength="255"
            :rules="validateIdentifier"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="multiple_secrets"
            :label="$t('Multiple secrets')"
            :help="$t('Configure multiple secrets.')"
          />
        </template>
        <template #advanced>
          <vuci-form-item-upload
            :uci-section="s"
            name="rightcert"
            :label="$t('Remote certificate')"
            :help="$t('Upload remote device certificate file.')"
            :depend="s.authentication_method === 'x509' || s.authentication_method === 'eap-mschapv2'"
            max-size="16MB"
          >
            <template #fileName="{ fileName }">
              {{ normalizeFileName(fileName) }}
            </template>
          </vuci-form-item-upload>
        </template>
      </tlt-tabs>
    </vuci-named-section>
    <vuci-typed-section
      :show="currentSectionIpsec?.multiple_secrets === '1'"
      type="secret"
      :uci-data="uciData"
      data-key="secrets"
      :endpoints="[{ endpoint: 'ipsec/secrets/config' }]"
      :title="$t('Global secrets settings')"
      :columns="secretColumns"
      :no-value-text="$t('There are no pre-shared keys created yet')"
      :error-handlers="{ delete: handleErrors(deleteErrors) }"
    >
      <template #id_selector="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="id_selector"
          placeholder="%any, IP or FQDN"
          :rules="[lv.string({ maxlength: 255 })]"
          allow-create
          multiple
        />
      </template>
      <template #type="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="type"
          :options="secretTypeOptions"
        />
      </template>
      <template #secret="{ s }">
        <vuci-form-item-upload
          :depend="s.type === 'rsa'"
          :uci-section="s"
          name="key"
          max-size="16MB"
          required
        />
        <vuci-form-item-upload
          :depend="s.type === 'pkcs12'"
          :uci-section="s"
          name="pkcs12_path"
          max-size="16MB"
          required
        />
        <vuci-form-item-input
          :uci-section="s"
          name="secret"
          minlength="5"
          maxlength="512"
          rules="credentials_validate('allow-space')"
          :depend="s.type !== 'rsa' && s.type !== 'pkcs12'"
          password
          sensitive
          required
        />
      </template>
      <template #key_decrypt="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="key_decrypt"
          placeholder="Passphrase"
          :depend="s.type === 'rsa' && hasRsaOrPkcs12"
          minlength="5"
          maxlength="512"
          rules="credentials_validate('allow-space')"
          password
          sensitive
        />
        <span v-if="s.type !== 'rsa' && s.type !== 'pkcs12'">-</span>
        <vuci-form-item-input
          :uci-section="s"
          name="pkcs12_decrypt"
          placeholder="Passphrase"
          :depend="s.type === 'pkcs12' && hasRsaOrPkcs12"
          minlength="5"
          maxlength="512"
          rules="credentials_validate('allow-space')"
          password
          sensitive
        />
      </template>
    </vuci-typed-section>
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'ipsec/config' }]"
      data-key="ipsec-connection-proposal"
      :name="section.id"
      :error-handlers="{ edit: handleEditErrors }"
    >
      <tlt-card :title="$utils.getModalTitle($t('connection'))">
        <tlt-tabs :tabs="ipsecTabs">
          <template #general>
            <vuci-form-item-select
              :uci-section="s"
              name="mode"
              :label="$t('Mode')"
              :help="$t('What operation should be done automatically at IPsec startup.')"
              :options="modeOpts"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="type"
              :label="$t('Type')"
              :help="`${$t('Type of connection.')}<br/>
              ${$t(
                'Tunnel - protects internal routing information by encapsulating the entire\
              IP packet (IP header and payload); is commonly used in site-to-site VPN connections;\
              supports NAT traversal'
              )}<br/>${$t(
                'Transport - only encapsulate IP payload data;\
              is used in client-to-site VPN connections; does not support NAT traversal;\
              usually implemented with other tunneling prtocols (for example, L2TP).'
              )}`"
              :options="typeOpts"
              rawhtml
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="defaultroute"
              :label="$t('Default route')"
              :help="$t('Route all traffic through the IPsec tunnel.')"
              :depend="s.type === 'tunnel'"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="route_based_ipsec"
              :label="$t('Route based IPsec')"
              :help="$t('IPsec VPN tunnel created between two end points.')"
              :depend="s.type === 'tunnel'"
            />
            <vuci-form-item-input
              :uci-section="s"
              required
              :label="$t('IP address')"
              placeholder="10.0.0.1/24"
              :help="$t('Assign an IP address to XFRM interface.')"
              :depend="s.route_based_ipsec === '1'"
              name="xfrm_ip"
              rules="subnet"
            />
            <vuci-form-item-input
              :uci-section="s"
              :label="$t('MTU')"
              placeholder="1440"
              :help="$t('Sets the maximum transmission unit (MTU) size. It is the largest size of a protocol data unit (PDU) that can be transmitted in a single network layer transaction.')"
              :depend="s.route_based_ipsec === '1'"
              name="xfrm_mtu"
              rules="irange(68,9200)"
            />
            <vuci-form-item-list
              :uci-section="s"
              name="local_subnet"
              :label="$t('Local subnet')"
              :help="
                $t(
                  'Private subnet behind the left (local) participant,\
              expressed as network/netmask. IKEv2 supports multiple subnets,\
              IKEv1 only interprets the first subnet'
                )
              "
              placeholder="192.168.1.0/24 or fd01::/64"
              maxlength="512"
              rules="subnet"
              :depend="s.type === 'tunnel' && s.defaultroute !== '1' && s.route_based_ipsec === '0'"
            />
            <vuci-form-item-list
              :uci-section="s"
              name="remote_subnet"
              :label="$t('Remote subnet')"
              :help="
                $t(
                  'Private subnet behind the right (remote) participant,\
              expressed as network/netmask. IKEv2 supports multiple subnets,\
              IKEv1 only interprets the first subnet'
                )
              "
              placeholder="192.168.2.0/24 or fd02::/64"
              maxlength="512"
              rules="subnet"
              :depend="s.type === 'tunnel' && s.defaultroute !== '1' && s.route_based_ipsec === '0'"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="bind_to"
              :label="$t('Bind to')"
              :help="$t('Bind to GRE or L2TP interface to create GRE/L2TP over IPsec.')"
              :options="bindOptions"
              :depend="s.type === 'transport'"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="xauth"
              :label="$t('Enable XAUTH')"
              :depend="s.keyexchange === 'ikev1'"
            />
          </template>
          <template #advanced>
            <vuci-form-item-switch
              :uci-section="s"
              name="aggressive"
              :label="$t('Aggressive')"
              :help="$t('Aggressive mode disables the Peer Identity Protection. Available only for outgoing connections.')"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="forceencaps"
              :label="$t('Force encapsulation')"
              :help="
                $t(
                  'Force UDP encapsulation for ESP packets even if no NAT situation is detected.\
              This may help to surmount restrictive firewalls.'
                )
              "
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="local_firewall"
              :label="$t('Local firewall')"
              :help="
                $t(
                  'Whether the left (local) participant is doing forwarding-firewalling\
              (including masquerading) using iptables for traffic from the right (remote) subnet.'
                )
              "
              force-write
              initial="1"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="remote_firewall"
              :label="$t('Remote firewall')"
              :help="
                $t(
                  'Whether the right (remote) participant is doing forwarding-firewalling\
              (including masquerading) using iptables for traffic from the left (local) subnet.'
                )
              "
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="comp_mode"
              :label="$t('Compatibility mode')"
              :help="$t('Enable this option if you are having trouble with multiple subnets with a 3rd party remote peer.')"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="inactivity"
              :label="$t('Inactivity')"
              :help="
                $t(
                  'Defines the timeout interval, after which a CHILD_SA is closed\
              if it did not send or receive any traffic. The default value of 0 disables inactivity checks.'
                )
              "
              placeholder="0"
              rules="uinteger"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="dpd"
              :label="$t('Dead peer detection')"
              :help="
                $t(
                  'Controls the use of the Dead Peer Detection protocol where notification\
              messages are periodically sent in order to check the liveliness of the IPsec peer.'
                )
              "
              initial="1"
            />
            <vuci-form-item-select
              :uci-section="s"
              name="dpdaction"
              :label="$t('DPD action')"
              :help="
                $t(
                  'Controls the use of the Dead Peer Detection protocol where notification\
              messages are periodically sent in order to check the liveliness of the IPsec peer.'
                )
              "
              :options="dpdActionOpts"
              :depend="s.dpd === '1'"
              initial="restart"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="dpddelay"
              :label="$t('DPD delay')"
              :help="
                $t(
                  'Defines the period time interval with which R_U_THERE\
              messages/INFORMATIONAL exchanges are sent to the peer.'
                )
              "
              placeholder="30"
              rules="uinteger"
              maxlength="64"
              :depend="s.dpd === '1'"
              initial="30"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="dpdtimeout"
              :label="$t('DPD Timeout')"
              :help="
                $t(
                  'Defines the timeout interval, after which all connections\
              to a peer are deleted in case of inactivity.'
                )
              "
              placeholder="150"
              rules="uinteger"
              maxlength="64"
              :depend="s.dpd === '1'"
            />
            <!-- allows "%config" value -->
            <vuci-form-item-list
              :uci-section="s"
              name="remote_sourceip"
              :label="$t('Remote source IP')"
              :help="$t('The internal source IP to use in a tunnel for the remote (right) peer.')"
              placeholder="10.0.2.0/24 or fd02::/64"
              :rules="validateRemoteIP"
              :depend="s.type === 'tunnel'"
            />
            <!-- allows "%config" value -->
            <vuci-form-item-input
              :uci-section="s"
              name="local_sourceip"
              :label="$t('Local source IP')"
              :help="$t('The internal (left) source IP to use in a tunnel, also known as virtual IP.')"
              placeholder="10.0.2.1 or fd02::1"
              :rules="[validateLocalIP]"
              :depend="s.type === 'tunnel'"
            />
            <vuci-form-item-list
              :uci-section="s"
              name="rightdns"
              :label="$t('Remote DNS')"
              :help="
                $t(
                  'A list of DNS server addresses to exchange as configuration attributes.\
              On the responder, only fixed IPv4/IPv6 addresses are allowed and define\
              DNS servers assigned to the client.'
                )
              "
              placeholder="8.8.8.8 or 2001:4860:4860::8888"
              rules="ipaddr"
              :depend="s.type === 'tunnel'"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="xauth_identity"
              :label="$t('XAuth identity')"
              :help="
                $t(
                  'The identity/username the client uses to reply to an XAuth request. If not defined, \
                the IKEv1 identity will be used as XAuth identity.'
                )
              "
              rules="fieldvalidation('^[a-zA-Z0-9%%_]+$',0)"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="leftprotoport"
              :label="$t('Locally allowed protocols')"
              :help="
                $t(
                  'Allowed protocols and ports over connection, also called Port Selectors.\
              Defines in form of \'protocol/port\' eg:\'17/1701\' or \'17/%any\' or \'udp/l2f\''
                )
              "
              placeholder="tcp/smtp"
              rules="fieldvalidation('^[a-zA-Z0-9/%%]+$',0)"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="rightprotoport"
              :label="$t('Remotely allowed protocols')"
              :help="$t('Allowed protocols and ports over connection, also called Port Selectors.')"
              placeholder="tcp/smtp"
              rules="fieldvalidation('^[a-zA-Z0-9/%%]+$',0)"
            />
            <vuci-form-item-list
              v-slot="{ value, updateValue }"
              :uci-section="s"
              name="custom"
              :label="$t('Custom option')"
              :help="$t('Syntax option=value.')"
              placeholder="reqid=1"
              rules="fieldvalidation('^[a-zA-Z0-9=/_.:{}%%\\s-]+$',0)"
            >
              <tlt-text-area
                class="max-h-40! min-w-xs"
                no-counter
                auto-grow
                :resize="false"
                :model-value="value"
                @update:model-value="updateValue"
              />
            </vuci-form-item-list>
            <vuci-form-item-select
              :uci-section="s"
              name="passthrough"
              :label="$t('Passthrough interfaces')"
              :help="$t('Select passthrough interfaces.')"
              :options="interfaceOptions"
              :depend="s.type === 'tunnel'"
              multiple
            />
            <vuci-form-item-list
              :uci-section="s"
              name="passthrough_local"
              :label="$t('Local passthrough subnets')"
              :help="$t('IPv4 or IPv6 address/subnet.')"
              placeholder="192.168.1.0/24 or fd01::/64"
              :rules="validatePassthrough"
              :depend="s.type === 'tunnel'"
            />
            <vuci-form-item-list
              :uci-section="s"
              name="passthrough_remote"
              :label="$t('Remote passthrough subnets')"
              :help="$t('IPv4 or IPv6 address/subnet.')"
              placeholder="192.168.1.0/24 or fd01::/64"
              :rules="validatePassthrough"
              :depend="s.type === 'tunnel'"
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="flush"
              :label="$t('Flush conntrack')"
              :help="$t('Flush conntrack after IPsec makes a successful connection.')"
            />
          </template>
        </tlt-tabs>
      </tlt-card>
      <tlt-card
        :initial-active="false"
        :title="$utils.getModalTitle($t('proposal'))"
        :help="
          $t(
            'This section is used to configure IKE (Internet Key Exchange)\
      phase 1 & 2 settings. IKE is a protocol used to set up security\
      associations (SAs) for the IPsec connection. This process is\
      required before any IPsec tunnel can be established.'
          )
        "
      >
        <tlt-tabs :tabs="proposalTabs">
          <template #phase1>
            <vuci-form-item-custom
              :uci-section="s"
              name="crypto_proposal1"
              :label="$t('Proposals')"
              :help="
                $t(
                  'Encryption algorithm used for data encryption.\
                Authentication algorithm used for exchanging authentication information.\
                The DH (Diffie-Hellman) group must match\
                with another incoming connection to establish IPsec.'
                )
              "
              inputs="select,select,select"
              :headers="[$t('Encryption'), $t('Authentication'), $t('DH group')]"
              :input-props="proposalsPhase1InputProps"
              :warnings="getCipherWarning"
              rawhtml
              allow-create
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="force_crypto_proposal"
              :label="$t('Force crypto proposal')"
              :help="$t('Only chosen proposals will be used.')"
              :rmempty="false"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="ikelifetime"
              :label="$t('IKE lifetime')"
              :help="
                $t(
                  'How long the keying channel of a connection\
            (ISAKMP or IKE SA) should last before being renegotiated.\
            the time is specified in seconds. The s, m, h and d suffixes\
            explicitly define the units for seconds, minutes,\
            hours and days, respectively.'
                )
              "
              placeholder="3h"
              :rules="validateLifetime"
            />
          </template>
          <template #phase2>
            <vuci-form-item-custom
              :uci-section="s"
              name="crypto_proposal2"
              :label="$t('Proposals')"
              :help="
                $t(
                  'Encryption algorithm used for data encryption.\
                Hash algorithm used for exchanging hash information.\
                The PFS (Perfect Forward Secrecy) group must\
                match with another incoming connection to establish IPsec.'
                )
              "
              inputs="select,select,select"
              :headers="[$t('Encryption'), $t('Hash'), $t('PFS group')]"
              :input-props="proposalsPhase2InputProps"
              :warnings="getCipherWarning"
              rawhtml
              allow-create
            />
            <vuci-form-item-switch
              :uci-section="s"
              name="force_crypto_proposal2"
              :label="$t('Force crypto proposal')"
              :help="$t('Only chosen proposals will be used.')"
            />
            <vuci-form-item-input
              :uci-section="s"
              name="lifetime"
              :label="$t('Lifetime')"
              :help="
                $t(
                  'How long a particular instance of a connection\
            (a set of encryption/authentication keys for user packets)\
            should last, from successful negotiation to expiry.\
            The time is specified in seconds. The s, m, h and d suffixes\
            explicitly define the units for seconds, minutes, hours and days,\
            respectively.'
                )
              "
              placeholder="1h"
              :rules="validateLifetime"
            />
          </template>
        </tlt-tabs>
      </tlt-card>
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import { lazyValidator as lv } from '@ui-core/composables/useValidation'
import { parseIPv6 } from '@/validation-rules'
import { normalizeFileName, isTPM2, getCertificateWarning, showTPM2Warning } from '@/plugins/certificates'
import { useCertificatesStore } from '@/stores/certificates'
import HintHelper from '@/components/shared/HintHelper.vue'

export default {
  components: { HintHelper },
  inject: ['formOptions', 'warningMessages', 'setWarningMessages'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  emits: ['tpm-storage-full'],
  data() {
    return {
      lv: lv,
      proposalTabs: [
        { name: 'phase1', title: this.$t('Phase 1') },
        { name: 'phase2', title: this.$t('Phase 2') }
      ],
      formData: {
        ipsec: [],
        'ipsec-connection-proposal': [],
        secrets: []
      },
      ipsecTabs: [
        { name: 'general', title: this.$t('General settings') },
        { name: 'advanced', title: this.$t('Advanced settings') }
      ],
      authMethodOpts: [
        ['psk', 'Pre-shared key'],
        ['x509', 'X.509'],
        ['pkcs12', 'PKCS#12'],
        ['eap-mschapv2', 'EAP']
      ],
      modeOpts: [
        ['start', this.$t('Start')],
        ['add', this.$t('Add')],
        ['route', this.$t('Route')]
      ],
      secretTypeOptions: [
        ['psk', 'PSK'],
        ['xauth', 'XAUTH'],
        ['eap', 'EAP'],
        ['rsa', 'RSA'],
        ['pkcs12', 'PKCS#12']
      ],
      typeOpts: [
        ['tunnel', this.$t('Tunnel')],
        ['transport', this.$t('Transport')]
      ],
      keyExchangeOpts: [
        ['ikev1', this.$t('IKEv1')],
        ['ikev2', this.$t('IKEv2')]
      ],
      dpdActionOpts: [
        ['restart', this.$t('Restart')],
        ['hold', this.$t('Hold')],
        ['clear', this.$t('Clear')],
        ['none', this.$t('None')]
      ],
      encryptionOpts: [
        ['3des', '3DES'],
        ['des', 'DES'],
        ['aes128', 'AES 128'],
        ['aes192', 'AES 192'],
        ['aes256', 'AES 256'],
        ['aes128gcm8', 'AES128 GCM8'],
        ['aes192gcm8', 'AES192 GCM8'],
        ['aes256gcm8', 'AES256 GCM8'],
        ['aes128gcm12', 'AES128 GCM12'],
        ['aes192gcm12', 'AES192 GCM12'],
        ['aes256gcm12', 'AES256 GCM12'],
        ['aes128gcm16', 'AES128 GCM16'],
        ['aes192gcm16', 'AES192 GCM16'],
        ['aes256gcm16', 'AES256 GCM16'],
        ['chacha20poly1305', 'ChaCha20 Poly1305']
      ],
      hashOpts: [
        ['md5', 'MD5'],
        ['sha1', 'SHA1'],
        ['sha256', 'SHA256'],
        ['sha384', 'SHA384'],
        ['sha512', 'SHA512']
      ],
      diffieOpts: [
        ['modp768', 'MODP768'],
        ['modp1024', 'MODP1024'],
        ['modp1536', 'MODP1536'],
        ['modp2048', 'MODP2048'],
        ['modp3072', 'MODP3072'],
        ['modp4096', 'MODP4096'],
        ['ecp192', 'ECP192'],
        ['ecp224', 'ECP224'],
        ['ecp256', 'ECP256'],
        ['ecp384', 'ECP384'],
        ['ecp521', 'ECP521']
      ],
      certificateWarnings: {
        1: this.$t("It's recommended to use a minimum RSA key length of 2048 bits for the certificate."),
        2: this.$t("It's recommended to use a minimum ECC key length of 256 bits for the certificate."),
        3: this.$t(`It's recommended to use a minimum key length of 2048 bits for the certificate.`)
      },
      deleteErrors: {
        111: this.$t('Cannot delete secret as at least one enabled instance has multiple secrets enabled.'),
        default: this.$t('Failed to delete configuration')
      },
      tpmMessage: false
    }
  },
  computed: {
    currentSectionIpsec() {
      return this.formData?.ipsec?.find(x => x.id === this.section.id)
    },
    currentSectionIpsecConnectionProposal() {
      return this.formData?.['ipsec-connection-proposal']?.find(x => x.id === this.section.id)
    },
    filesFromDevice() {
      const certFields = [this.section.leftcert, this.section.cacert, this.section.key]
      const firstValidCert = certFields.find(cert => cert && cert !== '')
      if (!firstValidCert) {
        return false
      }
      return firstValidCert.startsWith('/etc/certificates') || firstValidCert.startsWith('/etc/uhttpd')
    },
    serverKeyOptions() {
      const filteredCerts = this.formOptions().certificates.filter(cert => cert.cert_type !== 'ca' && cert.cert_type !== 'root_ca' && cert.type === 'key')
      const certOptions = this.currentSectionIpsecConnectionProposal.keyexchange === 'ikev1' ? filteredCerts.filter(cert => !cert.tpm2) : filteredCerts
      return this.mapCertificateFiles(certOptions)
    },
    caCertOptions2() {
      const filteredCerts = this.formOptions().certificates.filter(
        cert => (cert.cert_type === 'ca' || cert.cert_type === 'import' || (cert.cert_type === 'scep' && cert.fullname.startsWith('ca'))) && cert.type === 'cert'
      )
      return this.mapCertificateFiles(filteredCerts)
    },
    localCertOptions() {
      const validTypes = ['client', 'server', 'import']
      return this.mapCertificateFiles(
        this.formOptions().certificates.filter(
          cert =>
            cert.type !== 'key' &&
            cert.cert_type !== 'ca' &&
            cert.cert_type !== 'root_ca' &&
            (cert.type === 'cert' || validTypes.includes(cert.cert_type) || (cert.cert_type === 'scep' && !cert.fullname.startsWith('ca')))
        )
      )
    },
    isDeviceFilesDisabled() {
      return this.section.device_files !== '1'
    },
    hasRsaOrPkcs12() {
      return this.formData.secrets?.some(secret => secret.type === 'rsa' || secret.type === 'pkcs12')
    },
    proposalsPhase1InputProps() {
      const encryptionAlgorithm = {
        prop: 'encryptionAlgorithm',
        initial: 'aes128',
        options: this.encryptionOpts
      }
      const authentication = {
        prop: 'authentication',
        initial: 'sha1',
        options: this.hashOpts
      }
      const dhGroup = {
        prop: 'dhGroup',
        initial: 'modp1536',
        options: this.diffieOpts
      }
      return [encryptionAlgorithm, authentication, dhGroup]
    },
    proposalsPhase2InputProps() {
      const encryptionAlgorithm = {
        prop: 'encryptionAlgorithm2',
        initial: 'aes128',
        options: this.encryptionOpts
      }
      const hash = {
        prop: 'hash',
        initial: 'sha1',
        options: this.hashOpts
      }
      const pfsGroup = {
        prop: 'pfsGroup',
        initial: 'modp1536',
        options: [...this.diffieOpts, ['no_pfs', 'No PFS']]
      }
      return [encryptionAlgorithm, hash, pfsGroup]
    },
    instanceTabs() {
      const auth = this.section.authentication_method === 'x509' || this.section.authentication_method === 'eap-mschapv2'
      const instance = [
        { name: 'general', title: this.$t('General settings') },
        { name: 'advanced', title: this.$t('Advanced settings'), show: auth }
      ]
      return instance
    },
    interfaceOptions() {
      const options = this.formOptions().interfaces.filter(iface => iface.id !== 'loopback')
      return options.map(iface => this.$network.getName(iface))
    },
    bindOptions() {
      const bindOpt = [['', this.$t('None')]]
      const l2tpClients = this.formOptions().clients.map(iface => [iface.id, `${iface.description} (L2TP)`])
      const l2tpServers = this.formOptions().servers.map(iface => [iface.id, `${iface.description} (L2TP)`])
      const gre = this.formOptions().gre.map(iface => [iface.id, `${iface.id} (GRE)`])
      return bindOpt.concat(l2tpClients).concat(l2tpServers).concat(gre)
    },
    secretColumns() {
      const cols = [
        {
          name: 'id_selector',
          label: this.$t('ID selector'),
          help: this.$t(
            'Each secret can be preceded by a list of optional ID selectors. A selector is an IP address, a Fully Qualified Domain Name, user@FQDN or %any. When using IKEv1 use IP address.'
          ),
          width: 'md'
        },
        {
          name: 'type',
          label: this.$t('Type'),
          help: this.$t('Make sure to turn on the "Enable XAUTH" option in connection settings, if you want to use XAUTH type secrets.'),
          width: this.hasRsaOrPkcs12 ? 'xs' : 'auto'
        },
        {
          name: 'secret',
          label: this.$t('Secret'),
          help: this.$t(`A shared password (or EAP key file) to authenticate
            between the peers. Minimum length is 5 symbols.
            All characters are allowed except \``),
          width: this.hasRsaOrPkcs12 ? 'md' : 'auto'
        },
        {
          name: 'key_decrypt',
          label: this.$t('Key decryption passphrase'),
          help: this.$t('If the private key file is encrypted, the passphrase must be defined.'),
          show: this.hasRsaOrPkcs12,
          width: 'base'
        }
      ]
      return cols
    }
  },
  watch: {
    currentSectionIpsec: {
      handler(newVal) {
        if (newVal?.keyexchange === 'ikev2' && ['x509', 'eap-mschapv2'].includes(newVal?.authentication_method)) {
          showTPM2Warning(newVal?.use_tpm)
        }
      },
      deep: true,
      immediate: true
    },
    'currentSectionIpsecConnectionProposal.bind_to'(newVal, oldVal) {
      const newValIsGre = this.formOptions().gre.some(i => i.id === newVal)
      const oldValIsGre = this.formOptions().gre.some(i => i.id === oldVal)
      const index = this.formData['ipsec-connection-proposal'].findIndex(x => x.id === this.section.id)
      if (newValIsGre && !oldValIsGre) {
        this.formData['ipsec-connection-proposal'][index].leftprotoport = 'gre'
        this.formData['ipsec-connection-proposal'][index].rightprotoport = 'gre'
      }
      if (oldValIsGre && !newValIsGre) {
        this.formData['ipsec-connection-proposal'][index].leftprotoport = ''
        this.formData['ipsec-connection-proposal'][index].rightprotoport = ''
      }
    }
  },
  methods: {
    normalizeFileName(filePath) {
      return normalizeFileName(filePath)
    },
    showTPM2Badge(record) {
      return isTPM2(record, this.formOptions().certificates)
    },
    handleEditErrors(errors) {
      // error code 103 has different 'error' values, this is why check is done by 'error'
      if (errors.payload.some(errors => errors.errors.some(error => error.error === 'cannot use ikev1 key exchange when the private key is in TPM'))) {
        return this.$t('Cannot use IKEv1 key exchange when the private key is in TPM2')
      }
      if (errors.payload.some(errors => errors.errors.some(errors => errors.code === 152))) {
        return this.$t('Uploaded certificate is not valid')
      }
      return this.$t('Failed to edit configuration')
    },
    mapCertificateFiles(files) {
      return files.map(cert => [cert.path, normalizeFileName(cert.fullname)])
    },
    getWarning(val) {
      return getCertificateWarning(val, this.formOptions().certificates)
    },
    getCipherWarning(value) {
      const encryption = value?.[0]?.split(',')?.[0]
      if (encryption === 'des' || encryption === '3des') return this.$t('This privacy type is not considered secure. Consider using a more secure privacy type, such as AES.')
    },
    splitIPv4(IPv4) {
      return IPv4.split('.')
        .map(d => ('000' + d).substr(-3))
        .join('')
    },
    checkIPv4Range(ipv4Range) {
      this.$VuciValidator.value = ipv4Range
      const [ipv4First, ipv4Second] = ipv4Range
      if (this.splitIPv4(ipv4First) <= this.splitIPv4(ipv4Second)) {
        return { isValid: true }
      }
      return { isValid: false, message: this.$t('Range of IPv4 addresses is not valid') }
    },
    checkIPv6Range(ipv6Range) {
      const [ipv6Parsed1, ipv6Parsed2] = ipv6Range.map(x => {
        return parseIPv6(x)
      })
      for (let i = 0; i < 8; i++) {
        if (ipv6Parsed1[i] === ipv6Parsed2[i]) continue
        if (ipv6Parsed1[i] > ipv6Parsed2[i]) return { isValid: false, message: this.$t('Range of IPv6 addresses is not valid') }
        if (ipv6Parsed1[i] < ipv6Parsed2[i]) return { isValid: true }
      }
      return { isValid: true }
    },
    validateLocalIP(val) {
      this.$VuciValidator.value = val
      const res = this.$VuciValidator.ipaddr()
      const res2 = this.$VuciValidator.subnet4()
      if ((!res.isValid || !res2.isValid) && !['%config', '%config4', '%config6'].includes(val)) {
        res.message = this.$t('One of the following: - IPv4 and IPv6 addresses or subnets are accepted (e.g., 192.168.1.1 .- Following words are accepted: %config, %config4, %config6).')
        return res
      }
      return { isValid: true }
    },
    validateRemoteIP(val) {
      this.$VuciValidator.value = val
      const result = val.split('-')
      const res = this.$VuciValidator.subnet()
      if (val === '%config' || val === '%poolname' || res.isValid) {
        return { isValid: true }
      }
      if (result.length !== 2) {
        res.message = this.$t(
          'One of the following: IPv4 and IPv6 range of IP addresses are accepted. IPv4 and IPv6 addresses with mask prefix are accepted (e.g., 192.168.1.0/24. Following words are accepted: %config, %poolname)'
        )
        return res
      }
      const fn = method => {
        return result.every(x => {
          this.$VuciValidator.value = x
          return this.$VuciValidator[method]().isValid
        })
      }
      if (fn('ipmask6')) {
        return this.checkIPv6Range(result)
      }
      if (fn('ipmask4')) {
        return this.checkIPv4Range(result)
      }
      return {
        isValid: false,
        message: this.$t(
          'One of the following: IPv4 and IPv6 range of IP addresses are accepted. IPv4 and IPv6 addresses with mask prefix are accepted (e.g., 192.168.1.0/24. Following words are accepted: %config, %poolname)'
        )
      }
    },
    validateIdentifier(val) {
      if (/^[^"\\]*$/.test(val)) {
        return { isValid: true }
      }
      return { isValid: false, message: this.$t('All characters are accepted except " and \\.') }
    },
    validatePassthrough(val) {
      this.$VuciValidator.value = val
      const res = this.$VuciValidator.subnet4()
      const res2 = this.$VuciValidator.subnet6()
      if (res.isValid || res2.isValid) {
        return { isValid: true }
      }
      res.message = this.$t('One of the following: IPv4 or IPv6 addresses/subnets are accepted.')
      res.isValid = false
      return res
    },
    validateLifetime(val) {
      const lifetime = val.slice(0, -1)
      this.$VuciValidator.value = lifetime
      if (!val.match(/[smhd]$/)) {
        return { isValid: false, message: 'Full number with s, m, h or d is accepted' }
      }
      let validator = { isValid: false }
      if (val.endsWith('s')) validator = this.$VuciValidator.irange('30', '500515200')
      if (val.endsWith('m')) validator = this.$VuciValidator.irange('1', '8341920')
      if (val.endsWith('h')) validator = this.$VuciValidator.irange('1', '139032')
      if (val.endsWith('d')) validator = this.$VuciValidator.irange('1', '5793')
      if (!validator.isValid) validator.message = 'Accepted values between ranges: 30s - 500515200s, 1m - 8341920m, 1h - 139032h, 1d - 5793d'
      return validator
    },
    validateDomain(value) {
      const any = /^%any(4|6)?$/
      if (any.test(value)) return { isValid: true }
      const subDomain = value.split('.')
      const underscore = /(^_)|(_$)/
      const validSubdomain = subDomain.filter(val => {
        if (underscore.test(val)) return true
        value = value.replace(/_/, '')
        this.$VuciValidator.value = value
        const resHostname = this.$VuciValidator.hostname()
        const resIpAddr = this.$VuciValidator.ipaddr()
        const resIpmask = this.$VuciValidator.ipmask()
        return !resHostname?.isValid && !resIpAddr?.isValid && !resIpmask?.isValid
      })
      if (validSubdomain.length !== 0) {
        return { isValid: false, message: this.$t('Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted (e.g., 192.168.1.1 or example.com).') }
      }
      return { isValid: true }
    },
    handleErrors(errors) {
      return res => {
        const errorCode = res.data.errors[0].code
        return errors[errorCode] || errors.default
      }
    },
    async afterLoad() {
      if (!this.section?.key) return
      await useCertificatesStore().getCertificates(true)
    },
    beforeSave() {
      const message = this.$t('At least one global secret must be configured')
      if (this.showTPM2Badge(this.currentSectionIpsec.key) && this.currentSectionIpsec.keyexchange === 'ikev1')
        return Promise.reject(this.$t('Key exchange IKEv1 cannot be used with TPM2 stored keys. Select IKEv2 or change the key.'))
      if (this.formData.secrets.length === 0 && this.currentSectionIpsec.multiple_secrets === '1') return Promise.reject(message)
      return Promise.resolve()
    },
    afterSave(_, response) {
      const updatedMessages = this.warningMessages().filter(message => !message.source.startsWith(response.data.id))
      this.setWarningMessages(updatedMessages.concat(response?.messages || []))
      if (response?.messages?.some(msg => msg.code === 5)) {
        this.$message.info(this.$t('TPM2 storage is full. The uploaded key could not be moved to TPM2 storage.'))
      }
    },
    getUploadWarning(val) {
      return this.$utils.certificateWarnings(val, this.warningMessages(), this.formData.ipsec, this.certificateWarnings)
    },
    showTPM2Warning() {
      showTPM2Warning(this.currentSectionIpsec?.use_tpm)
    }
  }
}
</script>
