import type { SearchItem, SearchProvider } from '../'
import { useTranslate } from '@ui-core/composables/useI18n'
import { promptReboot } from '@ui-core/plugins/helper'
import { session } from '@ui-core/plugins/session'

export interface ActionSearchItem extends SearchItem {
  type: 'action'
  callback: () => void
  condition?: boolean
}

export default function createSearchProvider(): SearchProvider<ActionSearchItem> {
  const $t = useTranslate()

  const items = [
    {
      id: 'action-reboot',
      type: 'action' as const,
      title: $t('Reboot'),
      crumbs: [{ name: $t('Header Menu') }, { name: $t('Reboot') }],
      callback: promptReboot,
      condition: session.hasAccess('system/reboot')
    }
  ]

  return {
    id: 'actions',
    getItems: () => items,
    getItem: id => items.find(item => item.id === id && item.condition !== false) || null,
    options: {
      keys: ['title', obj => obj.crumbs?.map(crumb => crumb.name).join() || '']
    }
  }
}
