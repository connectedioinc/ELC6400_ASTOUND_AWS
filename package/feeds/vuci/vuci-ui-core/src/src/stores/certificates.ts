import { ref, computed, watch, watchEffect } from 'vue'
import { defineStore } from 'pinia'
import { useMainStore } from '@/stores/main'
import { useAlerts, type AlertAction, type AlertMessageOptions } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'
import { session } from '@ui-core/plugins/session'
import { useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { reconnect } from '@ui-core/plugins/helper'
import { useTimer } from '@ui-core/composables/useTimer'
import { utils } from '@/plugins/utils'
import type { CertConfig, GeneratedCert } from '@/types/certTypes'
import { filterFiles, mapToSelectOption } from '@/plugins/certificates'
import type { SelectOption } from '@ui-core/tlt-design/form/core/select/TltSelect.vue'
import { isArray } from '@ui-core/utils/inspect'

export type CertificateInfo = Pick<GeneratedCert, 'cert_type' | 'name' | 'fullname'> & {
  daysLeft: number
  isExpired: boolean
}

export interface ExpirationGroups {
  expired: CertificateInfo[]
  expiring: CertificateInfo[]
}

export interface HttpsCertificateInfo {
  status: 'expired' | 'critical' | 'warning'
  formattedTime: string | null
  isCustomCertificate: boolean
  name: string
  isExpired: boolean
  expires?: number
  cert?: string
  cert_type?: string
  services?: string[]
}

export interface CertificateAlert extends Omit<AlertMessageOptions, 'id' | 'action'> {
  id: string
  name?: string
  action?: AlertAction
}

export const useCertificatesStore = defineStore('certificates', () => {
  const $t = useTranslate()
  const alert = useAlerts()
  const message = useMessages()
  const mainStore = useMainStore()

  const certificates = ref<CertConfig | null>(null)
  const deviceTime = ref<number>(0)
  const httpsCertificate = ref<HttpsCertificateInfo | null>(null)

  const request = ref<Promise<any> | undefined>(undefined)

  const isGenerating = computed(() => {
    // Prevent excessive calling - exclude dh certificates from generating check
    return (certificates.value?.generating || []).filter(cert => cert.type !== 'dh').length > 0
  })

  const calculateExpirationDetails = (expirationTimestamp: number, deviceTime: number) => {
    const diffSeconds = expirationTimestamp - deviceTime
    const diffMs = diffSeconds * 1000
    const daysUntilExpiration = Math.floor(diffSeconds / (60 * 60 * 24))
    const isExpired = diffSeconds <= 0
    return {
      daysLeft: Math.max(0, daysUntilExpiration),
      isExpired,
      formattedTime: isExpired ? null : utils.parseTwoUnitRelativeTime(diffMs)
    }
  }

  const getCertificateExpirationInfo = (certificates: GeneratedCert[], deviceTime: number): ExpirationGroups => {
    if (!certificates?.length) {
      return { expired: [], expiring: [] }
    }
    const expired: CertificateInfo[] = []
    const expiring: CertificateInfo[] = []
    certificates.forEach(cert => {
      if (!cert.datetime || cert.datetime === '-') return
      const expirationTimestamp = Number(cert.datetime)
      const { daysLeft, isExpired } = calculateExpirationDetails(expirationTimestamp, deviceTime)
      const certInfo: CertificateInfo = {
        daysLeft,
        isExpired,
        cert_type: cert.cert_type,
        name: cert.name,
        fullname: cert.fullname
      }
      if (isExpired) {
        expired.push(certInfo)
      } else {
        expiring.push(certInfo)
      }
    })
    return { expired, expiring }
  }

  const checkHttpsCertificateExpiration = (cert: { expires: string | number; cert: string }, deviceTime: number): HttpsCertificateInfo | null => {
    if (!cert.expires) return null
    const expirationTimestamp = Number(cert.expires)
    const { daysLeft, isExpired, formattedTime } = calculateExpirationDetails(expirationTimestamp, deviceTime)
    const isCustomCertificate = cert.cert !== '/etc/uhttpd-ca.crt'
    const name = cert.cert
    if (isExpired) {
      return {
        status: 'expired',
        formattedTime: null,
        isCustomCertificate,
        name,
        isExpired: true,
        expires: expirationTimestamp,
        cert: cert.cert
      }
    }
    if (daysLeft <= 45) {
      const status = daysLeft <= 15 ? 'critical' : 'warning'
      return {
        status,
        formattedTime,
        isCustomCertificate,
        isExpired: false,
        name,
        expires: expirationTimestamp,
        cert: cert.cert
      }
    }
    return null
  }

  const createAlert = (config: Omit<AlertMessageOptions, 'id'> & { id: string }, name?: string): CertificateAlert => ({
    id: config.id,
    type: config.type,
    title: config.title,
    text: config.text,
    global: true,
    name,
    action: isArray(config.action) ? config.action[0] : typeof config.action === 'function' ? undefined : config.action
  })

  const generateCertificateAlert = (certificates: CertificateInfo[], type: 'expired' | 'expiring', daysThreshold: number): CertificateAlert | null => {
    if (certificates.length === 0) return null
    if (type === 'expired') {
      const config: Omit<AlertMessageOptions, 'id'> & { id: string } = {
        id: 'certificates-expired',
        type: 'error',
        title: $t('Certificates have expired'),
        text: $t('Immediate action required to avoid service disruptions.'),
        action: { text: $t('Manage certificates'), to: '/system/admin/certificates' }
      }
      return createAlert(config)
    }
    const config: Omit<AlertMessageOptions, 'id'> & { id: string } = {
      id: `certificates-expiring-${daysThreshold}-days`,
      type: daysThreshold <= 15 ? 'error' : 'warning',
      title: $t('Certificates will expire in less than %s days').format(daysThreshold),
      text: daysThreshold <= 15 ? $t('Please manage certificates to avoid service disruption.') : $t('Please review and take appropriate action.'),
      action: { text: $t('Manage certificates'), to: '/system/admin/certificates' }
    }
    return createAlert(config)
  }

  const getHttpsAlert = (httpsCert: HttpsCertificateInfo | null): CertificateAlert | null => {
    if (!httpsCert) return null
    const defaultCertInfo = calculateExpirationDetails(Number(certificates.value?.generated.find(i => i.fullname === 'uhttpd.crt')?.datetime), deviceTime.value)
    const isDefaultExpired = defaultCertInfo.isExpired
    const isCustomAndBothExpired = httpsCert.isCustomCertificate && httpsCert.isExpired && isDefaultExpired

    if (httpsCert.isExpired) {
      let text: string
      let actionText: string = $t('Renew')
      if (isCustomAndBothExpired) {
        text = $t('HTTPS and default certificate has expired and must be renewed. Renew the default certificate first, then switch to it or upload new custom certificate.')
        actionText = $t('Renew default')
      } else if (httpsCert.isCustomCertificate) {
        text = $t('To ensure safe and smooth system performance, please renew the certificate immediately. Once regenerated, it will be replaced with a new self-signed certificate.')
      } else {
        text = $t('Immediate action required to ensure safe and smooth system performance.')
      }

      const config: Omit<AlertMessageOptions, 'id'> & { id: string } = {
        id: 'webui-cert-expired',
        type: 'error',
        title: $t('HTTPS certificate has expired'),
        text,
        action: { text: actionText }
      }
      return createAlert(config, httpsCert.name)
    }

    if (httpsCert.status === 'critical' || httpsCert.status === 'warning') {
      const text = httpsCert.isCustomCertificate
        ? $t('Please renew certificate to ensure safe and smooth system performance. Note: If you choose to regenerate this certificate, it will be replaced with a new self-signed certificate.')
        : $t('Please renew certificate to ensure safe and smooth system performance.')

      const config: Omit<AlertMessageOptions, 'id'> & { id: string } = {
        id: `webui-cert-expires-in-less-than-${httpsCert.status === 'critical' ? '15-days' : '45-days'}`,
        type: httpsCert.status === 'critical' ? 'error' : 'warning',
        title: $t('HTTPS certificate will expire in %s').format(httpsCert.formattedTime!),
        text,
        action: { text: $t('Renew') }
      }
      return createAlert(config, httpsCert.name)
    }

    return null
  }

  const processExpiringCertificates = (certificateStates: ExpirationGroups, thresholds: { days: number; type: 'error' | 'warning' }[]): CertificateAlert[] => {
    const alerts: CertificateAlert[] = []
    const sortedThresholds = [...thresholds].sort((a, b) => a.days - b.days)
    sortedThresholds.forEach((threshold, index) => {
      const previousThreshold = sortedThresholds[index - 1]
      const minDays = previousThreshold ? previousThreshold.days + 1 : 0
      const maxDays = threshold.days
      const matchingCerts = certificateStates.expiring.filter(cert => cert.daysLeft >= minDays && cert.daysLeft <= maxDays)
      if (matchingCerts.length > 0) {
        const alert = generateCertificateAlert(matchingCerts, 'expiring', threshold.days)
        if (alert) alerts.push(alert)
      }
    })
    return alerts
  }

  const getAllCertificateAlerts = (
    certificateStates: ExpirationGroups,
    httpsCertificate: HttpsCertificateInfo | null,
    thresholds: { days: number; type: 'error' | 'warning' }[] = [
      { days: 15, type: 'error' },
      { days: 45, type: 'warning' }
    ]
  ): CertificateAlert[] => {
    const alertList: CertificateAlert[] = []
    if (certificateStates.expired.length > 0) {
      const alert = generateCertificateAlert(certificateStates.expired, 'expired', 0)
      if (alert) alertList.push(alert)
    }
    alertList.push(...processExpiringCertificates(certificateStates, thresholds))
    const httpsAlert = getHttpsAlert(httpsCertificate)
    if (httpsAlert) alertList.push(httpsAlert)
    return alertList
  }

  const permissions = computed(() => ({
    accessControlGeneralAccess: session.hasAccess('system/admin/access_control/general', 'read'),
    certificateManagerAccess: session.hasAccess('system/admin/certificates/manager', 'read'),
    hasVuciAppCertificates: mainStore.hasPackages('vuci-app-certificates')
  }))

  const invalidateCertificates = () => {
    certificates.value = null
    deviceTime.value = 0
    httpsCertificate.value = null
  }

  const generatedCertificates = computed(() => certificates.value?.generated || [])

  const certificateStates = computed((): ExpirationGroups => {
    const certs = certificates.value?.generated?.filter(cert => cert.datetime && cert.datetime !== '-') || []
    if (!certs.length || !deviceTime.value) {
      return { expired: [], expiring: [] }
    }
    return getCertificateExpirationInfo(certs, deviceTime.value)
  })

  const allCertificateAlerts = computed((): CertificateAlert[] => {
    return getAllCertificateAlerts(certificateStates.value, httpsCertificate.value)
  })

  const caCertFiles = computed((): SelectOption[] => {
    return filterFiles(generatedCertificates.value, 'cert')
      .filter(v => v.cert_type === 'ca' || v.cert_type === 'import')
      .map(mapToSelectOption)
  })

  const caKeyFiles = computed((): SelectOption[] => {
    return filterFiles(generatedCertificates.value, 'key')
      .filter(v => v.cert_type === 'ca' || v.cert_type === 'import')
      .map(mapToSelectOption)
  })

  const setCertificates = (data: CertConfig) => {
    certificates.value = data
  }

  const setHttpsCertificate = (certData: { cert: string; expires: string } | null) => {
    if (certData && deviceTime.value) {
      httpsCertificate.value = checkHttpsCertificateExpiration(certData, deviceTime.value)
    } else {
      httpsCertificate.value = null
    }
  }

  const $reset = () => {
    invalidateCertificates()
    polling.stop()
  }

  const getCertificates = async (forceRefresh = false) => {
    if (request.value) return request.value
    if (mainStore.renewPassword) return certificates.value
    const { accessControlGeneralAccess, certificateManagerAccess, hasVuciAppCertificates } = permissions.value
    if (!hasVuciAppCertificates) return certificates.value
    if (!forceRefresh && certificates.value !== null && deviceTime.value > 0) {
      return certificates.value
    }
    request.value = axios
      .bulkGet(
        [
          {
            endpoint: '/api/access_control/webui/certificate/status',
            condition: accessControlGeneralAccess
          },
          {
            endpoint: `/api/certificates/config${mainStore.board?.hwinfo?.tpm ? '?include_tpm=true' : ''}`,
            condition: certificateManagerAccess
          },
          '/api/system/device/usage/status?data=localtime'
        ],
        { preventCancel: true }
      )
      .then(([webuiCertResponse, generalCertsResponse, deviceTimeResponse]) => {
        if (deviceTimeResponse.success) {
          deviceTime.value = deviceTimeResponse.data.localtime
        } else {
          message.error($t('Failed to load device time - expiration information may be unavailable'))
        }
        if (generalCertsResponse.success) {
          setCertificates(generalCertsResponse.data)
        } else {
          message.error($t('Failed to load certificate data'))
        }
        if (webuiCertResponse.success) {
          setHttpsCertificate(webuiCertResponse.data[0])
        } else {
          if (webuiCertResponse.errors[0].code === 1) return // "error": "HTTPS is not enabled
          message.error($t('Failed to load uhttpd certificate data'))
        }
        return certificates.value
      })
      .catch(() => {
        message.error($t('An unexpected error occurred'))
      })
      .finally(() => (request.value = undefined))
    return request.value
  }

  const handleUhttpdCertificateRenewal = async () => {
    const uhttpdCert = certificates.value?.generated.find(i => i.fullname === 'uhttpd.crt')
    if (!uhttpdCert) return
    const { isExpired: uhttpdExpired } = calculateExpirationDetails(Number(uhttpdCert.datetime), deviceTime.value)
    const shouldReplace = uhttpdExpired && !uhttpdCert.services?.includes('uhttpd:main') ? '0' : '1'
    return axios
      .post('/api/access_control/webui/actions/generate', {
        data: {
          force: '1',
          replace: shouldReplace
        }
      })
      .then(() => {
        httpsCertificate.value = null
        reconnect($t('Reconnecting'))
      })
      .catch(() => {
        message.error($t('Failed to renew HTTPS certificate.'))
      })
  }

  watch(allCertificateAlerts, (newAlerts, oldAlerts) => {
    if (oldAlerts?.length) {
      const newAlertIds = newAlerts.map(alert => alert.id)
      const removedAlertIds = oldAlerts.map(alert => alert.id).filter(id => !newAlertIds.includes(id))
      removedAlertIds.forEach(id => alert.remove({ id }))
    }
    newAlerts.forEach(alertItem => {
      const alertMethod = alertItem.type === 'error' ? 'error' : 'warning'
      if (alertItem.action && alertItem.id.startsWith('webui-cert')) {
        alertItem.action.onClick = () => handleUhttpdCertificateRenewal()
      }
      alert[alertMethod](alertItem)
    })
  })

  const polling = useTimer({
    method: () => getCertificates(true),
    time: 5000,
    immediate: false,
    autostart: false
  })

  watchEffect(() => {
    if (isGenerating.value) {
      polling.start()
    } else polling.stop()
  })

  return {
    rawData: certificates,
    deviceTime,
    httpsCertificate,
    generatedCertificates,
    caCertFiles,
    caKeyFiles,
    $reset,
    getCertificates,
    polling,
    isGenerating,
    handleUhttpdCertificateRenewal,
    calculateExpirationDetails,
    hasVuciAppCertificates: permissions.value.hasVuciAppCertificates,
    certificateManagerAccess: permissions.value.certificateManagerAccess
  }
})
