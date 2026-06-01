<template>
  <TltTable
    id="certificates"
    v-model:selected="selected"
    :title="$t('Certificates')"
    :search="searchValue"
    id-key="fullname"
    :data-source="processedCertificates"
    :columns="columns"
    :bulk-actions="bulkActions"
    pagination
    :table-actions="['certificate-actions', { id: 'refresh', buttonProps: { iconLeft: 'refresh' }, callback: refreshCertificates }, 'column-list', 'search']"
  >
    <template #certificate-actions>
      <TableAction
        id="actions"
        :label="$t('Certificate actions')"
        :dropdown-options="certificateActionOptions"
      />
    </template>
    <template #fullname="{ record }">
      <span class="flex row gap-2 items-center">
        {{ normalizeFileName(record.fullname) }}
        <TltBadge
          v-if="record.tpm2"
          size="sm"
        >
          TPM2
        </TltBadge>
        <CertUsage :record="record" />
      </span>
    </template>
    <template #signed_by="{ record }">
      {{ record.signed_by || $t('Not applicable') }}
    </template>
    <template #name="{ record }">
      {{ record.name || '-' }}
    </template>
    <template #key_size="{ record }">
      <div class="flex items-center gap-2">
        <TltHint
          v-if="getCertificateWarning(record.key_size, record?.encryption)"
          :hints="getKeyWarningHints(record)"
        >
          <TltIcon
            icon="warning"
            class="text-theme-text-warning size-5"
          />
        </TltHint>
        {{ record.key_size || '-' }}
      </div>
    </template>
    <template #datetime="{ record }">
      <div class="flex items-center gap-2">
        <TltHint
          v-if="isLessThanDays(record.date, 16) && record.datetime"
          :hints="getExpirationHints(record)"
        >
          <TltIcon
            :icon="record.datetime === $t('Certificate has expired') ? 'error' : 'warning'"
            :class="record.datetime === $t('Certificate has expired') ? 'error' : 'text-theme-text-warning'"
            class="size-5"
          />
        </TltHint>
        <TltHint
          v-if="!isLessThanDays(record?.date, 16) && record.datetime && !record.temp"
          :hints="[{ info: $t('Expires on %s (%s).').format(record.date, record.datetime) }]"
        >
          <TltIcon
            icon="info"
            class="text-theme-text-info size-5"
          />
        </TltHint>
        <span class="truncate min-w-0">
          {{ record.datetime || '-' }}
        </span>
      </div>
    </template>
    <template #details="{ record }">
      <span v-if="record.temp">
        {{ $t('Generating...') }}
      </span>
      <span v-else-if="record?.deleting">
        {{ $t('Deleting...') }}
      </span>
      <TltHint
        v-else
        :hints="privateKeyPreview(record) ? [{ info: $t('Private key details cannot be previewed.') }] : []"
      >
        <TltButton
          button-id="preview"
          :disabled="privateKeyPreview(record)"
          type="text"
          color="primary"
          @click="getCertDetails(record)"
        >
          {{ $t('Preview') }}
        </TltButton>
      </TltHint>
    </template>
  </TltTable>
  <TltModal
    :open="!!certToPreview"
    :nav-bar="[$t('Details')]"
    @close="certToPreview = undefined"
  >
    <cert-details :certificate="certToPreview" />
  </TltModal>
  <CertGeneration
    :open="showCreateModal"
    :certificates="certificatesStore.generatedCertificates"
    @close="showCreateModal = false"
  />
  <CertSigning
    :open="showSigningModal"
    :certificates="certificatesStore.generatedCertificates"
    @close="showSigningModal = false"
  />
  <TltModal
    :open="showImportModal"
    size="medium"
    hide-navigation
    :title="$t('Import certificate')"
    @close="closeModal()"
  >
    <TltForm sid="cert_import_section">
      <TltFormModelItem :label="$t('Certificate')">
        <TltUpload
          ref="certUpload"
          instant
          name="cert_file"
          dynamic-path
          action="/api/certificates/config"
          :path="fileDir"
          :errors="uploadErrors"
          @uploaded="handleAfterUpload"
        />
      </TltFormModelItem>
    </TltForm>
  </TltModal>
  <CertRootCa
    :open="showRootCaModal"
    @close="showRootCaModal = false"
  />
  <CertTpm2Modal
    :open="showTPM2Modal"
    :key-files="certificateKeys()"
    @close="showTPM2Modal = false"
  />
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, useTemplateRef, onUnmounted, nextTick } from 'vue'
import { useMainStore } from '@/stores/main'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { useMessages, usePrompt } from '@/stores/messages'
import { utils } from '@/plugins/utils'
import { date } from '@ui-core/plugins/date'
import { normalizeFileName } from '@/plugins/certificates'
import { useCertificatesStore } from '@/stores/certificates'
import type { Action, TableColumn } from '@ui-core/components/table/types'
import type { Hint } from '@ui-core/tlt-design/widgets/TltHint.vue'
import type { CertConfig, GeneratingCerts, GeneratedCert } from '@/types/certTypes'
import type { DropdownOption } from '@ui-core/tlt-design/layout/TltDropdown.vue'

