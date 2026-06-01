import { useCloneRowAction } from '@/composables/useCloneRowAction'
import { createComposableWrapper, combineDeep } from '@tests/unit/mockFactory'
import { ref } from 'vue'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'

describe('useCloneRowAction.ts', () => {
  let wrapperOptions

  beforeEach(() => {
    wrapperOptions = {
      endpoint: '/firewall/rule/config',
      typedSectionRef: ref({
        vuciForm: { updateUciData: vi.fn() },
        sectionActions: { edit: vi.fn().mockResolvedValue() }
      }),
      formModel: ref({ rules: [{ id: '1', name: 'my rule' }] }),
      sectionKey: 'rules',
      excludeKeys: ['id'],
      nameKey: 'name',
      maxNameLength: 24
    }
  })

  it.each`
    otherItems                                                                        | clonedItem                        | options                                                                            | expectedResult
    ${[]}                                                                             | ${{ id: 3, name: 'cloned rule' }} | ${{}}                                                                              | ${'cloned rule1'}
    ${[{ name: 'cloned rule1' }, { name: 'cloned rule2' }, { name: 'cloned rule4' }]} | ${{ id: 3, name: 'cloned rule' }} | ${{}}                                                                              | ${'cloned rule3'}
    ${[]}                                                                             | ${{ id: 3, name: 'cloned rule' }} | ${{ maxNameLength: 7 }}                                                            | ${'cloned1'}
    ${[]}                                                                             | ${{ id: 3, name: 'cloned rule' }} | ${{ maxNameLength: 0 }}                                                            | ${''}
    ${[]}                                                                             | ${{ id: 3, name: 'cloned rule' }} | ${{ maxNameLength: 7, cloneNameOptions: { allowEllipsis: true } }}                 | ${'clo...1'}
    ${[]}                                                                             | ${{ id: 3, name: 'cloned rule' }} | ${{ maxNameLength: 7, cloneNameOptions: { allowEllipsis: true, seperator: ' ' } }} | ${'cl... 1'}
    ${[]}                                                                             | ${{ id: 3, name: 'cloned rule' }} | ${{ maxNameLength: 3, cloneNameOptions: { allowEllipsis: true, seperator: ' ' } }} | ${''}
    ${[]}                                                                             | ${{ id: 3, name: 'cloned rule' }} | ${{ cloneNameOptions: { seperator: '_' } }}                                        | ${'cloned rule_1'}
  `('increments name #%#', async ({ otherItems, clonedItem, options, expectedResult }) => {
    const combinedOptions = combineDeep(wrapperOptions, options)
    const spy = vi.spyOn(axios, 'post').mockImplementation((_, data) => Promise.resolve({ success: true, data: { ...data.data, id: '100' } }))
    combinedOptions.formModel.value.rules = [...otherItems, clonedItem]
    const [wrapper] = createComposableWrapper(() => useCloneRowAction(combinedOptions))
    await wrapper.value.callback(clonedItem)
    expect(spy).toBeCalledWith(combinedOptions.endpoint, { data: { id: undefined, name: expectedResult } })
    expect(combinedOptions.typedSectionRef.value.sectionActions.edit).toBeCalledWith('100')
    expect(combinedOptions.typedSectionRef.value.vuciForm.updateUciData).toBeCalledWith([...otherItems, clonedItem, { id: '100', name: expectedResult }], wrapperOptions.sectionKey)
  })

  it('shows error on API error', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue({ success: false })
    const [wrapper] = createComposableWrapper(() => useCloneRowAction(wrapperOptions))
    const message = useMessages()
    const spy = vi.spyOn(message, 'error')
    await wrapper.value.callback({ name: 'cloned item' })
    expect(spy).toHaveBeenCalled()
  })
})
