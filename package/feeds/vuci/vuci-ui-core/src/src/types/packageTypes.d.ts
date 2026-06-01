export interface PackageData {
  package: string
  tlt_name: string
  version: string
  installed_version?: string
  type: number
  url?: string
  description?: string
  upgrade?: boolean
  checksum?: string
  sha256?: string
  network_restart?: boolean
  reboot?: boolean
  name?: string
  status?: string
  errors: { error: string; code: number }[]
}

export type PromptContext = Partial<Pick<PackageData, 'package' | 'checksum' | 'sha256' | 'network_restart' | 'reboot'>> & {
  packageData?: PackageData[]
  packageName?: string
  actionName?: string
  verified?: boolean
  error?: string
}

export type PackageActions = Record<string, (promptContext?: PromptContext) => PackageAction>
export type PackageAction = { options?: PackageActionOptions; prompt?: PackageActionPrompt }

export type PackageActionOptions = {
  filterTypes?: number[]
  endpoint: string
  packageType?: number
  spinMessage?: string
  successMessage?: string
  errorMessage: string
  handleCallback?: (packageData: PackageData[]) => void
  allowException?: (packageData: PackageData) => boolean
  filterException?: (packageData: PackageData) => boolean
}

export type PackageActionPrompt = {
  title: string
  subtitle?: string
  submitText?: string
  submitAction?: () => void
  installText?: string
  icon?: 'info' | 'warning' | 'error'
  isConfirmCard?: boolean
}
