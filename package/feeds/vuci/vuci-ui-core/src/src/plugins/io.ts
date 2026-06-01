import { i18n } from '@ui-core/plugins/i18n'
import { axios } from '@ui-core/plugins/axios'
import { useMainStore } from '@/stores/main'
import { useMessages } from '@/stores/messages'
import type { Io } from '@/types/ioTypes'

export const io = {
  state: {
    ioInfo: []
  }
}
const hasIO = () => {
  return io.store.board.hwinfo.ios
}

io.getPinsInfo = function () {
  const message = useMessages()
  return axios
    .bulkGet([{ endpoint: '/api/io/status', condition: hasIO }])
    .then(([ioStatus]) => {
      if (!ioStatus.success) message.error(i18n.t('Failed to load I/O data'))
      if (ioStatus.success) {
        this.state.ioInfo = this.getFilteredPinsInfo(ioStatus.data)
        return ioStatus.data
      }
    })
    .catch(() => {
      message.error(i18n.t('An unexpected error occurred'))
    })
}

io.getFilteredPinsInfo = function (ioInfo: Io[]): Io[] {
  const ioFiltered = []
  for (const io of ioInfo) {
    if (io.block_pins && io.io_name) {
      io.name_with_pins = `${i18n.t(io.io_name)} (${io.block_pins.join()})`
      io.name_with_params = `${i18n.t(io.io_name)} (${io.block_pins.join()}) - %${io.io_param}`
      ioFiltered.push(io)
    }
  }
  return ioFiltered
}

io.filterIO = async function (filter, returnNames, reload) {
  if (!hasIO()) return []

  if (this.state.ioInfo.length === 0 || reload) {
    await this.getPinsInfo()
  }
  const filteredList = this.state.ioInfo.filter(filter)
  if (returnNames) {
    const ioNames = []
    for (const io of filteredList) {
      ioNames.push([io.name, io.name_with_pins])
    }
    return ioNames
  }
  return this.state.ioInfo.filter(filter)
}
io.findIO = async function (option, value, reload): Io | null | undefined {
  if (!hasIO()) return null

  if (this.state.ioInfo.length === 0 || reload) {
    await this.getPinsInfo()
  }
  return this.state.ioInfo.find(io => io[option] === value)
}

export default {
  install(app) {
    io.store = useMainStore()
    app.config.globalProperties.$io = io
  }
}
