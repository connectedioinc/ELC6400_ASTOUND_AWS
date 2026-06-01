<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="chilli"
    editing
    :extra-load="extraLoad"
    :before-save="onBeforeSave"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :name="section.id"
      :title="$utils.getModalTitle($t('hotspot instance'), section.id)"
      :endpoints="[{ endpoint: 'hotspot/config' }]"
      data-key="general"
      :error-handlers="{
        edit: handleEditError
      }"
    >
      <tlt-tabs :tabs="tabs">
        <template #general>
          <vuci-form-item-select
            :uci-section="s"
            name="profile"
            :label="$t('Configuration profile')"
            :options="formOptions().profiles.options"
            initial="default"
            @change="profileChanged"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="enabled"
            :label="$t('Enable')"
            :help="$t('Enable hotspot functionality.')"
            @change="validateEnable"
          />
          <tlt-inline-message
            v-if="hotspotMessage"
            type="info"
            :message="hotspotMessage"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="net"
            :label="$t('Hotspot network')"
            :help="$t('Hotspot network address (e.g., 192.168.2.0/24).')"
            :rules="['subnet4', validateNetworkMask]"
            placeholder="192.168.2.0/24"
            :required="s.enabled === '1'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="uamlisten"
            :label="$t('IP address')"
            :help="$t('Hotspot IP address.')"
            :rules="['ip4addr', v => validateIPRange(v, s.net)]"
            placeholder="192.168.2.254"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="mode"
            :label="$t('Authentication mode')"
            :help="$t('Specifies the method used to authenticate users.')"
            :options="modeOptions"
            @change="changeAuthState"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="macauth"
            :label="$t('Enable MAC authentication')"
            :help="$t('Enable MAC address authentication.')"
            :depend="s.mode === 'radius' || s.mode === 'sms_otp'"
          />
          <vuci-form-item-radio-group
            v-if="s.mode === 'radius' && s.macauth === '1'"
            :uci-section="s"
            :label="$t('MAC case')"
            name="mac_case"
            :options="macCase"
            initial="upper"
          />
          <vuci-form-item-radio-group
            v-if="s.mode === 'radius' && s.macauth === '1'"
            :uci-section="s"
            :label="$t('MAC delimiter')"
            name="mac_delimiter"
            :options="macDelimiter"
            initial="dash"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="duplicateusers"
            :label="$t('Allow password duplicates')"
            :help="$t('Allows more than one user to login with a same password.')"
            :depend="s.mode === 'sms_otp'"
            :rmempty="false"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="registerusers"
            :label="$t('Allow signup')"
            :help="$t('Allows users to sign up to hotspot.')"
            :depend="s.mode === 'local'"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="enable_macpass"
            :label="$t('Require password')"
            :help="$t('Enables password requirement for MAC authentication.')"
            :depend="s.mode === 'mac_auth'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="macpass"
            :label="$t('MAC auth password')"
            :help="$t('Password for MAC authentication.')"
            :depend="s.enable_macpass === '1'"
            required
            rules="credentials_validate"
            maxlength="512"
            password
            sensitive
            :placeholder="$t('Password')"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="dynexpirationtime"
            :label="$t('Expiration time')"
            :help="$t('User expiration time in sec (0 means unlimited).')"
            :depend="s.mode === 'sms_otp' || s.registerusers === '1'"
            initial="0"
            placehodler="0"
            rules="uinteger"
            maxlength="16"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="dyn_users_group"
            :label="$t('Users group')"
            :help="$t('Specifies the group of dynamically created users.')"
            :depend="s.mode === 'sms_otp' || s.registerusers === '1' || s.mode === 'mac_auth' || s.mode === 'sso'"
            :options="groupOptions"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="modemid"
            :label="$t('Modem')"
            :help="$t('SMS gateway to send one time paswords (OTP).')"
            :depend="s.mode === 'sms_otp' && formOptions().modems.length > 1"
            :options="formOptions().modems"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="landingpage"
            :label="$t('Landing page')"
            :help="$t('Location of the landing page.')"
            :options="landingPageOptions"
            @change="changeLandingPageState"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Password encoding')"
            :help="$t('Password encoding with the challenge.')"
            :depend="s.landingpage === 'ext'"
            name="withchallenge"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="uamserver"
            :label="$t('Landing page address')"
            :help="$t('External landing page address (e.g., http://www.example.com).')"
            rules="protourl"
            placeholder="http://www.example.com"
            :depend="s.landingpage === 'ext'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="uamport"
            :label="$t('UAM port')"
            :help="$t('Port to bind for authenticating clients.')"
            rules="port"
            initial="3990"
            placeholder="3990"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="uamsecret"
            :label="$t('UAM secret')"
            :help="$t('Shared secret between uamserver and hotspot.')"
            rules="credentials_validate"
            maxlength="512"
            :depend="s.landingpage === 'ext' && s.nochallenge"
            password
            sensitive
          />
          <vuci-form-item-select
            :uci-section="s"
            name="success"
            :label="$t('Success page')"
            :help="$t('Location to return to after successful authentication.')"
            :options="successOptions"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="success_url"
            :label="$t('Custom URL')"
            :help="$t('Address must contain protocol (http://www.example.com).')"
            :depend="s.success === 'custom'"
            rules="protourl"
            placeholder="http://www.example.com"
          />
        </template>
        <template #advanced>
          <vuci-form-item-select
            :uci-section="s"
            name="moreif"
            :label="$t('Additional interfaces')"
            :help="$t('Choose additional the interfaces you want to attach to this hotspot instance.')"
            :options="additionalInterfaces"
            multiple
            :placeholder="$t('-- Please select --')"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="mac_blocking"
            :label="$t('Enable MAC blocking')"
            :help="$t('Blocks access to MAC addresses that have reached set amount of failed login attempts.')"
            :depend="s.mode !== 'radius'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="uamlogoutip"
            :label="$t('Logout address')"
            :help="$t('IP address to instantly logout a client accessing it.')"
            rules="ip4addr"
            placeholder="1.0.0.0"
            initial="1.0.0.0"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="protocol"
            :label="$t('Protocol')"
            :help="$t('Protocol to be used for landing page.')"
            :options="protocolOptions"
            :depend="s.landingpage === 'int'"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="tos"
            :label="$t('Enable TOS')"
            :help="
              $t(
                'Enables Terms of Service (ToS) requirement. Cient device will be able to access the Internet \
              only after agreeing TOS'
              )
            "
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="trialusers"
            :label="$t('Trial access')"
            :help="$t('Enables trial internet access.')"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="trial_users_group"
            :label="$t('Group')"
            :help="$t('Specifies the group of trial users.')"
            :options="groupOptions"
            :depend="s.trialusers === '1'"
            initial="default"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="subdomain"
            :label="$t('Subdomain')"
            :help="$t('Combined with Domain to make a DNS alias for the Hotspot IP address.')"
            :required="s.domain !== ''"
            maxlength="63"
            rules="fieldvalidation('^[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]$',0)"
            placeholder="login"
            @change="$utils.validate"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="domain"
            :label="$t('Domain')"
            :help="$t('Combined with Subdomain to make a DNS alias for the Hotspot IP address.')"
            :required="s.subdomain !== ''"
            rules="hostname"
            placeholder="hotspot.local"
            @change="$utils.validate"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="https_redirect"
            :label="$t('HTTPS to landing page redirect')"
            :help="$t('Redirect initial pre-landing page HTTPS requests to hotspot landing page.')"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="device_files"
            :label="$t('Certificate files from device')"
            :depend="s.https_redirect === '1' || s.protocol === 'https'"
          >
            <template #help>
              {{ $t('Choose this option if you want to select certificate files from device. Certificate files can be generated') }}
              <router-link to="/system/admin/certificates">{{ $t('here') }}</router-link
              >.
            </template>
          </vuci-form-item-switch>
          <vuci-form-item-upload
            :uci-section="s"
            name="sslkeyfile"
            :label="$t('SSL key file')"
            :depend="(s.https_redirect === '1' || s.protocol === 'https') && s.device_files === '0'"
            :load="formData.device_files === '1' ? '' : s.name"
            :required="s.https_redirect === '1' && s.device_files === '0'"
            force-write
            max-size="16MB"
          >
            <template #fileName="{ fileName }">
              {{ normalizeFileName(fileName) }}
            </template>
          </vuci-form-item-upload>
          <vuci-form-item-select
            :uci-section="s"
            name="device_sslkeyfile"
            :label="$t('SSL key file')"
            :depend="(s.https_redirect === '1' || s.protocol === 'https') && s.device_files === '1'"
            :options="privateKeys"
            :required="s.https_redirect === '1' && s.device_files === '1'"
            force-write
          />
          <vuci-form-item-upload
            :uci-section="s"
            name="sslcertfile"
            :label="$t('SSL certificate file')"
            :depend="(s.https_redirect === '1' || s.protocol === 'https') && s.device_files === '0'"
            :load="formData.device_files === '1' ? '' : s.name"
            :required="s.https_redirect === '1' && s.device_files === '0'"
            force-write
            max-size="16MB"
          >
            <template #fileName="{ fileName }">
              {{ normalizeFileName(fileName) }}
            </template>
          </vuci-form-item-upload>
          <vuci-form-item-select
            :uci-section="s"
            name="device_sslcertfile"
            :label="$t('SSL certificate file')"
            :depend="(s.https_redirect === '1' || s.protocol === 'https') && s.device_files === '1'"
            :options="clientCertificates"
            :required="s.https_redirect === '1' && s.device_files === '1'"
          />
          <vuci-form-item-upload
            :uci-section="s"
            name="sslcafile"
            :label="$t('SSL CA certificate file')"
            :depend="(s.https_redirect === '1' || s.protocol === 'https') && s.device_files === '0'"
            :load="formData.device_files === '1' ? '' : s.name"
            force-write
            max-size="16MB"
          >
            <template #fileName="{ fileName }">
              {{ normalizeFileName(fileName) }}
            </template>
          </vuci-form-item-upload>
          <vuci-form-item-select
            :uci-section="s"
            name="device_sslcafile"
            :label="$t('SSL CA certificate file')"
            :depend="(s.https_redirect === '1' || s.protocol === 'https') && s.device_files === '1'"
            :options="caCertificates"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="dns1"
            :label="$t('Primary DNS server')"
            rules="ipaddr"
            placeholder="8.8.8.8"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="dns2"
            :label="$t('Secondary DNS server')"
            rules="ipaddr"
            placeholder="8.8.4.4"
          />
        </template>

        <template #radius>
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Require Message-Authenticator')"
            :help="$t('Require and validate Message-Authenticator RADIUS attribute on Access-Request replies.')"
            name="radiusrequiremessageauth"
            @change="showMessageAuth"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="radiusserver1"
            :label="$t('RADIUS server #1')"
            :help="$t('The IP address of the first RADIUS server that is to be used to authenticate your wireless clients.')"
            rules="host"
            :required="s.mode === 'radius'"
            :depend="s.mode === 'radius'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="radiusserver2"
            :label="$t('RADIUS server #2')"
            :help="$t('The IP address of the second RADIUS server that is to be used to authenticate your wireless clients.')"
            rules="host"
            :depend="s.mode === 'radius'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="radiusauthport"
            :label="$t('Authentication port')"
            :help="$t('RADIUS server authentication port.')"
            rules="port"
            initial="1812"
            :depend="s.mode === 'radius'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="radiusacctport"
            :label="$t('Accounting port')"
            :help="$t('RADIUS server accounting port.')"
            rules="port"
            initial="1813"
            :depend="s.mode === 'radius'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="radiusnasid"
            :label="$t('NAS identifier')"
            :help="$t('NAS identifier.')"
            :depend="s.mode === 'radius'"
            rules="credentials_validate"
            maxlength="512"
            :required="s.profile === 'hotspotsystems'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="radiussecret"
            :label="$t('Radius secret key')"
            :help="$t('The secret key is used for authentication with the RADIUS server.')"
            :depend="s.mode === 'radius'"
            rules="credentials_validate"
            maxlength="512"
            password
            sensitive
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="swapoctets"
            :label="$t('Swap octets')"
            :help="$t('Swap the meaning of input octets and output octets as it is related to RADIUS attributes.')"
            :depend="s.mode === 'radius'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="locationname"
            :label="$t('Location name')"
            :depend="s.mode === 'radius'"
            rules="defaulttype"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="radiuslocationid"
            :label="$t('Location ID')"
            :depend="s.mode === 'radius'"
            rules="defaulttype"
          />
        </template>
        <template #sso>
          <vuci-form-item-input
            :uci-section="s"
            name="oidcdiscoveryurl"
            :label="$t('OpenID Connect metadata document')"
            :required="s.mode === 'sso'"
            rules="protourl"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="oidcclientid"
            :label="$t('OpenID Connect Client ID')"
            maxlength="256"
            :required="s.mode === 'sso'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="oidcclientsecret"
            :label="$t('OpenID Connect Client Secret')"
            maxlength="1024"
            :required="s.mode === 'sso'"
            password
            sensitive
          />
          <tlt-form-model-item :label="$t('Redirect URI')">
            <div class="flex justify-center items-center">
              {{ redirectURI }}
              <tlt-hint
                :hints="[{ info: $t('Copied.') }]"
                show-on-click
              >
                <tlt-button
                  type="icon"
                  icon="copy"
                  color="tertiary"
                  @click="$copyToClipboard(redirectURI)"
                />
              </tlt-hint>
            </div>
          </tlt-form-model-item>
        </template>

        <template #walledgarden>
          <vuci-form-item-select
            :uci-section="s"
            name="uamblocklist"
            :label="$t('Mode')"
            :help="$t('Select mode for blocking.')"
            :options="modeList"
            @change="setList"
          />
          <tlt-inline-message
            v-show="s.uamblocklist === '1'"
            type="info"
            :message="$t(`All traffic will be allowed, make sure to block captive portal detection URLs`)"
          />
          <vuci-form-item-text-area
            :uci-section="s"
            name="uamdomainfile"
            :label="$t('Address list')"
            :help="
              $t(
                'List of addresses the client can access without first authenticating. One record per line. See placeholder for accepted formats. Some domains require both \'www\' and non-\'www\' versions to be entered to ensure proper blocking.'
              )
            "
            :placeholder="walledGardenPlaceholder"
            :rules="validateAddressList"
          />
        </template>
        <template #urlparams>
          <vuci-form-item-input
            :uci-section="s"
            name="paramuamip"
            :label="$t('UAM IP')"
            :help="$t('The IP Address of the Captive Portal gateway.')"
            :depend="s.landingpage === 'ext'"
            placeholder="uamip"
            rules="urlparam"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="paramuamport"
            :label="$t('UAM port')"
            :help="$t('The port on which the Captive Portal will serve web content.')"
            :depend="s.landingpage === 'ext'"
            placeholder="uamport"
            rules="urlparam"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="paramcalled"
            :label="$t('Called')"
            :help="$t('The MAC address of the IP Address of the Captive Portal gateway.')"
            :depend="s.landingpage === 'ext'"
            placeholder="called"
            rules="urlparam"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="parammac"
            :label="$t('MAC')"
            :help="$t('The MAC address of the client trying to gain Internet access.')"
            :depend="s.landingpage === 'ext'"
            placeholder="mac"
            rules="urlparam"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="paramip"
            :label="$t('IP')"
            :help="$t('The IP Address of the client trying to gain Internet access.')"
            :depend="s.landingpage === 'ext'"
            placeholder="ip"
            rules="urlparam"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="paramnasid"
            :label="$t('NAS id')"
            :help="$t('An identification for the Captive Portal used in the RADIUS request.')"
            :depend="s.landingpage === 'ext'"
            placeholder="nasid"
            rules="urlparam"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="paramsessionid"
            :label="$t('Session id')"
            :help="$t('The unique identifer for session.')"
            :depend="s.landingpage === 'ext'"
            placeholder="sessionid"
            rules="urlparam"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="paramuserurl"
            :label="$t('User url')"
            :help="
              $t(
                'The URL which the user tried to access before he were redirected to the \
              Captive Portal\'s URL\'s pages'
              )
            "
            :depend="s.landingpage === 'ext'"
            placeholder="userurl"
            rules="urlparam"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="paramchallenge"
            :label="$t('Challenge')"
            :help="
              $t(
                'A challenge that should be used together with the user\'s password to create \
              an encrypted phrase used to log on'
              )
            "
            :depend="s.landingpage === 'ext' && s.nochallenge"
            placeholder="challenge"
            rules="urlparam"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="param1"
            :label="$t('Custom 1')"
            :help="$t('Add custom name and custom value which will be displayed in url parameters.')"
            :depend="s.landingpage === 'ext'"
            :placeholder="$t('Custom name')"
            rules="urlparam"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="param1value"
            label=" "
            :depend="s.landingpage === 'ext'"
            :placeholder="$t('Custom name')"
            rules="credentials_validate('allow-space')"
            maxlength="512"
            :options="paramOptions"
            allow-create
          />
          <vuci-form-item-input
            :uci-section="s"
            name="param2"
            :label="$t('Custom 2')"
            :help="$t('Add custom name and custom value which will be displayed in url parameters.')"
            :depend="s.landingpage === 'ext'"
            :placeholder="$t('Custom name')"
            rules="urlparam"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="param2value"
            label=" "
            :depend="s.landingpage === 'ext'"
            :placeholder="$t('Custom name')"
            rules="credentials_validate('allow-space')"
            maxlength="512"
            :options="paramOptions"
            allow-create
          />
        </template>

        <template #uscripts>
          <vuci-form-item-text-area
            :uci-section="s"
            name="conup"
            :label="$t('Session up')"
            :help="$t('Script executed after a session is authorized.')"
            :rules="validateScripts"
            :placeholder="'#!/bin/sh\n/usr/bin/logger -t &quot;example&quot; &quot;Example user ${USER_NAME} logged on.&quot;'"
          />
          <vuci-form-item-text-area
            :uci-section="s"
            name="condown"
            :label="$t('Session down')"
            :help="$t('Script executed after a session has moved from authorized state to unauthorized.')"
            :rules="validateScripts"
            :placeholder="'#!/bin/sh\n/usr/bin/logger -t &quot;example&quot; &quot;Example user ${USER_NAME} logged out.&quot;'"
          />
          <vuci-form-item-text-area
            :uci-section="s"
            name="usersignup"
            :label="$t('User signup')"
            :help="$t('Script executed after a new user has been created during signup process.')"
            :rules="validateScripts"
            :placeholder="'#!/bin/sh\n/usr/bin/logger -t &quot;example&quot; &quot;New user created ${USER_NAME}.&quot;'"
          />
        </template>
      </tlt-tabs>
    </vuci-named-section>
  </vuci-form>