import CertGeneration from './CertGeneration.vue'
import CertSigning from './CertSigning.vue'
import CertRootCa from './CertRootCa.vue'
import CertDetails from './CertDetails.vue'
import CertTpm2Modal from './CertTpm2Modal.vue'
import CertUsage from './CertUsage.vue'

interface ProcessedCert {
  fullname: string
  type: string
  signed_by?: string
  name?: string
  key_size?: string | number
  datetime?: string
  cert_type?: string
  date: string
  key: number
  temp: boolean
  scep_url?: string
  encryption?: string
  tpm2?: boolean
  password?: string
  path?: string
  services?: string[]
  deleting?: boolean
}

const $t = useTranslate()
const store = useMainStore()
const prompt = usePrompt()
const message = useMessages()
const certificatesStore = useCertificatesStore()

const fileDir = '/etc/certificates'
const MIN_RSA_SIZE = 2048
const MIN_ECC_SIZE = 256

const showCreateModal = ref(false)
const showSigningModal = ref(false)
const showImportModal = ref(false)
const showRootCaModal = ref(false)
const showTPM2Modal = ref(false)
const certToPreview = ref()
const searchValue = ref('')
const certUpload = useTemplateRef('certUpload')
const deletingCertificates = ref<Set<string>>(new Set())
const successfullyDeleted = ref<Set<string>>(new Set())

const warningMessage = computed((): string => $t('We recommend to use at least %s key length.'))

const certificateActionOptions = computed<DropdownOption[]>(() =>
  [
    {
      id: 'create',
      label: $t('Create'),
      icon: 'generate' as const,
      callback: () => (showCreateModal.value = true)
    },
    {
      id: 'sign',
      label: $t('Sign'),
      icon: 'sign' as const,
      callback: () => (showSigningModal.value = true)
    },
    {
      id: 'upload',
      icon: 'download-import' as const,
      label: $t('Import'),
      callback: () => (showImportModal.value = true)
    },
    {
      id: 'configure',
      icon: 'settings' as const,
      label: $t('Configure Root CA'),
      callback: () => (showRootCaModal.value = true)
    },
    store.board?.hwinfo?.tpm
      ? {
          id: 'move-to-tpm2',
          icon: 'key' as const,
          label: $t('Move key to TPM2'),
          callback: () => (showTPM2Modal.value = true)
        }
      : null
  ].filter(v => !!v)
)

const processedCertificates = computed((): ProcessedCert[] => {
  if (!certificatesStore.rawData) return []
  return processFiles(certificatesStore.rawData)
})

