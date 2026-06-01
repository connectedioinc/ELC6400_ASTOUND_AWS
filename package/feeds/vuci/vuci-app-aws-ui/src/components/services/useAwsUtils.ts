import type { AwsProvisioningConfig, AwsJobConfig } from '@/types/awsTypes'
import { useTranslate } from '@ui-core/composables/useI18n'

export function useAwsUtils() {
  const $t = useTranslate()

  function validateProvisioning(provId: string, provisioningData: AwsProvisioningConfig[], s: AwsJobConfig, message: string) {
    const result = {
      isValid: true,
      message
    }
    if (s.enabled !== '1') return result
    if (provId === '0') return result

    const p = provisioningData.find(p => p.id === provId)
    if (!p?.template || !p?.type || !p?.creation_type) result.isValid = false
    if (p?.type === '1' && (!p.certfile || !p.keyfile)) result.isValid = false
    if (p?.type === '2' && (!p.access_key || !p.secret_key)) result.isValid = false
    return result
  }

  function validateInstanceCount(_: unknown, dataSource: AwsJobConfig[] | AwsProvisioningConfig[]) {
    return {
      valid: dataSource.length < 50,
      message: $t('Cannot create more instances. Only 50 instances are allowed')
    }
  }

  return { validateProvisioning, validateInstanceCount }
}