</template>
<script>
import { ipv4Utils } from '@/utils/ipUtils'
import { normalizeFileName } from '@/plugins/certificates'

export default {
  inject: ['formOptions', 'handleEditError'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      landingPageState: this.section.landingpage === 'ext',
      radiusPageState: this.section.mode === 'radius',
      singleSignOnState: this.section.mode === 'sso',
      moreif: this.section.moreif,
      successOptions: [
        ['uam', this.$t('Success page')],
        ['original', this.$t('Original URL')],
        ['custom', this.$t('Custom')]
      ],
      protocolOptions: [
        ['http', 'HTTP'],
        ['https', 'HTTPS']
      ],
      landingPageOptions: [
        ['int', this.$t('Internal')],
        ['ext', this.$t('External')]
      ],
      walledGardenPlaceholder: 'example.com\nwww.example.com',
      modeList: [
        ['0', this.$t('Allowlist')],
        ['1', this.$t('Blocklist')]
      ],
      macCase: [
        {
          value: 'upper',
          name: this.$t('Upper')
        },
        {
          value: 'lower',
          name: this.$t('Lower')
        }
      ],
      macDelimiter: [
        {
          value: 'none',
          name: this.$t('None')
        },
        {
          value: 'dash',
          name: this.$t('Dash')
        },
        {
          value: 'colon',
          name: this.$t('Colon')
        }
      ],
      savedList: '',
      defaultBlocklist:
        'thinkdifferent.us\ncaptive.apple.com\nattwifi.apple.com\nwww.appleiphonecell.com\nwww.itools.info\nwww.ibook.info\nwww.airport.us\napple.com.edgekey.net\nakamaiedge.net\nakamaitechnologies.com\nclients1.google.com\nclients2.google.com\nclients3.google.com\nclients4.google.com\nclients5.google.com\nclients6.google.com\nconnectivitycheck.android.com\nconnectivitycheck.gstatic.com\nwww.gstatic.com\nplay.googleapis.com\nnetwork-test.debian.org\ndetectportal.firefox.com\nwww.msftconnecttest.com\nwww.msftncsi.com\nipv6.msftncsi.com\nipv6.msftncsi.com.edgesuite.net\nwww.msftncsi.com.edgesuite.net\nteredo.ipv6.microsoft.com\nteredo.ipv6.microsoft.com.nsatc.net\nconnectivity-check.ubuntu.com\nadult-filter-dns.cleanbrowsing.org\nfamily-filter-dns.cleanbrowsing.org\nsecurity-filter-dns.cleanbrowsing.org\none.one.one.one\n1dot1dot1dot1.cloudflare-dns.com\ndot.xfinity.com\ndot.cox.net\ndns.sb\ndns.google\ndns.google.com\n8888.google\ndns64.dns.google\ndns9.quad9.net\ndot.quickline.ch\ndnsnl.alekberg.net\ndoh.cleanbrowsing.org\nchrome.cloudflare-dns.com\ndoh.xfinity.com\ndoh.cox.net\nodvr.nic.cz\ndoh.dns.sb\npublic.dns.iij.jp\ndns.levonet.sk\nchromium.dns.nextdns.io\ndoh.opendns.com\ndoh.familyshield.opendns.com\ndns11.quad9.net\ndns10.quad9.net\ndns.quad9.net\ndoh.quickline.ch\ndoh-01.spectrum.com\ndoh-02.spectrum.com'
    }
  },
  computed: {
    hotspotMessage() {
      if (this.section.network.match(/wifi\d+/)) return this.invokeWirelessErrorMessage()
      else return this.invokeInterfaceErrorMessage()
    },
    additionalInterfaces() {
      const fixedName =
        this.moreif?.map(iface => {
          const filteredWifi = this.formOptions().wifiDevices.find(device => device.wifi_id === iface)
          return [`${filteredWifi.wifi_id}`, `${filteredWifi.ssid}`]
        }) || []
      return fixedName.concat(
        this.formOptions()
          .ifaceList()
          .filter(iface => iface[0] !== this.section.network)
      )
    },
    currentUsername() {
      return this.$store.username || ''
    },
    userScriptsPermission() {
      const groupId = this.formOptions().systemUsers.find(user => user.username === this.currentUsername)?.group
      return groupId === 'root'
    },
    tabs() {
      return [
        { name: 'general', title: this.$t('General') },
        { name: 'advanced', title: this.$t('Advanced') },
        { name: 'radius', title: this.$t('Radius'), show: this.radiusPageState },
        { name: 'walledgarden', title: this.$t('Walled garden') },
        { name: 'uscripts', title: this.$t('User scripts'), show: this.userScriptsPermission },
        { name: 'urlparams', title: this.$t('URL parameters'), show: this.landingPageState },
        { name: 'sso', title: this.$t('Single sign-on'), show: this.singleSignOnState }
      ]
    },
    paramOptions() {
      const paramOptions = this.formOptions().wifiDevices.map(device => [device.ssid, `${this.$t('SSID:')} ${device.ssid}`])
      paramOptions.push([this.formOptions().system.hostname, `${this.$t('Hostname:')} ${this.formOptions().system.hostname}`])
      paramOptions.push([this.formOptions().system.fw_version, `${this.$t('FW version:')} ${this.formOptions().system.fw_version}`])
      return paramOptions
    },
    modeOptions() {
      const modeOptions = [
        ['local', this.$t('Local users')],
        ['radius', this.$t('Radius')],
        ['mac_auth', this.$t('MAC authentication')],
        ['sso', this.$t('Single sign-on')]
      ]
      if (this.formOptions().modems.length !== 0) modeOptions.push(['sms_otp', this.$t('SMS OTP')])
      return modeOptions
    },
    groupOptions() {
      return this.formOptions().hotspotGroups.length !== 0 ? this.formOptions().hotspotGroups.map(group => group.name) : [['', this.$t('No groups available')]]
    },
    caCertificates() {
      const filteredCerts = this.formOptions().certificates.filter(cert => (cert.cert_type === 'ca' || cert.cert_type === 'import') && cert.type === 'cert')
      return this.mapCertificateFiles(filteredCerts)
    },
    clientCertificates() {
      const filteredCerts = this.formOptions().certificates.filter(cert => cert.cert_type !== 'ca' && cert.type === 'cert' && cert.cert_type !== 'root_ca')
      return this.mapCertificateFiles(filteredCerts)
    },
    privateKeys() {
      const filteredCerts = this.formOptions().certificates.filter(cert => cert.type === 'key')
      return this.mapCertificateFiles(filteredCerts)
    },
    redirectURI() {
      const defaultRedirectUrl = 'http://192.168.182.1:3990/ssocallback'
      const uamlisten = this.section.uamlisten
      const uamport = this.section.uamport
      const protocol = this.section.protocol
      const domain = this.section.domain
      const subdomain = this.section.subdomain
      const landingPage = this.section.landingpage
      const httpsRedirect = this.section.https_redirect
      if (domain && subdomain && ((landingPage === 'ext' && httpsRedirect === '1') || (landingPage === 'int' && protocol === 'https'))) {
        return `https://${subdomain}.${domain}/ssocallback`
      }
      if (subdomain && domain) return `http://${subdomain}.${domain}/ssocallback`
      if (uamlisten === '' && uamport === '') return defaultRedirectUrl
      if (uamlisten && uamport && protocol === 'https' && landingPage === 'int') return `https://${uamlisten}:${uamport}/ssocallback`
      return `http://${uamlisten}:${uamport}/ssocallback`
    }
  },
  methods: {
    normalizeFileName(filePath) {
      return normalizeFileName(filePath)
    },
    validateNetworkMask(val) {
      const mask = val.split('/').at(-1)
      return { isValid: mask >= 16 && mask <= 30, message: this.$t('Netmask must be from %s to %s').format(16, 30) }
    },
    setList(self, val) {
      self.uciSection.uamdomainfile = val === '1' ? this.defaultBlocklist : this.savedList
    },
    validateScripts(v) {
      const split = v.split('\n')
      if (split[0] !== '#!/bin/sh') return { isValid: false, message: this.$t('File content must start with #!/bin/sh') }
      return { isValid: true }
    },
    mapCertificateFiles(files) {
      return files.map(cert => [cert.path, normalizeFileName(cert.fullname)])
    },
    changeLandingPageState(self) {
      this.landingPageState = self.model === 'ext'
    },
    changeAuthState(self) {
      this.validateEnable(self)
      this.radiusPageState = self.model === 'radius'
      this.singleSignOnState = self.model === 'sso'
    },
    invokeInterfaceErrorMessage() {
      const filteredDhcp = this.formOptions().dhcp.find(dhcp => dhcp.id === this.section.network && dhcp.enable_dhcpv4 === '1')
      if (!filteredDhcp) return
      return this.$t('Enabling Hotspot instance will disable the DHCP server running on interface "%s".').format(filteredDhcp.interface.toUpperCase())
    },
    invokeWirelessErrorMessage() {
      const s = this.formOptions().wirelessDevice.find(s => s.wifi_id === this.section.network)
      if (!s?.network) return
      return this.$t('Enabling Hotspot instance will remove all networks attached to wireless "%s" interface.').format(s.ssid)
    },
    extraLoad() {
      return this.$axios
        .get(`/api/hotspot/config/${this.section.id}`)
        .then(res => {
          this.savedList = res.data.uamdomainfile
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load Hotspot data'))
        })
    },
    validateEnable(self) {
      const mode = self.uciSection.mode === 'local'
      if (self.uciSection.enabled === '1' && mode && this.formOptions().users.length === 0) {
        this.$message.error(this.$t('To enable the Hotspot please create at least one user where authentication is set to "Local users".'))
        self.uciSection.enabled = '0'
      }
      this.showMessageAuth(self)
      this.showWirelessMessage(self)
    },
    showMessageAuth(self) {
      const warningMsg = this.$t('RADIUS Protocol under RFC 2865 is susceptible to forgery attacks. We recommend enabling Require Message-Authenticator option in Radius settings.')
      const radiusMode = self.uciSection.mode === 'radius'
      const requiredMessageAuth = self.uciSection.radiusrequiremessageauth === '0'
      if (self.uciSection.enabled === '1' && radiusMode && requiredMessageAuth) {
        this.$notification.info(warningMsg)
      } else {
        this.$notification.remove(warningMsg)
      }
    },
    showWirelessMessage(self) {
      const instance = self.uciSection
      const wireless = this.formOptions().wifiDevices.find(w => w.wifi_id === instance.network)
      if (wireless && wireless.status === '0' && instance.enabled === '1') {
        instance.enabled = '0'
        return this.$notification.info({
          id: 'disabled_interface',
          title: this.$t('Configure wireless'),
          text: this.$t(`Wireless interface '%s' must be enabled before activating hotspot.`).format(wireless.ssid),
          action: {
            text: this.$t('Update settings'),
            to: `/network/wireless/ssids?edit=${wireless.id}`,
            type: 'button'
          }
        })
      }
    },
    validateIPRange(ipValue = '', networkValue = '') {
      const [min, max] = ipv4Utils.getIPRange(networkValue)
      const match = ipv4Utils.checkIfInRange(ipValue, min, max)
      if (!match) {
        return {
          isValid: false,
          message: this.$t('IP Address should be in the range of Hotspot network')
        }
      }
      return { isValid: true }
    },
    validateAddressList(val) {
      // ensures the domain ends with a valid TLD of 2 to 6 alphabetic characters
      const domainRegex = /^(?!-)(?:[A-Za-z0-9-]{1,63}\.)+[A-Za-z]{2,6}$/
      const lines = val.split('\n')
      const invalidValues = lines.filter(value => {
        if (value === '') return false
        if (!domainRegex.test(value)) return true
        // additional check for domains starting with 'www'
        if (value.startsWith('www.') && !/^www\.(?:[A-Za-z0-9-]{1,63}\.)+[A-Za-z]{2,}$/.test(value)) return true
        this.$VuciValidator.value = value
        const resHostname = this.$VuciValidator.hostname()
        if (!resHostname.isValid) return true
        return false
      })
      if (invalidValues.length !== 0) return { isValid: false, message: this.$t('Domain names are accepted (e.g., example.com).') }
      return { isValid: true }
    },
    getProfileObject(profile) {
      return this.formOptions().profiles.data.find(prof => prof.id === profile)?.options
    },
    async profileChanged(self) {
      this.formOptions()
        .profiles.data.filter(prof => prof.id !== self.model)
        .forEach(prof => {
          this.deleteProfileData(self, prof.id)
        })
      const object = this.getProfileObject(self.model)
      Object.keys(object).forEach(key => {
        const value = object[key]
        if (key === 'param1value') {
          self.uciSection[key] = this.formOptions().system.fw_version
        } else {
          self.uciSection[key] = value
        }
      })
      if (self.model === 'purple' && self.uciSection.mode === 'radius') {
        await this.$nextTick()
        self.uciSection.swapoctets = '1'
      }
    },
    deleteProfileData(self, profile) {
      const object = this.getProfileObject(profile)
      Object.keys(self.uciSection).forEach(key => {
        if (key in object) self.uciSection[key] = ''
      })
    },
    onBeforeSave() {
      if (this.section.mode !== 'radius' && this.section.macauth === '') {
        const section = this.section
        section.mac_case = ''
        section.mac_delimiter = ''
      }
      return Promise.resolve(true)
    }
  }
}
</script>