const columns: TableColumn<ProcessedCert>[] = [
  {
    dataIndex: 'fullname',
    title: $t('File Name'),
    actions: { sort: true, filter: { type: 'uniqueValues' } }
  },
  {
    dataIndex: 'type',
    title: $t('Type'),
    actions: { sort: true, filter: { type: 'uniqueValues' } }
  },
  {
    dataIndex: 'signed_by',
    title: $t('Signed by'),
    hidden: true,
    actions: { sort: true, filter: { type: 'uniqueValues' } }
  },
  {
    dataIndex: 'name',
    title: $t('Common name'),
    hidden: true,
    actions: { sort: true, filter: { type: 'uniqueValues' } }
  },
  {
    dataIndex: 'key_size',
    title: $t('Key Length (Bits)'),
    actions: { sort: true, filter: { type: 'uniqueValues' } }
  },
  {
    dataIndex: 'datetime',
    title: $t('Expires in'),
    actions: { sort: true, filter: { type: 'uniqueValues' } }
  },
  { dataIndex: 'details', title: $t('Details') }
]

type ProcessedCertValue = ProcessedCert[keyof ProcessedCert]

const selected = ref<ProcessedCertValue[]>([])
const selectedCertificates = computed(() => selected.value.map(fullname => processedCertificates.value.find(cert => cert.fullname === fullname)).filter(cert => !!cert))

const canExport = computed(() => selectedCertificates.value.some(cert => !cert?.temp && !cert.tpm2))
const canDelete = computed(() =>
  selectedCertificates.value.some(cert => !cert?.temp && cert?.cert_type !== 'root_ca' && cert.path !== '/etc/uhttpd.key' && cert.path !== '/etc/uhttpd.crt' && !cert.services?.includes('uhttpd:main'))
)
const canRenew = computed(() =>
  selectedCertificates.value.some(
    cert =>
      (cert?.cert_type === 'scep' && cert.type !== 'Key' && !cert?.fullname.startsWith('ca-')) ||
      (cert.path === '/etc/uhttpd.crt' && !cert.services?.includes('uhttpd:main') && cert.datetime === 'Certificate has expired')
  )
)

const bulkActions = computed<Action<ProcessedCertValue[]>[]>(() => {
  return [
    {
      id: 'renew',
      label: $t('Renew'),
      buttonProps: { disabled: !canRenew.value, iconLeft: 'renew' },
      callback: (certs: ProcessedCertValue[]) => handleBulkAction(certs, 'renew')
    },
    {
      id: 'export',
      label: $t('Export'),
      buttonProps: { disabled: !canExport.value, iconLeft: 'upload-export' },
      callback: (certs: ProcessedCertValue[]) => handleBulkAction(certs, 'export'),
      showPrompt: false
    },
    {
      id: 'delete',
      label: $t('Delete'),
      buttonProps: { disabled: !canDelete.value, color: 'error', iconLeft: 'delete' },
      callback: (certs: ProcessedCertValue[]) => handleBulkAction(certs, 'delete')
    }
  ]
})

const uploadErrors: Record<number | string, string> = {
  1: $t('Error occurred parsing file'),
  2: $t('Incorrect file uploaded'),
  3: $t('File already exists'),
  4: $t('Following characters are accepted for filename: %s').format('a-zA-Z0-9-_\\.()[]'),
  150: $t('Failed to upload file (low memory)'),
  151: $t('File size is bigger than the maximum size allowed (when uploading files)'),
  default: $t('Unexpected error')
}

const refreshCertificates = () => {
  store.spin()
  certificatesStore.getCertificates(true).finally(() => store.spin(false))
}

const getCertificateWarning = (size: string | number, type?: string): boolean => {
  if (size === '') return false
  const fileSize = Number(size)
  return (type === 'rsa' && fileSize < MIN_RSA_SIZE) || (type === 'ecc' && fileSize < MIN_ECC_SIZE)
}

const getKeyWarningHints = (record: ProcessedCert): Hint[] => {
  return [{ info: warningMessage.value.format(record.encryption !== 'ecc' && record.encryption === 'rsa' ? MIN_RSA_SIZE : MIN_ECC_SIZE) }]
}

