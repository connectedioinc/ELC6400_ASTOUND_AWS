import type { GeneratedCert } from '@/types/certTypes'
import type { SelectOption } from '@ui-core/tlt-design/form/core/select/TltSelect.vue'
import { i18n } from '@ui-core/plugins/i18n'
import { useCertificatesStore } from '@/stores/certificates'
import { useMessages } from '@/stores/messages'

/**
 * Filter certificates by type and add key indices
 */
export function filterFiles(data: GeneratedCert[], filter: string, startIndex = 0): GeneratedCert[] {
  return data.filter(v => v.type === filter).map((v, i) => ({ ...v, key: startIndex + i }))
}

/**
 * Maps a certificate object to a SelectOption
 */
export function mapToSelectOption(cert: GeneratedCert): SelectOption {
  return {
    key: cert.fullname,
    value: cert.fullname
  }
}

/**
 * Common certificate prefixes
 */
const CERT_PREFIXES = [
  'dh',
  'cert',
  'key',
  'ca',
  'leftcert',
  'cacert',
  'CAfile',
  'ca_file',
  'user_cert',
  'ca_cert',
  'user_key',
  'client_cert',
  'sslcertfile',
  'sslcafile',
  'private_key',
  'sslkeyfile',
  'publickeyfile',
  'privatekeyfile',
  'server_tls_certificate',
  'mqtt_in_cafile',
  'mqtt_in_certfile',
  'mqtt_in_keyfile',
  'azure_x509certificate',
  'azure_x509privatekey',
  'http_cafile',
  'http_certfile',
  'http_keyfile',
  'mqtt_cafile',
  'mqtt_certfile',
  'mqtt_keyfile',
  'bridge_cafile',
  'bridge_certfile',
  'bridge_keyfile',
  'cert_file',
  'key_file',
  'keyfile',
  'certfile',
  'cafile',
  'tls_ciphers',
  'tls_crt',
  'tls_key',
  'ssl_cert',
  'ssl_cacert',
  'ssl_key'
].sort((a, b) => b.length - a.length)

export const normalizeFileName = (filePath: string): string => {
  const fileName = filePath.split('/').pop()
  if (!fileName || !fileName.startsWith('cbid.')) return fileName ?? filePath
  const filenameParts = fileName.split(' ')
  const actualFilename = filenameParts[0]
  const sizeInfo = filenameParts.slice(1).join(' ')
  const parts = actualFilename.split('.')
  if (parts.length < 5) return fileName
  const [, , , serverTypeWithPrefix, ...remainder] = parts
  let matchedPrefix = ''
  for (const prefix of CERT_PREFIXES) {
    if (serverTypeWithPrefix.startsWith(prefix) && prefix.length > matchedPrefix.length) {
      matchedPrefix = prefix
    }
  }
  const normalizedType = matchedPrefix ? serverTypeWithPrefix.substring(matchedPrefix.length) : serverTypeWithPrefix
  // Handle special case for 'key' and 'cert' prefixes as it can match field name and file extension
  if (matchedPrefix && (matchedPrefix === 'key' || matchedPrefix === 'cert')) {
    if (remainder.length > 0 && remainder[0] === matchedPrefix) {
      return `${normalizedType}.${remainder.join('.')}${sizeInfo ? ' ' + sizeInfo : ''}`
    }
  }
  return `${normalizedType}.${remainder.join('.')}${sizeInfo ? ' ' + sizeInfo : ''}`
}

const MIN_RSA_LENGTH = 2048
const MIN_ECC_LENGTH = 256
export const isTPM2 = (filePath: string, certs: GeneratedCert[]) => {
  const matchingCertificate = certs?.find((cert: GeneratedCert) => cert.path === filePath)
  return matchingCertificate?.tpm2
}

/**
 * Get certificate warning based on encryption type and key size
 */
export function getCertificateWarning(certificatePath: string, certificates: GeneratedCert[]): string | undefined {
  if (!certificatePath || !certificates) return

  const filename = certificatePath.split('/').at(-1)
  if (!filename) return

  const certificate = certificates.find(cert => cert.fullname === filename)
  if (!certificate) return

  const keySize = Number(certificate.key_size)
  const encryption = certificate.encryption as 'rsa' | 'ecc' | undefined

  return getKeySizeWarning(keySize, encryption)
}

export function getKeySizeWarning(keySize: number, encryptionType?: 'rsa' | 'ecc') {
  if (encryptionType === 'rsa') {
    if (keySize < MIN_RSA_LENGTH) return CERT_WARNINGS[1]()
  } else if (encryptionType === 'ecc') {
    if (keySize < MIN_ECC_LENGTH) return CERT_WARNINGS[2]()
  } else if (keySize < MIN_RSA_LENGTH) return CERT_WARNINGS[3]()
}

export const CERT_WARNINGS: Record<number, () => string> = {
  1: () => i18n.t("It's recommended to use a minimum RSA key length of %s bits for the certificate.").format(MIN_RSA_LENGTH),
  2: () => i18n.t("It's recommended to use a minimum ECC key length of %s bits for the certificate.").format(MIN_ECC_LENGTH),
  3: () => i18n.t("It's recommended to use a minimum key length of 2048 bits for the certificate.")
} as const

export function withCertificatesLoaded<T>(promise: Promise<T>): Promise<T> {
  const certificateStore = useCertificatesStore()
  return Promise.all([promise, certificateStore.getCertificates()]).then(res => res[0])
}

export function showTPM2Warning(useTpm: string, hasExportFeature = false) {
  const messages = useMessages()
  const useTPM2Enabled = useTpm === '1'
  if (useTPM2Enabled) {
    const message = hasExportFeature
      ? i18n.t(
          'Keys stored in TPM2 are excluded from exported configurations and from backup files. As a result, the exported configuration will be incomplete and cannot be restored on other devices. When importing the configuration on the same device, TPM2 keys must be manually reselected.'
        )
      : i18n.t('Keys stored in TPM2 are excluded from device backup files. When restoring a backup, TPM2-stored keys must be manually re-uploaded and reconfigured.')

    messages.info({
      title: hasExportFeature ? i18n.t('Configuration Export Limitations') : i18n.t('TPM2 Storage Limitations'),
      text: message
    })
  }
}
