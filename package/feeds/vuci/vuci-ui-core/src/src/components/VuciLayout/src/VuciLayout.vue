<template>
  <div class="flex flex-row relative">
    <a
      v-if="!renewPassword && $store.modalsOpen === 0"
      class="bg-theme-border-primary-strong -top-full focus:top-0 outline-solid outline-1 outline-theme-border-primary-strong focus:opacity-100 py-2.5 px-4 m-2 outline-offset-1 text-base text-white no-underline absolute z-50 transition-opacity duration-200 rounded-lg rounded-tl-none"
      href="#main-content"
    >
      {{ $t('Skip to main content') }}
    </a>
    <vuci-side-nav-bar
      class="text-base sticky top-0 h-screen z-10"
      :path-exists="pathExists"
      :inert="inert"
    />
    <div
      :inert="inert"
      class="flex-1 flex flex-col items-center min-w-0 relative min-h-screen overflow-clip"
    >
      <vuci-header />
      <div class="flex-1 w-full">
        <div class="max-w-384 lg:mx-10 4xl:mx-auto mx-4 mb-6 mt-8">
          <section class="flex flex-col gap-4 mb-4">
            <tlt-breadcrumbs :crumbs="defaultCrumbs" />
            <tlt-stack
              v-if="$alert.alerts.length > 0"
              v-slot="{ item: alert }"
              :items="$alert.alerts"
              class="w-full mb-2"
              wrapper-class="bg-theme-bg-surface rounded-sm"
              floating
            >
              <tlt-alert
                :id="alert.id"
                :type="alert.type"
                :title="alert.title"
                :text="alert.text"
                :action="alert.action"
                :raw-html="alert.rawHtml"
                has-close
                @close="alert.global ? $alert.toNotification(alert) : $alert.remove(alert.id)"
              />
            </tlt-stack>
          </section>
          <main
            id="main-content"
            class="scroll-mt-[var(--header-height)]"
            tabindex="-1"
          >
            <PageWrapper>
              <RouterView :key="$route.path" />
            </PageWrapper>
          </main>
        </div>
      </div>
      <vuci-footer />
    </div>
    <sim-card-unblock
      :id="modemId"
      :open="showModal"
      :type="modalType"
      @close="showModal = false"
    />
    <app-overlay v-show="$store.collapsedMobileMenu" />
    <vuci-side-widget-controller v-if="$store.hasPackages(['overview-ui', 'side-widget']) && !$route.path.includes('/site_manager')" />
    <password-renew-modal
      :open="renewPassword"
      :first-login="firstLogin"
    />
  </div>
</template>
<script>
import { h } from 'vue'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
import { useCertificatesStore } from '@/stores/certificates'
import TltBreadcrumbs from './TltBreadcrumbs.vue'
import VuciSideNavBar from './VuciSideNavBar/VuciSideNavBar'
import VuciHeader from './VuciHeader/VuciHeader.vue'
import VuciFooter from './VuciFooter/VuciFooter.vue'
import { formBus } from '@ui-core/vuci-form'
import PasswordRenewModal from './PasswordRenewModal.vue'
import VuciSideWidgetController from './SideWidget/VuciSideWidgetController.vue'
import AppOverlay from './AppOverlay.vue'
import TltAlert from '@/components/Messenger/TltAlert.vue'
import { isString } from '@ui-core/utils/inspect.ts'
import TltButton from '@ui-core/tlt-design/form/core/TltButton.vue'
import TltStack from './TltStack.vue'
import { loadComponent } from '@/components/package_components/conditional.js'
import { useMobileUtilitiesUtils } from '@/composables/useMobileUtilities'
import { useNavigationCrumbs } from '@/composables/useNavigationCrumbs'
import { useSubnetConflictEvent } from '@/composables/useSubnetConflictEvent'

