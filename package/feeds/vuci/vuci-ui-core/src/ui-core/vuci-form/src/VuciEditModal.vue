<template>
  <tlt-modal
    ref="modal"
    :open="open"
    :size="size"
    :nav-bar="navigation"
    @close="back"
  >
    <ListLayout bordered>
      <component
        :is="shownComponent.component"
        v-bind="shownComponent.props"
        :uci-data="uciData"
        :section="currentSection"
      />
    </ListLayout>
  </tlt-modal>
</template>

<script>
import { ref, provide } from 'vue'
import { formBus, getMap } from '@ui-core/vuci-form'
import formHelper from '@ui-core/utils/form-helper'
import { checkDuplicates } from '@ui-core/plugins/helper'
import { makeProps } from '@ui-core/utils/props'
import { copy } from '@ui-core/utils/vue-helpers'
import { useMementos } from '@ui-core/composables/useMementos'
import { isArray } from '@ui-core/utils/inspect'

export default {
  inject: {
    apply: {
      default: () => {}
    },
    addTabToParent: {
      default: null
    }
  },
  provide() {
    return {
      editableSection: () => this.currentSection,
      modalData: () => this.modalTabs[this.level],
      modalNavigation: () => this.navigation,
      modalLevel: () => this.level,
      back: this.back,
      /**
       * Ensures that each child, no matter how deep, can call the parent method
       */
      addTabToParent: this.addTabToParent ?? this.addModalContent,
      setModalTitle: this.addEditFormTitle,
      modalSaveAndApply: this.saveAndApply,
      setSection: setterFn => setterFn(this.getCurrentSection(this.modalTabs, this.level))
    }
  },
  props: makeProps({
    open: [Boolean, false],
    parent: [String, null],
    restrictedValues: [Array, () => []],
    data: [Object, () => ({})],
    innerComponent: [Object, () => ({})],
    editFormProps: [Object, () => ({})],
    formData: [Array, () => []],
    formMethods: [Object, () => ({})],
    uciData: [Object, () => ({})],
    size: [String, 'big', ['big', 'medium', 'small']]
  }),
  emits: ['close'],
  setup() {
    const cache = ref({})
    const storeMemos = useMementos({
      takeSnapshot() {
        return copy(cache.value, false)
      },
      restoreSnapshot(state) {
        cache.value = state
      }
    })
    const store = {
      _value: cache.value,
      get(key) {
        return cache.value[key]
      },
      set(key, value) {
        return (cache.value[key] = value)
      },
      delete(key) {
        delete cache.value[key]
      },
      clear() {
        cache.value = {}
      }
    }
    provide('modalStore', store)
    return {
      store,
      storeMemos
    }
  },
  data() {
    return {
      currTitle: '',
      forms: [],
      modalTabs: []
    }
  },
  computed: {
    id() {
      return this.data['.type'] + '_' + this.data.id
    },
    navigation() {
      const names = [...this.modalTabs.map(tab => tab.parent), this.$t('Configuration')]
      return names
    },
    shownComponent() {
      return this.modalTabs[this.level] ? this.modalTabs[this.level].content : {}
    },
    level() {
      return this.modalTabs.length - 1
    },
    currentSection() {
      return this.getCurrentSection(this.modalTabs, this.level)
    },
    currentSectionId() {
      return this.modalTabs[this.level]?.vuciForm.sectionId
    },
    modalContent() {
      return {
        parent: this.parent,
        id: this.id,
        content: {
          forms: this.forms,
          component: this.innerComponent,
          props: {
            ...this.editFormProps,
            section: this.data,
            applied: this.applied
          }
        },
        vuciForm: this.formMethods,
        uciData: this.uciData
      }
    }
  },
  watch: {
    open(value) {
      if (value) {
        this.addModalContent(this.modalContent)
      } else {
        this.forms = []
        this.modalTabs = []
      }
    }
  },
  mounted() {
    formBus.on('delete-section', this.onSectionDelete)
  },
  unmounted() {
    formBus.off('delete-section', this.onSectionDelete)
  },
  methods: {
    onSectionDelete({ sid, idKey, dataKey }) {
      this.modalTabs.forEach(tab => {
        const remove = s => s[idKey] !== sid
        tab.vuciForm.initialForm[dataKey] = tab.vuciForm.initialForm[dataKey]?.filter(remove) || []
        tab.uciData[dataKey] = tab.uciData?.[dataKey]?.filter(remove) || []
      })
    },
    getCurrentSection(tabs, level) {
      if (!tabs.length) return {}
      const editSectionName = tabs[level].vuciForm.editableSection
      const dataKey = tabs[level].vuciForm.dataKey
      const sectionId = tabs[level].vuciForm.sectionId
      return formHelper.deepFind(tabs[level].uciData[dataKey], section => section[sectionId] === editSectionName)
    },
    async applied(cancel, sections) {
      this.storeMemos.restore()
      if (cancel) {
        if (this.$refs.modal) this.back()
        const resetForm = this.modalTabs.at(-1).vuciForm.initialForm
        if (this.modalTabs.length > 1) {
          await this.$router.replace({ query: { edit: this.$route.query.edit.slice(0, -1) } })
          this.modalTabs.pop()
          this.modalTabs.at(-1).uciData = resetForm
        } else {
          await this.$router.replace({ query: { edit: undefined } })
          this.$emit('close', resetForm)
        }
      } else {
        const dataKeyMap = getMap()
        if (this.modalTabs.length > 1) {
          Object.keys(sections)
            .filter(key => key in dataKeyMap)
            .forEach(dataKey => {
              this.modalTabs.at(-2).uciData = formHelper.mergeSections(this.modalTabs.at(-2).uciData, { [dataKey]: sections[dataKey] }, { identifier: dataKeyMap[dataKey] })
            })
          const sectionKey = this.modalTabs.at(-1).vuciForm.dataKey
          this.modalTabs.at(-2).vuciForm.initialForm[sectionKey] = copy(this.modalTabs.at(-1).uciData[sectionKey])
          await this.$router.replace({ query: { edit: this.$route.query.edit.slice(0, -1) } })
          this.modalTabs.pop()
        } else {
          let uciData = this.modalTabs[0]?.uciData
          Object.keys(sections).forEach(dataKey => {
            uciData = formHelper.mergeSections(uciData, { [dataKey]: sections[dataKey] }, { identifier: dataKeyMap[dataKey] || 'id' })
          })
          await this.$router.replace({ query: { edit: undefined } })
          this.$emit('close', uciData)
        }
      }
    },
    back() {
      if (this.level > -1) {
        this.$prompt.show({
          title: this.$t('Go back?'),
          content: this.$t('Unsaved changes will be discarded'),
          okText: this.$t('Discard'),
          cancelText: this.$t('Cancel'),
          onOk: () => this.applied(true)
        })
      } else {
        return this.applied(false)
      }
    },
    addModalContent(content) {
      this.storeMemos.save()
      if (this.addTabToParent) {
        return this.addTabToParent(content)
      }
      this.modalTabs.push(content)

      const opened = this.$route.query.edit ? (isArray(this.$route.query.edit) ? [...this.$route.query.edit] : [this.$route.query.edit]) : []
      if (!opened.includes(this.currentSection[this.currentSectionId])) {
        opened.push(this.currentSection[this.currentSectionId])
      }

      return this.$router.replace({
        query: {
          edit: opened
        }
      })
    },
    addEditFormTitle(title) {
      this.currTitle = title
    },
    async saveAndApply(form) {
      const { sectionId, dataKey } = this.formMethods
      const currentId = this.currentSection[sectionId]
      const checkAgainst = this.uciData[dataKey].filter(c => c.id !== currentId)
      const duplicates = checkDuplicates(this.restrictedValues, checkAgainst, this.currentSection)

      if (duplicates.length > 0) {
        this.$message.error(this.$t('Duplicate fields found: %s').format(duplicates.join(', ')))
        return
      }

      const result = await form.saveData()
      if (result) return this.applied(false, result)
    }
  }
}
</script>
