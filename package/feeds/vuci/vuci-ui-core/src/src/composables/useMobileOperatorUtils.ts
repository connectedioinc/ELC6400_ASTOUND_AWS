import { ref } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import type { ModemInfo, OperatorScanList, ParsedOperatorScan } from '@/types/mobileTypes'
import { localDate } from '@ui-core/plugins/date'
import { mobile } from '@/plugins/mobile'
import { useMainStore } from '@/stores/main'
import { useMessages, usePrompt } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'

export const useMobileOperatorUtils = () => {
  const $t = useTranslate()
  const store = useMainStore()
  const message = useMessages()
  const prompt = usePrompt()

  const scanDate = ref('')
  const operators = ref<ParsedOperatorScan[]>([])
  const showResults = ref(false)

  const statusCode = [$t('Unknown'), $t('Available'), $t('Available'), $t('Forbidden')]
  const statusColor = ['disabled', 'success', 'success', 'error']
  const opErrors = {
    3: $t('Operator scan is not available while SIM card is not inserted.'),
    default: $t('Failed to get scan results.')
  }

  function scanDisabled(currentModem: ModemInfo) {
    if (mobile.modemOffline(currentModem)) return $t(`Operator scan is not available while the modem is blocked or disabled`)
    if (!currentModem?.operators_scan) return $t('Operator scan is not supported on this modem')
    if (currentModem.simstate !== 'Inserted') return opErrors[3]
    return null
  }

  function simModemText(modem: ModemInfo) {
    return $t('performed on SIM%s.').format(mobile.getSimModemLabel(modem))
  }

  function getPreviousScan(scanList: { last_scan: string; modem: string; operators: OperatorScanList[] }[], currentModem: ModemInfo) {
    let opList: ParsedOperatorScan[] = []
    scanDate.value = '-'
    const previous = scanList.find(s => s.modem === currentModem.id)
    if (previous && previous?.operators.length > 0) {
      opList = parseScanResults(previous.operators)
      scanDate.value = previous.last_scan !== 'N/A' ? '%s %s'.format(localDate(Number(previous.last_scan)), simModemText(currentModem)) : '-'
      showResults.value = true
    }
    return opList
  }

  function parseScanResults(results: OperatorScanList[]) {
    return results.map(op => ({
      status: { value: statusCode[op.status_code], color: statusColor[op.status_code] },
      opName: op.op_name,
      shortName: op.short_name,
      numName: op.num_name,
      country: op.country,
      netAccessType: op.net_access_type
    }))
  }

  function scanOperators(currentModem: ModemInfo) {
    showResults.value = false
    operators.value = []
    scanDate.value = ''
    store.spin($t('Scanning for operators...'))
    return axios
      .post(`/api/modems/${currentModem.id}/actions/scan_network`)
      .then(response => {
        operators.value = parseScanResults(response.data)
      })
      .catch(e => {
        const errorCode = e?.response?.data?.errors?.[0].code === 3 ? opErrors[3] : opErrors.default
        message.error(errorCode)
      })
      .finally(() => {
        scanDate.value = '%s %s'.format(localDate(new Date().getTime() / 1000), simModemText(currentModem))
        store.spin(false)
        showResults.value = true
      })
  }

  function showScanPrompt(currentModem: ModemInfo) {
    showResults.value = false
    return prompt.show({
      title: $t('Scan for operators?'),
      content: $t('During scan you will lose current mobile connection.'),
      okText: $t('Scan'),
      cancelText: $t('Cancel'),
      onOk: () => {
        return scanOperators(currentModem)
      }
    })
  }

  return {
    scanDisabled,
    simModemText,
    getPreviousScan,
    parseScanResults,
    scanOperators,
    showScanPrompt,
    operators,
    showResults,
    scanDate
  }
}