const getExpirationHints = (record: ProcessedCert): Hint[] => {
  return record.datetime === $t('Certificate has expired') ? [{ info: $t('Certificate has expired, please renew.') }] : [{ info: $t('Expires on %s (%s).').format(record.date, record.datetime) }]
}

const privateKeyPreview = (record: ProcessedCert): boolean => {
  return record.type === 'Key' || record.cert_type === 'dh' || record.cert_type === 'root_ca'
}

const certificateKeys = () => {
  return certificatesStore.generatedCertificates.filter(cert => cert.type === 'key' && !cert.fullname.endsWith('.p12') && !cert.services?.includes('uhttpd:main'))
}

const handleBulkAction = async (certificates: ProcessedCertValue[], action: string): Promise<void> => {
  const selectedCerts = certificates.map(fullname => processedCertificates.value.find(cert => cert.fullname === fullname)).filter((cert): cert is ProcessedCert => !!cert)
  if (action === 'export') {
    await handleExportCerts(selectedCerts)
  } else if (action === 'delete') {
    await handleDeleteCerts(selectedCerts)
  } else if (action === 'renew') {
    await handleRenewCerts(selectedCerts)
  }
}

const handleExportCerts = async (certs: ProcessedCert[]): Promise<void> => {
  const tpmCerts = certs.filter(cert => cert.tpm2)
  const tempCerts = certs.filter(cert => cert.temp)
  const validCerts = certs.filter(cert => !cert.temp && !cert.tpm2)
  if (validCerts.length === 0) {
    message.info($t('No certificates available for export.'))
    return
  }
  let promptContent = ''
  if (tpmCerts.length > 0) {
    promptContent += '\n' + $t('Certificates stored in TPM2 cannot be exported and will be skipped.')
  }
  if (tempCerts.length > 0) {
    promptContent += '\n' + $t('Files that are still generating cannot be exported.')
  }
  if (tpmCerts.length > 0 || tempCerts.length > 0) {
    prompt.show({
      title: $t('Export certificate file(s)?'),
      content: promptContent,
      okText: $t('Export'),
      cancelText: $t('Cancel'),
      icon: 'info',
      onOk: () => exportHandler(validCerts),
      onCancel: () => (selected.value = [])
    })
  } else {
    await exportHandler(validCerts)
  }
}

const exportHandler = async (certs: ProcessedCert[]) => {
  const downloadPromises = certs.map(cert => utils.downloadFileApi(`/api/certificates/${encodeURIComponent(cert.fullname)}/actions/download`, null, 'POST'))

  try {
    await Promise.all(downloadPromises)
    message.success($t('Certificate download was successful'))
  } catch {
    message.error($t('Failed to download certificate'))
  }
}

