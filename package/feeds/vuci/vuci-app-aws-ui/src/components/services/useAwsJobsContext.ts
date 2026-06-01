import { createContext } from '@ui-core/utils/create-context'
import type { Ref } from 'vue'
import type { AwsProvisioningConfig } from '@/types/awsTypes'

type AwsJobsContext = {
  provisioningData: Ref<AwsProvisioningConfig[]>
}

export const [provideAwsJobsContext, useAwsJobsContext] = createContext<AwsJobsContext>('AwsJobs')