export default {
  components: {
    TltAlert,
    TltBreadcrumbs,
    VuciSideNavBar,
    VuciHeader,
    VuciFooter,
    PasswordRenewModal,
    VuciSideWidgetController,
    SimCardUnblock: loadComponent('vuci-app-mobile-ui', 'SimCardUnblock'),
    AppOverlay,
    TltStack
  },
  setup() {
    const { defaultCrumbs } = useNavigationCrumbs()
    const { handleSubnetConflictEvent } = useSubnetConflictEvent()
    return { defaultCrumbs, handleSubnetConflictEvent }
  },
  data() {
    return {
      eventSubscriber: null,
      modemRestart: null,
      forcedModemUpdate: false,
      showModal: false,
      showFirstLoginModal: false,
      modemId: '',
      message: '',
      modalType: 1,
      lastEventId: 0,
      bootstrapAvailable: { modem: '', bootstrap: false }
    }
  },
  computed: {
    ...mapState(useMainStore, [
      'renewPassword',
      'formState',
      'passwordPolicy',
      'firmwareUpdateInfo',
      'modalOpen',
      'firmwareUpdateAvailable',
      'modemUpdateAvailable',
      'firstLogin',
      'fotaInfo',
      'formLoading'
    ]),
    pathExists() {
      const { matched, name } = this.$router.resolve(this.$route.path)
      return matched.length > 1 && name !== 'not-found'
    },
    firmwareUpdateShown() {
      return this.fotaInfo?.notify === '1' && this.firmwareUpdateAvailable
    },
    modemUpdateShown() {
      return this.fotaInfo?.notify_modem === '1' && this.modemUpdateAvailable
    },
    analyticsMessageShown() {
      const { enabled, showMessage } = this.$analytics.state
      return !enabled && showMessage
    },
    inert() {
      return this.firstLogin || this.modalOpen || this.showModal
    }
  },
  watch: {
    '$route.path'(toPath, fromPath) {
      if (toPath === fromPath) return
      this.$alert.alerts.forEach(alert => {
        isString(alert.id) && alert.id?.includes('simcard_') && this.pinPukRequired(alert.pinPuk, alert.id)
      })
      if (toPath === '/system/flashops/general') {
        this.checkUpdates()
        this.$alert.toNotification({ id: 'firmware-update' })
        this.$alert.toNotification({ id: 'modem-update' })
      }
      if (toPath === '/system/admin/admin') {
        this.$alert.toNotification({ id: 'data-analytics' })
      }
      if (this.bootstrapAvailable.modem) {
        if (toPath.includes('/system/wizard')) {
          this.$alert.remove({ id: 'bootstrap_%s'.format(this.bootstrapAvailable.modem) })
        } else if (fromPath.includes('/system/wizard') && !toPath.includes('/system/wizard')) {
          this.updateBootstrapAlert(this.bootstrapAvailable.modem)
        }
      }
      // temporarily sets tabindex to make body focusable and reset tab order
      document.body.tabIndex = -1
      document.body.focus()
      document.body.removeAttribute('tabindex')
    },
    'fotaInfo.enabled'(value) {
      if (value !== '1') return
      this.checkUpdates()
    },
    firmwareUpdateShown(show) {
      const version = this.$store.fotaInfo?.latest === '0' ? this.$store.firmwareUpdateInfo?.stable_version : this.$store.firmwareUpdateInfo?.version
      if (this.$route.path === '/system/flashops/general') return
      if (!show) return this.$alert.remove({ id: 'firmware-update' })
      this.$alert.info({
        id: 'firmware-update',
        title: this.$t('Firmware update is available'),
        text: this.$t('Please update your device to %s version to ensure safe and smooth system performance.').format(version),
        global: true,
        action: {
          text: this.$t('Update now'),
          to: '/system/flashops/general'
        }
      })
    },
    passwordPolicy: {
      handler(show) {
        this.$alert.remove({ id: 'password-expiration' })
        if (!show.current_days_left || show.current_days_left === '0') return
        const daysLeft = Number(show.current_days_left)
        if (isNaN(daysLeft)) return
        const type = daysLeft <= 15 ? 'error' : daysLeft <= 30 ? 'warning' : null
        if (type) {
          this.$alert[type]({
            id: 'password-expiration',
            title: this.$t('Your password will expire in %s day(s).').format(show.current_days_left),
            text: this.$t(
              'Your password is nearing expiration and must be updated to maintain secure and uninterrupted access to WebUI. If the password expires, you will lose access to all WebUI pages on this device.'
            ),
            global: true,
            action: {
              text: this.$t('Renew password'),
              to: '/system/admin/multiusers/change_password'
            }
          })
        }
      },
      immediate: true
    },
    modemUpdateShown(show) {
      if (this.$route.path === '/system/flashops/general') return
      if (!show) return this.$alert.remove({ id: 'modem-update' })
      this.$alert.info({
        id: 'modem-update',
        title: this.$t("Modem's firmware update is available"),
        text: this.$t("Please update your modem's firmware to ensure safe and smooth performance."),
        global: true,
        action: {
          text: this.$t('Update now'),
          to: '/system/flashops/general'
        }
      })
    },
    analyticsMessageShown: {
      handler(show) {
        if (this.$route.path === '/system/flashops/general' || !this.$session.hasAccess('/system/admin/admin', 'read')) return
        if (!show) return this.$alert.remove({ id: 'data-analytics' })
        this.$alert.info({
          id: 'data-analytics',
          title: this.$t('Help us improve our products and services'),
          text: this.$t('Enable data analytics to help us improve the quality and user experience of our products.'),
          global: true,
          action: {
            text: this.$t('Settings'),
            to: '/system/admin/admin'
          }
        })
      },
      immediate: true
    },
    modemRestart(message) {
      this.$alert.remove({ id: 'modem-restart' })
      if (message)
        this.$alert.warning({
          id: 'modem-restart',
          title: message,
          text: this.$t('Do not power off the device!'),
          global: true,
          action: () =>
            this.forcedModemUpdate ? h('a', { href: this.$brand('modemUpdateWikiURL'), target: '_blank' }, h(TltButton, { 'button-id': 'update-wiki', disabled: false }, this.$t('More info'))) : null
        })
    }
  },
  created() {
    this.lastEventId = null
    if (this.renewPassword) return
    this.getDfotaStatus(false)
    this.checkUpdates()
    this.initializeCertificates()
    this.checkESimProfiles()
    formBus.on('subscribe-reload', () => {
      this.subscribeEvents()
    })
    this.subscribeEvents()
    const systemMenuItem = this.$menu.findMenuItem('/system/flashops/general')
    this.$axios.bulkPost([
      {
        endpoint: '/api/firmware/actions/delete_device_firmware',
        condition: systemMenuItem.write_access
      },
      {
        endpoint: '/api/firmware/actions/delete_modem_firmware',
        condition: systemMenuItem.write_access && this.$store.board?.hwinfo?.mobile && !this.$store.hasPackages('dfota.control')
      },
      {
        endpoint: '/api/package_manager/actions/delete_install_files',
        condition: this.$store.hasPackages('package-manager-api') && this.$menu.findMenuItem('/system/package_manager')?.write_access
      },
      {
        endpoint: '/api/backup/actions/delete',
        condition: this.$menu.findMenuItem('/system/maintenance/backup')?.write_access
      }
    ])
  },
  methods: {
    async subscribeEvents(i = 0) {
      this.$store.eventSource?.abort()
      this.$store.eventSource = null
      const decoder = new TextDecoder()
      const eventSource = new AbortController()
      this.$store.eventSource = eventSource
      try {
        const headers = {
          'X-CSRF-PROTECTION': 1,
          'X-LAST-EVENT-ID': this.lastEventId
        }
        const response = await fetch('/cgi-bin/subscribe.lua', {
          headers: headers,
          signal: eventSource.signal
        })
        if (!response.ok) throw new Error()
        i = 0
        const reader = response.body.getReader()
        let currentEvent = { id: null, data: null }
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const data = decoder.decode(value, { stream: true })
          for (const line of data.split('\n')) {
            if (line.startsWith('id:')) {
              this.lastEventId = line.slice(3).trim()
            } else if (line.startsWith('data:')) {
              try {
                currentEvent.eventData = JSON.parse(line.slice(5).trim())
              } catch (error) {
                /* empty */
              }
            } else if (line.trim() === '') {
              if (currentEvent.eventData) {
                if (currentEvent.id) {
                  this.lastEventId = currentEvent.id
                }
                this.handleEvent(currentEvent.eventData)
              }
              currentEvent = { id: null, eventData: null }
            }
          }
        }
        this.subscribeEvents()
      } catch (error) {
        if (error.name === 'AbortError') return
        else if (error instanceof SyntaxError) {
          this.$message.error(this.$t('Failed to parse subscribe message data'))
          this.subscribeEvents()
        } else if (i < 10) {
          // restarts 10 times
          setTimeout(() => this.subscribeEvents(++i), 500)
        }
      }
    },
    handleEvent(parsedData) {
      const msg = parsedData.event.split('.')
      switch (msg[0]) {
        case 'package_event':
          this.handlePackageEvent(parsedData.data)
          break
        case 'log_db':
          this.$message.error(this.$t('Database or disk is full'))
          break
        case 'reload_routes':
          this.$menu.loadMenu(true)
          this.$session.updateACLs()
          break
        case 'reload_configs': {
          // TODO might be used for caching of data.
          const configs = []
          for (let i = 1; i < msg.length; i++) {
            configs.push(msg[i])
          }
          formBus.emit('reload-configs', configs)
          break
        }
        case 'profile_changed':
          this.$axios
            .get('/api/profiles/status')
            .then(({ data }) => (this.$store.profile = data.current_profile))
            .catch(() => this.$message.error(this.$t('Failed to update profile')))
          break
        case 'dfota_update':
          this.getDfotaStatus(false)
          break
        case 'dfota_error':
          this.getDfotaStatus(true)
          break
        case 'dfota_upgrade':
          this.dfotaFinishMessage(parsedData.data.modem_id, true)
          break
        case 'dfota_finish':
          this.dfotaFinishMessage(parsedData.data.modem_id)
          if (this.$route.path === '/system/flashops/general') {
            this.checkUpdates()
            this.$bus.emit('update-firmware-data')
          }
          break
        case 'dfota_state': {
          const modemText = this.$mobile.getModemById(parsedData.data?.modem_id)?.name
          if (parsedData.data.state_id === 9) this.modemRestart = this.$t('%s firmware updating: %s').format(modemText || this.$t('Modem'), `${parsedData.data.percent} %`)
          else if (parsedData.data.state_id === 10) this.modemRestart = this.$t('Finishing up %s firmware update').format(modemText || this.$t('modem'))
          break
        }
        case 'esim': {
          const modemId = parsedData.data.modem_id
          if (parsedData.data.event_id === 6) this.updateBootstrapAlert(modemId)
          if (this.$route.path.includes('network/mobile/esim_profiles') || this.$route.path.includes('system/wizard/step_wan')) this.$bus.emit('esim_profile_status', parsedData.data)
          else if (parsedData.data.event_id === 6) {
            const modemText = this.showModemNameText(this.$mobile.getModemById(modemId))
            this.$notification.remove({ id: 'simcard_%s'.format(modemId) })
            if (parsedData.data.status === 0) {
              const successText = this.$t('eSIM profile added')
              this.$message.success(modemText ? `${successText} (${modemText})` : successText)
            } else if (parsedData.data.status !== 14) {
              const errorText = this.$mobile.getFailedEsimMessage(parsedData.data.status)
              this.$notification.error({
                id: 'simcard_%s'.format(modemId),
                text: modemText ? `${errorText} (${modemText})` : errorText,
                action: {
                  text: this.$t('Open eSIM Profiles'),
                  disabled: false,
                  to: `/network/mobile/esim_profiles/${modemId}`
                }
              })
            }
          }
          break
        }
        case 'update_language':
          this.$axios
            .get('/api/unauthorized/status')
            .then(({ data }) => {
              this.$i18n.loadLang(data.filename)
            })
            .catch(e => {
              this.$log(e, true)
              this.$message.error(this.$t('Failed to load device language'))
            })
          break
        case 'received_sms':
          this.handleSMSEvent(parsedData.data)
          break
        case 'subnet_conflict':
          this.handleSubnetConflictEvent(parsedData.data)
          break
      }
      if (parsedData.event.includes('memleak_')) {
        this.$message.error(parsedData.data)
      } else if (parsedData.event.includes('pin_event')) {
        this.pinPukRequired(1, parsedData.data.modem_id)
      } else if (parsedData.event.includes('puk_event')) {
        this.pinPukRequired(2, parsedData.data.modem_id)
      } else if (parsedData.event.includes('sim_failure')) {
        const modemId = parsedData.data.modem_id
        if (modemId) {
          this.getModemStatus(modemId).then(modem => {
            if (modem) {
              this.$notification.remove({ id: 'simcard_%s'.format(modemId) })
              this.$alert.remove({ id: 'simcard_%s'.format(modemId) })
              this.$notification.error({ id: 'simcard_%s'.format(modemId), text: this.$t('Consecutive SIM failure detected %s').format(this.showModemNameText(modem, true)) })
            }
          })
        }
      } else if (parsedData.event.includes('all_apns_tried')) {
        const iface = parsedData.data.iface_name
        const modemId = parsedData.data.modem_id
        if (iface) {
          this.$axios
            .get(`/api/interfaces/config/${iface}`)
            .then(res => {
              this.getModemStatus(res.data.modem).then(modem => {
                if (modem) {
                  const modemText = this.showModemNameText(modem)
                  const ifaceModemText = this.$t('on the %s interface%s').format(this.$network.getName(res.data), modemText ? ` (${modemText})` : '')
                  this.$notification.info({
                    id: 'apns_tried_%s'.format(modemId),
                    text: this.$t('All available APNs were tried %s, unable to make connection to operator, try to enter custom APN or adjust mobile settings to make connection').format(
                      ifaceModemText
                    ),
                    action: {
                      text: this.$t('Enter custom APN'),
                      disabled: false,
                      to: `/network/wan?edit=${iface}`
                    }
                  })
                }
              })
            })
            .catch(() => {
              this.$message.error(this.$t('Failed to load interface data'))
            })
        }
      } else if (parsedData.event.includes('mtu')) {
        const iface = parsedData.data.iface_name
        const mtu = parsedData.data.operator_mtu
        if (iface && mtu) {
          this.$axios
            .bulkGet([`/api/interfaces/config/${iface}`, '/api/modems/status'])
            .then(([ifaceData, modemData]) => {
              if (ifaceData.success && modemData.success) {
                const iface = ifaceData.data
                const modem = this.$mobile.parseModems(modemData.data).find(e => e.id === iface.modem)
                if (!modem) return
                const modemText = this.showModemNameText(modem)
                const ifaceModemText = this.$t('on the %s interface%s').format(this.$network.getName(ifaceData.data), modemText ? ` (${modemText})` : '')
                this.$notification.info({
                  id: 'mtu_%s'.format(iface),
                  text: this.$t('Operator network advertises higher/lower MTU: %s %s, if you experience mobile network problems, consider adjusting it').format(mtu, ifaceModemText),
                  action: {
                    text: this.$t('Open WAN page'),
                    disabled: false,
                    to: `/network/wan?edit=${iface}`
                  }
                })
              } else {
                this.$message.error(this.$t('Failed to load interface data'))
              }
            })
            .catch(() => {
              this.$message.error(this.$t('An unexpected error occurred'))
            })
        }
      } else if (parsedData.event.includes('denied_event')) {
        const modemId = parsedData.data.modem_id
        if (modemId) {
          this.getModemStatus(modemId).then(modem => {
            if (modem) {
              const id = 'emm_error_%s'.format(modemId)
              this.$notification.remove({ id })
              this.$notification.info({ id, text: this.$t('Mobile network rejection was recently detected %s').format(this.showModemNameText(modem, true)) })
            }
          })
        }
      } else if (parsedData.event.includes('low_signal_reconnect')) {
        const modemId = parsedData.data.modem_id
        if (modemId) {
          this.getModemStatus(modemId).then(modem => {
            if (modem) {
              this.$notification.info({ id: 'signal_reconnect_%s'.format(modemId), text: this.$t('Low signal reconnect has been triggered %s').format(this.showModemNameText(modem, true)) })
            }
          })
        }
      } else if (parsedData.event.includes('show_low_signal')) {
        const modemId = parsedData.data.modem_id
        if (modemId) {
          this.getModemStatus(modemId).then(modem => {
            if (modem) {
              const text = this.$t('Check if all mobile antennas are attached. If the issue persists, try relocating your device to a different location.')
              this.$notification.info({
                id: 'low_signal_%s'.format(modemId),
                title: this.$t('Mobile signal quality is low %s').format(this.showModemNameText(modem, true)),
                text
              })
            }
          })
        }
      } else if (parsedData.event.includes('hide_low_signal')) {
        const modemId = parsedData.data.modem_id
        if (modemId) {
          this.$notification.remove({ id: 'low_signal_%s'.format(modemId) })
        }
      } else if (parsedData.event.includes('no_esim_profiles_show')) {
        const modemId = parsedData.data.modem_id
        if (modemId) {
          this.getModemStatus(modemId).then(modem => {
            if (modem) {
              this.$alert.info({
                id: 'esim_%s'.format(modemId),
                text: this.$t('No active eSIM profile is available %s').format(this.showModemNameText(modem, true)),
                global: true,
                action: {
                  text: this.$t('Manage profiles'),
                  to: `/network/mobile/esim_profiles/${modemId}`
                }
              })
            }
          })
        }
      } else if (parsedData.event.includes('no_esim_profiles_hide')) {
        const modemId = parsedData.data.modem_id
        if (modemId) {
          this.$alert.remove({ id: 'esim_%s'.format(modemId) })
        }
      } else if (parsedData.event.includes('multi_imsi_auto_apn')) {
        const modemId = parsedData.data.modem_id
        if (modemId) {
          this.getModemStatus(modemId).then(modem => {
            if (modem) {
              this.$notification.info({
                id: 'multi_imsi_%s'.format(modemId),
                title: this.$t('Multi-IMSI SIM detected %s').format(this.showModemNameText(modem, true)),
                text: this.$t('You may need to disable Auto APN and configure the APN manually'),
                action: {
                  text: this.$t('Open WAN page'),
                  to: '/network/wan'
                }
              })
            }
          })
        }
      } else if (parsedData.event.includes('nr5g_network_mode')) {
        const modemId = parsedData.data.modem_id
        this.$bus.emit('nr5g_network_mode', modemId)
      } else if (parsedData.event.includes('mbn_settings_changed')) {
        const modemId = parsedData.data.modem_id
        this.$bus.emit('mbn_settings_changed', modemId)
      } else if (parsedData.event.includes('EMM_ERROR')) {
        const modemId = parsedData.data.modem_id
        const code = parsedData.event.split('_')[2]
        this.mobileRejectCause(modemId, 'emm', this.$mobile.emmErrors(code))
      } else if (parsedData.event.includes('ESM_ERROR')) {
        const modemId = parsedData.data.modem_id
        const code = parsedData.event.split('_')[2]
        this.mobileRejectCause(modemId, 'esm', this.$mobile.esmErrors(code))
      } else if (parsedData.event.includes('5GMM_ERROR')) {
        const modemId = parsedData.data.modem_id
        const code = parsedData.event.split('_')[2]
        this.mobileRejectCause(modemId, '5gmm', this.$mobile.fivegmmErrors(code))
      } else if (['connection_established', 'sim_removed'].some(name => parsedData.event.includes(name))) {
        const modemId = parsedData.data.modem_id
        if (modemId) {
          const ids = ['emm_error_%s', 'esm_error_%s', '5gmm_error_%s', 'simcard_%s', 'apns_tried_%s', 'signal_reconnect_%s', 'multi_imsi_%s']
          ids.forEach(val => this.$notification.remove({ id: val.format(modemId) }))
          const ids2 = ['simcard_%s', 'esim_%s']
          ids2.forEach(val => this.$alert.remove({ id: val.format(modemId) }))
          if (parsedData.event.includes('sim_removed')) this.updateBootstrapAlert(modemId)
        }
      }
    },
    handlePackageEvent(pkgData) {
      formBus.emit('package-event', pkgData)

      const pkg = pkgData?.package
      const pkgType = pkg?.type

      if (pkgType !== 8 && pkgType !== 4) {
        this.$axios.loadPackages(pkgData)
      }

      if (this.$route.path === '/system/package_manager') return
      if (pkg?.errors?.some(e => e.code === 15)) return

      const pkgId = pkg?.package
      const pkgName = pkg?.name ?? pkgId

      if (pkgType === 2) {
        this.$notification.remove({ id: `package_installed_${pkgId}` })
      }

      if (pkgType === 3) {
        this.$notification.remove({ id: `package_errored_${pkgId}` })
        this.$notification.info({
          id: `package_installed_${pkgId}`,
          text: this.$t("The '%s' package has been installed successfully.").format(pkgName)
        })
      }

      if (pkgType === 8 || pkgType === 4) {
        this.$notification.error({
          id: `package_errored_${pkgId}`,
          text: this.$t("Failed to install the '%s' package.").format(pkgName),
          action: {
            text: this.$t('Open Package Manager page'),
            to: '/system/package_manager'
          }
        })
      }
    },
    handleSMSEvent(smsData) {
      const { modem_id: modemID, sms_id: id, sms_rule: isSMSRule } = smsData
      if (isSMSRule) {
        return this.$notification.info({
          id: '%s_sms_rule_%s_%s'.format(id, modemID, this.$utils.getUniqueId()),
          text: this.$t("SMS rule '%s' was triggered").format(useMobileUtilitiesUtils(true).getTranslatedAction(smsData.action_name))
        })
      }
      this.getModemStatus(modemID).then(modem => {
        if (modem) {
          this.$notification.info({
            id: '%s_sms_message_%s_%s'.format(id, modemID, this.$utils.getUniqueId()),
            text: this.$t('New SMS received %s').format(this.showModemNameText(modem, true)),
            action: {
              text: this.$t('Open Messages page'),
              to: '/services/mobile_utilities/sms_messages/read'
            }
          })
          if (this.$route.path === '/services/mobile_utilities/sms_messages/read') this.$bus.emit('received_sms')
        }
      })
    },
    mobileRejectCause(modemId, id, message) {
      this.getModemStatus(modemId).then(modem => {
        if (modem) {
          const modemText = this.showModemNameText(modem)
          this.$notification.remove({ id: '%s_error_%s'.format(id, modemId) })
          this.$notification.error({
            id: '%s_error_%s'.format(id, modemId),
            text: this.$t('Mobile %s reject cause%s: %s').format(id.toUpperCase(), modemText ? ` (${modemText})` : '', message)
          })
        }
      })
    },
    pinPukRequired(type, modemId) {
      this.getModemStatus(modemId).then(modem => {
        if (modem) {
          this.$alert.remove({ id: 'simcard_%s'.format(modemId) })
          this.$notification.remove({ id: 'simcard_%s'.format(modemId) })
          if (!['Inserted', 'Not inserted', 'SIM not inserted'].some(e => modem.pinstate?.includes(e))) {
            const modemText = this.$mobile.getSimModemLabel(modem)
            modem.pinstate = type === 1 ? 'PIN' : type === 2 ? 'PUK' : modem.pinstate
            const pinPukMessage = this.$mobile.getPinPukMessage(modem, modemText)
            if (pinPukMessage?.message) {
              const message = {
                text: pinPukMessage.message,
                global: true,
                id: 'simcard_%s'.format(modem.id),
                pinPuk: type
              }
              if (pinPukMessage.unlockText) {
                message.action = {
                  text: pinPukMessage.unlockText,
                  onClick: () => {
                    this.showModal = true
                    this.modemId = modem.id
                    this.modalType = type
                  }
                }
              }
              this.$alert.error(message)
            }
          }
        }
      })
    },
    getDfotaStatus(error) {
      const errorMessages = {
        166: this.$t('Unable to get manufacturer of modem'),
        167: this.$t('DFOTA is available only for Quectel modems'),
        168: this.$t('Modem not ready'),
        169: this.$t('Connection error to FOTA server'),
        170: this.$t('No update found'),
        171: this.$t('Not enough memory in modem filesystem'),
        172: this.$t('Failed to enter download mode'),
        173: this.$t('Firmware update download was unsuccessful'),
        174: this.$t('Firmware update verify was unsuccessful'),
        175: this.$t('Unable to start firmware update process'),
        176: this.$t('Unable to start firmware update process'),
        177: this.$t('Update using file is not supported on this modem'),
        178: this.$t('Modem firmware update is only available using mobile connection (Mobile connection is not established)'),
        default: this.$t('Failed to update modem firmware')
      }
      if (!this.$store.hasPackages('dfota.control')) return Promise.resolve()
      return this.$axios
        .get('/api/firmware/modem/progress/status')
        .then(res => {
          if (error && res?.data?.status === 'failed') {
            this.$notification.remove({ id: 'dfota_error' })
            this.modemRestart = null
            const modem = res.data.modems?.find(modem => modem.status === 'failed')
            const text = errorMessages[modem?.error_code] || errorMessages.default
            const modemText = this.$mobile.getModemById(modem.id).name || this.$t('Modem')
            this.$notification.error({ id: 'dfota_error', text, title: this.$t('%s update failed').format(modemText) })
          } else {
            const modem = res.data?.modems?.find(modem => ['downloading', 'waiting', 'updating'].includes(modem.status))
            if (modem) {
              const modemText = this.$mobile.getModemById(modem.id).name || this.$t('Modem')
              this.modemRestart = this.$t('%s firmware update is in progress').format(modemText)
              this.forcedModemUpdate = modem.forced === '1'
            }
          }
          this.$store.modemUpdateInfo = null
        })
        .catch(() => {})
    },
    checkUpdates() {
      return this.$axios
        .bulkGet(
          [
            '/api/firmware/device/updates/status',
            {
              endpoint: '/api/firmware/modem/updates/status',
              condition: !!this.$store.board?.hwinfo?.mobile && this.$store.hasPackages('dfota.control')
            }
          ],
          { preventCancel: true }
        )
        .then(([firmwareUpdateRes, modemUpdateRes]) => {
          if (firmwareUpdateRes.success) {
            this.$store.firmwareUpdateInfo = firmwareUpdateRes.data.device
          } else if (firmwareUpdateRes.errors.some(i => i.code === 15)) this.$store.firmwareUpdateInfo = 'N/A'
          if (modemUpdateRes.success) {
            this.$store.modemUpdateInfo = modemUpdateRes.data.modems
          }
        })
        .catch(() => {})
    },
    initializeCertificates() {
      const certificatesStore = useCertificatesStore()
      certificatesStore.getCertificates(true)
    },
    getModemStatus(modemId) {
      return this.$axios
        .get('/api/modems/status')
        .then(res => {
          return this.$mobile.parseModems(res.data).find(e => e.id === modemId)
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load modem status'))
        })
    },
    checkESimProfiles() {
      if (!this.$store.board?.hwinfo?.esim) return
      return this.$axios
        .bulkGet(['/api/esim/config', '/api/esim/status', '/api/modems/status'])
        .then(([eSimConfig, eSimStatus, modemStatus]) => {
          if (!eSimConfig.success || !eSimStatus.success || !modemStatus.success) {
            return this.$message.error(this.$t('Failed to load eSIM profiles'))
          }
          const modemList = this.$mobile.parseModems(modemStatus.data)
          const primaryModem = modemList.find(m => m.primary)
          if (primaryModem.esim_bootstrap) {
            this.bootstrapAvailable = { modem: primaryModem.id, bootstrap: primaryModem.esim_bootstrap }
            this.showBootstrapAlert(primaryModem)
          }

          const esimList = eSimStatus.data.filter(esim => esim.eid !== 'N/A' && !eSimConfig.data.some(config => config.modem === esim.id && config.enabled === '1'))
          esimList.forEach(esim => {
            const modem = modemList.find(e => e.id === esim.id)
            this.$alert.info({
              id: 'esim_%s'.format(modem.id),
              text: this.$t('No active eSIM profile is available %s').format(this.showModemNameText(modem, true)),
              global: true,
              action: {
                text: this.$t('Manage profiles'),
                to: `/network/mobile/esim_profiles/${modem.id}`
              }
            })
          })
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    showModemNameText(modem, addOnThe) {
      if (!this.$mobile.shouldShowModemName(modem)) return ''
      return addOnThe ? this.$t('on the %s').format(modem.name) : modem.name
    },
    dfotaFinishMessage(modemId, showMsg) {
      this.modemRestart = null
      this.forcedModemUpdate = false
      if (showMsg) this.$message.success(this.$t('%s firmware updated successfully').format(this.$mobile.getModemById(modemId).name || this.$t('Modem')))
    },
    updateBootstrapAlert(modemId) {
      if (!this.$store.board?.hwinfo?.esim) return
      if (this.bootstrapAvailable.modem !== modemId || !this.bootstrapAvailable.bootstrap) {
        return this.$alert.remove({ id: 'bootstrap_%s'.format(modemId) })
      }
      this.getModemStatus(modemId).then(modem => {
        if (modem) {
          this.bootstrapAvailable.bootstrap = modem.esim_bootstrap
          this.showBootstrapAlert(modem)
        }
      })
    },
    showBootstrapAlert(modem) {
      this.$alert.remove({ id: 'bootstrap_%s'.format(modem.id) })
      if (this.$route.path.includes('/system/wizard') || !this.bootstrapAvailable.bootstrap) return

      const activeSim = !modem.esim_profile
      let additionalText = this.$t('To download a new profile, go to the eSIM Profile page.')
      const action = {
        text: this.$t('Open eSIM Profiles'),
        to: `/network/mobile/esim_profiles/${modem.id}`,
        disabled: false
      }
      if (activeSim) {
        additionalText = this.$t('To download a new profile, first set eSIM as the active SIM on the Mobile General page, then go to the eSIM Profile page to download the new profile.')
        action.text = this.$t('Open Mobile General')
        action.to = `/network/mobile/general/${modem.id}`
      }
      return this.$alert.info({
        id: 'bootstrap_%s'.format(modem.id),
        text: this.$t('Bootstrap eSIM profile detected. This profile provides limited mobile connectivity, intended only for downloading a new eSIM profile. %s').format(additionalText),
        global: true,
        action
      })
    }
  }
}
</script>
