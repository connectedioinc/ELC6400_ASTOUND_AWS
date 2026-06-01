import { useMainStore } from '@/stores/main'
import type { Action } from '@ui-core/components/table/types'
import { useTranslate } from '@ui-core/composables/useI18n'
import { computed, type ComputedRef, type Ref, type ShallowRef } from 'vue'
import type VuciTypedSection from '@ui-core/vuci-form/src/VuciTypedSection.vue'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'
import { formBus } from '@ui-core/vuci-form'
import type VuciForm from '@ui-core/vuci-form/src/VuciForm.vue'

const SEPERATE_INCREMENT_REGEX = /^(.*?)([ _-]?)(\d+)$/

export type CloneNameOptions = {
  /** Best to use space. If name validation does not allow it - use next best seperator (type is ordered from best to worst). Default: empty string */
  seperator?: ' ' | '_' | '-' | ''
  /** Enable if name validation allows dots, do not - if not. Default: false */
  allowEllipsis?: boolean
}

export type CloneRowActionOptions<FormModel, FormKey extends keyof FormModel, Section extends { id: string }, NameKey extends keyof Section> = {
  /** Config endpoint that should be used when cloning */
  endpoint: string
  /** vuci-typed-section ref. Used to open edit window. */
  typedSectionRef: Readonly<ShallowRef<InstanceType<typeof VuciTypedSection> | null>>
  /** vuci-typed-section formModel */
  formModel: Ref<FormModel>
  /** formModel key pointing to array of objects */
  sectionKey: FormKey & (FormKey extends string ? FormKey : never) & (FormModel[FormKey] extends Section[] ? FormKey : never)
  /** Keys that should not be cloned. Most times they are unique values e.g., id */
  excludeKeys: Array<keyof Section>
  /** Cloning object key to name. Most times it is 'name' or 'description' */
  nameKey: NameKey & (Section[NameKey] extends string ? NameKey : never)
  /** Max length for name when WEB/API will start to fail. */
  maxNameLength: number
  /** Options used to generate name without triggering validation errors */
  cloneNameOptions?: CloneNameOptions
}

/**
 * Clone action helper
 */
export function useCloneRowAction<FormModel, FormKey extends keyof FormModel, Section extends { id: string } & Record<NameKey, string>, NameKey extends keyof Section>(
  options: CloneRowActionOptions<FormModel, FormKey, Section, NameKey>
): ComputedRef<Action<Section>> {
  const $t = useTranslate()
  const store = useMainStore()
  const message = useMessages()

  function fail() {
    message.error($t('Failed to clone section'))
  }
  const { endpoint, excludeKeys, formModel, maxNameLength, nameKey, sectionKey, typedSectionRef, cloneNameOptions } = options
  // Defaults are not optimal but are the safest
  const { seperator: cloneNameSeperator = '', allowEllipsis: cloneNameAllowEllipsis = false } = cloneNameOptions ?? {}
  async function clone(s: Section) {
    if (!typedSectionRef.value) return fail()
    store.spin()
    const clonedSection = { ...JSON.parse(JSON.stringify(s)) } as Section
    excludeKeys.forEach(key => delete clonedSection[key])

    const ellipsis = cloneNameAllowEllipsis ? '...' : ''
    const originalName = clonedSection[nameKey] || 'unnamed'
    const seperated = SEPERATE_INCREMENT_REGEX.exec(originalName) ?? [undefined, originalName, cloneNameSeperator, 0]
    const startingName = seperated[1]
    const seperator = seperated[2]
    let posfixNumber = BigInt(seperated[3])
    let generatedName = ''
    do {
      // Default start is 0 so it becomes 1
      posfixNumber++
      const truncateLength = (maxNameLength as number) - ellipsis.length - seperator.length - posfixNumber.toString().length
      // Fallback to empty name if something worng happens
      if (truncateLength < 0) {
        generatedName = ''
        break
      }
      generatedName = startingName.slice(0, truncateLength)
      if (originalName !== generatedName) generatedName += ellipsis
      generatedName += seperator + posfixNumber
    } while ((formModel.value[sectionKey] as Section[]).some(s => s[nameKey] === generatedName))
    ;(clonedSection[nameKey] as string) = generatedName

    try {
      const response = await axios.post<Section>(endpoint, { data: clonedSection })
      ;(formModel.value[sectionKey] as Section[]).push(response.data)
      ;(typedSectionRef.value.vuciForm as InstanceType<typeof VuciForm>).updateUciData(formModel.value[sectionKey] as Section[], sectionKey)
      formBus.emit('update-initial-form', { dataKey: sectionKey, data: formModel.value[sectionKey] })
      await typedSectionRef.value.sectionActions.edit(response.data.id)
    } catch {
      fail()
    } finally {
      store.spin(false)
    }
  }

  const rowAction = computed<Action<Section>>(() => ({
    id: 'clone',
    label: $t('Clone'),
    buttonProps: { iconLeft: 'copy' },
    callback: clone
  }))

  return rowAction
}
