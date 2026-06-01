import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import '@ui-core/utils/string-format'
import { events } from '@/plugins/events-options'
import i18n from '@ui-core/plugins/i18n'

describe('events-options.js', () => {
  beforeEach(() => {
    const app = { config: { globalProperties: {} } }
    setActivePinia(createTestingPinia())
    i18n.install(app)
  })
  it('returns translated types', () => {
    const result = events.getTranslatedTypes({ Config: ['all, openvpn'] })
    expect(result).toEqual([['Config', 'Config change']])
  })
  it('returns translated subtypes', () => {
    const result = events.getTranslatedSubtypes({ Config: ['all'] })
    expect(result).toEqual({ Config: [['all', 'All']] })
  })
  it('should not add anything if "Switch Events" does not exist', () => {
    const sourceObj = {}
    const targetArr = []
    events.addSwitchEvents(sourceObj, targetArr)
    expect(targetArr).toEqual([])
  })

  it('should add LAN events correctly', () => {
    const sourceObj = { 'Switch Events': ['LAN1', 'LAN2', 'LAN'] }
    const targetArr = []
    events.addSwitchEvents(sourceObj, targetArr)
    expect(targetArr).toEqual([
      ['LAN1', 'LAN 1'],
      ['LAN2', 'LAN 2'],
      ['LAN', 'LAN']
    ])
  })

  it('should add WAN events correctly', () => {
    const sourceObj = { 'Switch Events': ['WAN1', 'WAN2', 'WAN'] }
    const targetArr = []
    events.addSwitchEvents(sourceObj, targetArr)
    expect(targetArr).toEqual([
      ['WAN1', 'WAN 1'],
      ['WAN2', 'WAN 2'],
      ['WAN', 'WAN']
    ])
  })

  it('should ignore other events', () => {
    const sourceObj = { 'Switch Events': ['LAN1', 'ABC', 'WAN1'] }
    const targetArr = []
    events.addSwitchEvents(sourceObj, targetArr)
    expect(targetArr).toEqual([
      ['LAN1', 'LAN 1'],
      ['WAN1', 'WAN 1']
    ])
  })
})
