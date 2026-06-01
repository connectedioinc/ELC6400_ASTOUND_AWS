import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { utils } from '@/plugins/utils'
import { type Ref, type PropType, inject, computed } from 'vue'
import type { EventsJugglerOptions, EventSection, ActionSection, ConditionSection, FormData } from '@/types/eventsJugglerTypes'
import type { Io } from '@/types/ioTypes'
import type { GeneratedCertAddons } from '@/types/certTypes'
import { getMessages, getAllParameters } from '@/utils/message-parameters'
import { normalizeFileName } from '@/plugins/certificates'
import { useCertificatesStore } from '@/stores/certificates'

type BaseIoProps = Record<string, { label: string; help: string; placeholder: string; rules: Rules }>
type Rules = Array<string | (() => void)>
interface AdditionalInputProps {
  placeholder?: string
}
export const moduleProps = {
  uciData: {
    type: Object as PropType<FormData>,
    required: true
  },
  s: {
    type: Object as PropType<EventSection | ActionSection | ConditionSection>,
    required: true
  },
  parentSection: {
    type: Object as PropType<EventSection>
  },
  moduleName: {
    type: String as PropType<string>,
    default: ''
  }
}

export const useEventsJugglerModuleData = (props: { s?: EventSection | ActionSection | ConditionSection; moduleName: string; parentSection?: EventSection }) => {
  const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
  const { eventsReportingOptions = { events: [], params: [] } } = eventsJugglerOptions?.value || {}

  const $t = useTranslate()
  const message = useMessages()
  const certificateStore = useCertificatesStore()

  const isTypeSelected = computed(() => {
    return props.s?.plugin === props.moduleName
  })

  function getEventsReportingParameters() {
    const { params } = eventsReportingOptions
    if (props.parentSection?.plugin !== 'log') {
      return params.filter(event => !event.id.includes('et'))
    }
    return params
  }

  function getTextParameters() {
    return getMessages(getAllParameters(getEventsReportingParameters()))
  }

  function getListParameters() {
    return getAllParameters(getEventsReportingParameters())
  }

  const getCertOptionsForNonRequired = computed(() => {
    const certOpts = certificateStore.generatedCertificates
      .filter((cert: GeneratedCertAddons) => (cert.cert_type === 'client' || cert.cert_type === 'server' || cert.cert_type === 'root_ca') && cert.type === 'cert')
      .map(cert => [cert.path, normalizeFileName(cert.fullname)])
    certOpts.length > 0 && certOpts.unshift(['', $t('None')])
    return certOpts
  })

  function getIoProps(type: string, minValue: string, maxValue: string, aclValue: string) {
    const isMax = type === 'max'
    const labelPrefix = isMax ? $t('Max') : $t('Min')
    const helpPrefix = isMax ? $t('maximum') : $t('minimum')

    const rangeRules: Record<string, string> = {
      voltage: 'range(0,24)',
      current: 'range(4,20)',
      percent: 'range(0,100)'
    }

    const getRules = (type: string) => {
      const rules: Rules = [rangeRules[type]]
      if (isMax) {
        rules.push(() => validateMax(minValue, maxValue))
      }
      return rules
    }

    const baseProps: BaseIoProps = {
      voltage: {
        label: $t('%s voltage value').format(labelPrefix),
        help: $t('Specifies %s voltage value of analog pin.').format(helpPrefix),
        placeholder: isMax ? '12.5' : '0.0',
        rules: getRules('voltage')
      },
      current: {
        label: $t('%s current value').format(labelPrefix),
        help: $t('Specifies %s current value of analog pin.').format(helpPrefix),
        placeholder: isMax ? '12.5' : '4.0',
        rules: getRules('current')
      },
      percent: {
        label: $t('%s percent value').format(labelPrefix),
        help: $t('Specifies %s percent value of analog pin.').format(helpPrefix),
        placeholder: isMax ? '100' : '0',
        rules: getRules('percent')
      }
    }

    return baseProps[aclValue] || baseProps.voltage
  }

  function validateMax(min: string, max: string) {
    return {
      isValid: parseFloat(min) < parseFloat(max),
      message: $t('Max value should be higher than min value')
    }
  }

  function getSaveParameters(params: string[], separator = '=') {
    return params ? params.join(separator) : ''
  }

  function getParameterProps(additionalInputProps: AdditionalInputProps) {
    const parameterInputProps = {
      prop: 'ParamInput',
      rules: handleParamInputValidation,
      maxlength: 128,
      required: true,
      ...additionalInputProps
    }
    const parameterSelectProps = {
      prop: 'ParamSelect',
      options: getListParameters()
    }
    return [parameterInputProps, parameterSelectProps]
  }

  function handleParamInputValidation(value: string) {
    return { isValid: !value.includes('='), message: $t('All characters are allowed except =.') }
  }

  function isBidirectionalSelected(ioData: Io[]) {
    return !!ioData?.find(io => io.id === props.s?.io_name && io.bi_dir === '1')
  }

  const sectionNameTranslate = {
    operations: $t('action'),
    conditions: $t('condition')
  }

  const sectionFile = {
    operations: 'download_example_operation_lua',
    conditions: 'download_example_condition_lua'
  }

  function downloadLuaExampleFile(sectionName: 'operations' | 'conditions') {
    return utils.downloadFileApi(`/api/event_juggler/${sectionName}/actions/${sectionFile[sectionName]}`, 'text/plain', 'POST').catch(() => {
      message.error($t('Failed to download %s example lua file.').format(sectionNameTranslate[sectionName]))
    })
  }

  return {
    isTypeSelected,
    getCertOptionsForNonRequired,
    getIoProps,
    getSaveParameters,
    getParameterProps,
    getTextParameters,
    getListParameters,
    isBidirectionalSelected,
    downloadLuaExampleFile
  }
}