const handleDeleteCerts = async (certs: ProcessedCert[]): Promise<void> => {
  const certsInUse = certs.filter(cert => cert.services && cert.services.length > 0)
  const validCerts = certs.filter(
    cert => cert.cert_type !== 'root_ca' && !cert.temp && cert.path !== '/etc/uhttpd.key' && cert.path !== '/etc/uhttpd.crt' && !(cert.services && cert.services.includes('uhttpd:main'))
  )
  const skippedCerts = certs.filter(cert => !validCerts.includes(cert))
  const generatingCerts = certs.filter(cert => cert.temp === true)
  let promptContent = ''
  if (skippedCerts.length > 0) {
    const skippedNames = skippedCerts.map(cert => normalizeFileName(cert.fullname))
    promptContent += $t('Certificate files (%s) cannot be deleted and will be skipped.').format(skippedNames.join(', ')) + '\n'
  }
  if (certsInUse.length > 0) {
    promptContent += $t('Removing certificates that are currently in use will cause services to stop working. Please remove or disable such services before deleting the certificates.') + '\n'
  }
  if (generatingCerts.length > 0) {
    promptContent += $t('Files that are still generating cannot be removed.') + '\n'
  }
  promptContent += $t('This process cannot be undone.')
  prompt.show({
    title: $t('Delete certificate file(s)?'),
    content: promptContent,
    okText: $t('Delete'),
    cancelText: $t('Cancel'),
    icon: { name: 'warning', class: 'text-theme-text-warning' },
    onOk: async () => {
      validCerts.forEach(cert => {
        deletingCertificates.value.add(cert.fullname)
      })
      selected.value = selected.value.filter(name => {
        return validCerts.some(cert => cert.fullname === name)
      })
      const failedCerts: string[] = []
      // Process certificates one by one
      for (const cert of validCerts) {
        await axios
          .delete(`/api/certificates/config/${encodeURIComponent(cert.fullname)}`)
          .then(() => {
            successfullyDeleted.value.add(cert.fullname)
          })
          .catch(() => {
            failedCerts.push(normalizeFileName(cert.fullname))
          })
          .finally(() => {
            deletingCertificates.value.delete(cert.fullname)
          })
      }
      if (failedCerts.length > 0) {
        message.error($t('Failed to delete some certificate(s): %s').format(failedCerts.join(', ')))
      } else {
        message.success($t('Certificate file(s) removed successfully'))
      }
      await certificatesStore.getCertificates(true)
      successfullyDeleted.value.clear()
    },
    onCancel: () => (selected.value = [])
  })
}
const handleRenewCerts = async (certs: ProcessedCert[]): Promise<void> => {
  const scepCerts = certs.filter(cert => cert?.cert_type === 'scep' && cert.type !== 'Key' && !cert?.fullname.startsWith('ca-'))
  const uhttpdCerts = certs.filter(cert => cert.path === '/etc/uhttpd.crt' && !cert.services?.includes('uhttpd:main') && cert.datetime === 'Certificate has expired')
  const validCerts = [...scepCerts, ...uhttpdCerts]
  const skippedCount = certs.length - validCerts.length
  let promptContent = $t('Selected certificates will be renewed.')
  if (skippedCount > 0) {
    promptContent += '\n' + $t('Only SCEP certificates and unused uhttpd certificates can be renewed. %s certificate(s) will be skipped.').format(skippedCount)
  }
  prompt.show({
    title: $t('Renew certificate(s)?'),
    content: promptContent,
    okText: $t('Renew'),
    cancelText: $t('Cancel'),
    icon: 'info',
    onOk: async () => {
      selected.value = selected.value.filter(name => {
        return validCerts.some(cert => cert.fullname === name)
      })
      if (scepCerts.length > 0) {
        message.success($t('Certificate renewal started'))
      }
      const failedCerts: string[] = []
      // Handle SCEP certificates renewal
      for (const cert of scepCerts) {
        await axios
          .post('/api/certificates/actions/generate', {
            data: {
              type: cert.cert_type,
              name: cert.name,
              key_size: cert.key_size,
              scep_server: cert.scep_url,
              password: cert.password
            }
          })
          .catch(() => failedCerts.push(cert.fullname))
      }
      // Handle uhttpd certificates renewal
      if (uhttpdCerts.length > 0) {
        await certificatesStore.handleUhttpdCertificateRenewal().catch(() => failedCerts.push(uhttpdCerts[0].fullname))
      }
      if (failedCerts.length > 0) {
        message.error($t('Failed to renew some certificate(s): %s').format(failedCerts.join(', ')))
      } else if (scepCerts.length > 0) {
        message.success($t('Certificate(s) renewed successfully'))
      }
      certificatesStore.getCertificates(true)
    },
    onCancel: () => (selected.value = [])
  })
}

const handleAfterUpload = async (e: { res: { success: boolean } }): Promise<void> => {
  store.spin($t('Verifying file...'))
  if (e.res.success) {
    message.success($t('File uploaded successfully'))
    certificatesStore.getCertificates(true)
  }
  store.spin(false)
  certUpload.value?.resetInput()
  await nextTick()
  showImportModal.value = false
}

