import { axios } from '@ui-core/plugins/axios'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { utils } from '@/plugins/utils'
import type { Plugin, ModuleOptions, MappedModules } from '@/types/eventsJugglerTypes'
import type { DefineComponent, Component } from 'vue'

const $t = useTranslate()
const message = useMessages()

const filePrefix = 'EventsJuggler'

/**
  Loads all available event, action and condition modules for the device
*/
function getAvailableModuleOptions(): Promise<ModuleOptions> {
  const moduleRequests = ['/api/event_juggler/events/options', '/api/event_juggler/operations/options', '/api/event_juggler/conditions/options']
  return axios
    .bulkGet(moduleRequests)
    .then(([eventsOptions, actionOptions, conditionOptions]) => {
      if (!eventsOptions.success) message.error($t('Failed to load available event options'))
      if (!actionOptions.success) message.error($t('Failed to load available action options'))
      if (!conditionOptions.success) message.error($t('Failed to load available condition options'))

      return {
        events: eventsOptions.success ? eventsOptions.data : { plugins: [], params: {}, log_events: {} },
        actions: actionOptions.success ? actionOptions.data : { plugins: [] },
        conditions: conditionOptions.success ? conditionOptions.data : { plugins: [] }
      }
    })
    .catch(() => {
      message.error($t('An unexpected error occurred while loading available options'))
      return {
        events: { plugins: [], params: {}, log_events: {} },
        actions: { plugins: [] },
        conditions: { plugins: [] }
      }
    })
}

/**
  Loads all Vue components from the events, actions and conditions directories
*/
async function getAvailableComponents() {
  const availableComponents: MappedModules = { events: {}, actions: {}, conditions: {} }
  const allComponents = import.meta.glob('./{events,actions,conditions}/*.vue') as Record<string, () => Promise<{ default: DefineComponent }>>

  const componentPromises = Object.entries(allComponents).map(async ([path, component]) => {
    const componentData = await component()
    // Destructure Vue component path to get the subdirectory and file name
    const [, subDirectory, fileName] = path.split('/')
    // Remove the Vue component prefix and convert the option name to snake_case
    const moduleOptionName = utils.toSnakeCase(fileName.split('.')[0].replace(filePrefix, ''))
    // Assign the imported Vue component to the appropriate directory and module option name
    availableComponents[subDirectory as keyof MappedModules][moduleOptionName] = componentData.default
  })

  await Promise.all(componentPromises)
  return availableComponents
}

/**
  Filters Vue components based on the available module options
*/
async function getFilteredComponents(availableModuleOptions: ModuleOptions, availableComponents: MappedModules) {
  const getSectionOptions = (sectionName: keyof ModuleOptions): string[] => availableModuleOptions[sectionName].plugins.map((option: Plugin) => option.name)

  return Object.keys(availableModuleOptions).reduce(
    (acc, sectionKey) => {
      acc[sectionKey as keyof ModuleOptions] = getSectionOptions(sectionKey as keyof ModuleOptions).reduce((sectionAcc: Record<string, Component>, optionName) => {
        sectionAcc[optionName] = availableComponents[sectionKey as keyof MappedModules][optionName] || {}
        return sectionAcc
      }, {})
      return acc
    },
    { events: {}, actions: {}, conditions: {} }
  )
}

async function getModuleData() {
  const availableOptions = await getAvailableModuleOptions()
  const moduleComponents = await getAvailableComponents()
  const filteredModuleComponents = await getFilteredComponents(availableOptions, moduleComponents)
  return { filteredModuleComponents, availableOptions }
}

export default getModuleData
