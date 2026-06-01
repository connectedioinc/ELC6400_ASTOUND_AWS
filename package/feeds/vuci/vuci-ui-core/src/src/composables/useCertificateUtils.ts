import { normalizeFileName } from '@/plugins/certificates'
import { computed } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useCertificatesStore } from '@/stores/certificates'

const toSelectOption = (certificate: { path: string; fullname: string }): [string, string] => [certificate.path, normalizeFileName(certificate.fullname)]

export function useCertificateUtils() {
  const $t = useTranslate()
  const certificatesStore = useCertificatesStore()

  const keyOptionsNonTpm2 = computed(() => certificatesStore.generatedCertificates.filter(cert => cert.type === 'key' && cert.tpm2 !== true).map(toSelectOption))

  const certOptions = computed(() => certificatesStore.generatedCertificates.filter(cert => cert.type === 'cert').map(toSelectOption))

  const caOptions = computed(() =>
    certificatesStore.generatedCertificates.filter(cert => (cert.cert_type === 'ca' || cert.cert_type === 'import' || cert.cert_type === 'root_ca') && cert.type === 'cert').map(toSelectOption)
  )

  const clientCertOptions = computed(() =>
    certificatesStore.generatedCertificates.filter(cert => (cert.cert_type === 'client' || cert.cert_type === 'import' || cert.cert_type === 'scep') && cert.type === 'cert').map(toSelectOption)
  )

  const clientKeyOptionsNonTpm2 = computed(() =>
    certificatesStore.generatedCertificates
      .filter(cert => (cert.cert_type === 'client' || cert.cert_type === 'import' || cert.cert_type === 'scep') && cert.type === 'key' && cert.tpm2 !== true)
      .map(toSelectOption)
  )

  const caOptionsExtended = computed(() =>
    certificatesStore.generatedCertificates
      .filter(cert => (cert.cert_type === 'ca' || cert.cert_type === 'import' || cert.cert_type === 'root_ca' || cert.cert_type === 'scep') && cert.type === 'cert')
      .map(toSelectOption)
  )

  const keyOptionsNonTpm2ForNonRequired = computed(() => makeNonRequiredOptions(keyOptionsNonTpm2.value))

  const certOptionsForNonRequired = computed(() => makeNonRequiredOptions(certOptions.value))
  const clientCertOptionsForNonRequired = computed(() => makeNonRequiredOptions(clientCertOptions.value))
  const clientKeyOptionsNonTpm2ForNonRequired = computed(() => makeNonRequiredOptions(clientKeyOptionsNonTpm2.value))

  function makeNonRequiredOptions(options: [string, string][]): [string, string][] {
    if (options.length === 0) return []
    return [['', $t('None')], ...options]
  }

  return {
    keyOptionsNonTpm2,
    certOptions,
    caOptions,
    clientCertOptions,
    clientKeyOptionsNonTpm2,
    certOptionsForNonRequired,
    clientCertOptionsForNonRequired,
    clientKeyOptionsNonTpm2ForNonRequired,
    caOptionsExtended,
    keyOptionsNonTpm2ForNonRequired
  }
}
