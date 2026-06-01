import { createEventBus } from '@ui-core/plugins/event-bus'
const dataKeyIdMap: Record<string, string> = {}
const formStateData = {
  saveState: false
}
const formState = {
  get saveState() {
    return formStateData.saveState
  },
  set saveState(newState) {
    formStateData.saveState = newState
  }
}
function insertMapKey(sectionId: string, dataKey: string) {
  dataKeyIdMap[dataKey] = sectionId
}

function getMap() {
  return dataKeyIdMap
}
type FormBusEvents = {
  'delete-section': [{ sid: string; dataKey: string; idKey: string; section: object }]
}

const formBus = createEventBus<FormBusEvents>()
export { formBus, formState, insertMapKey, getMap }