const processFiles = (data: CertConfig, startIndex = 0): ProcessedCert[] => {
  let index = startIndex
  let allFiles: ProcessedCert[] = []
  const processGroup = (files: GeneratedCert[] | GeneratingCerts[] | undefined, isTemp = false): ProcessedCert[] => {
    if (!files) return []
    return files
      .filter(v => !successfullyDeleted.value.has(v.fullname))
      .map(v => ({
        ...v,
        date: parseDate(v.datetime || ''),
        datetime: parseTimeLeft(v.datetime || '-'),
        key: index++,
        temp: isTemp,
        name: v.name === '-' ? '' : v.name || '',
        type: getTypeTitle(v),
        cert_type: v.cert_type || '',
        key_size: v.key_size === '-' ? '' : v.key_size || '',
        fullname: v.fullname || '',
        deleting: deletingCertificates.value.has(v.fullname || '')
      }))
  }
  if (data.generated) {
    allFiles = allFiles.concat(processGroup(data.generated))
  }
  if (data.generating) {
    allFiles = allFiles.concat(processGroup(data.generating, true))
  }
  return allFiles
}

const getTypeTitle = (cert: GeneratingCerts): string => {
  const baseTypes: Record<string, string> = {
    cert: $t('Certificate'),
    key: $t('Key'),
    req: $t('Request'),
    dh: $t('DH Parameters')
  }
  if (cert.type && baseTypes[cert.type]) {
    return baseTypes[cert.type]
  }
  return cert.type ? cert.type.charAt(0).toUpperCase() + cert.type.slice(1) : '-'
}

const isLessThanDays = (timeString: string, days: number): boolean => {
  if (timeString === '-') return false
  const inputDate = new Date(timeString)
  const currentDate = new Date(certificatesStore.deviceTime * 1000)
  const daysDifference = (Number(inputDate) - Number(currentDate)) / (1000 * 60 * 60 * 24)
  return Math.floor(daysDifference) < days
}

const parseTimeLeft = (dateValue: string): string => {
  if (!dateValue || dateValue === '-') return ''
  const userTimeZone = store.timeZone || 'UTC'
  const now = date.tz(certificatesStore.deviceTime * 1000, userTimeZone)
  const expirationDate = !isNaN(Number(dateValue)) ? date.unix(Number(dateValue)).tz(userTimeZone) : date.utc(dateValue).tz(userTimeZone)
  const diff = expirationDate.diff(now)
  if (diff <= 0) {
    return $t('Certificate has expired')
  }
  if (diff < 3600000) {
    return $t('Less than 1 hour')
  }
  return utils.parseTwoUnitRelativeTime(diff)
}

const parseDate = (dateValue: string): string => {
  if (!dateValue) return '-'
  const parsedDate: Date = isNaN(Number(dateValue)) ? new Date(dateValue) : new Date(Number(dateValue) * 1000)
  return isNaN(parsedDate.getTime()) ? '-' : parsedDate.toISOString().slice(0, 10)
}

const closeModal = (): void => {
  if (certUpload.value && certUpload.value.modelValue === '') {
    showImportModal.value = false
    return
  }
  prompt.show({
    title: $t('Go back?'),
    content: $t('Unsaved changes will be discarded'),
    okText: $t('Discard'),
    cancelText: $t('Cancel'),
    onOk: () => {
      showImportModal.value = false
    }
  })
}

const getCertDetails = async (certificate: ProcessedCert): Promise<void> => {
  selected.value = []
  return axios
    .get(`/api/certificates/config/${certificate.fullname}`)
    .then(res => {
      certToPreview.value = { ...res.data, ...certificate }
    })
    .catch(() => {
      message.error($t('Failed to load certificate data'))
    })
}

onMounted(() => {
  certificatesStore.getCertificates(true)
  certificatesStore.polling.start()
})

onUnmounted(() => {
  if (!certificatesStore.isGenerating) {
    certificatesStore.polling.stop()
  }
  deletingCertificates.value.clear()
  successfullyDeleted.value.clear()
})
</script>
