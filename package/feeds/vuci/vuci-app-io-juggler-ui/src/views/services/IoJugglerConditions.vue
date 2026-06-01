<template>
  <vuci-form
    v-slot="{ uciData }"
    :after-load="afterLoad"
    config="iojuggler"
  >
    <vuci-typed-section
      :uci-data="uciData"
      data-key="iojugglerConditions"
      type="condition"
      :title="$t('Conditions')"
      :add-validate="addValidate"
      :columns="inputColumns"
      :edit-form="editModal"
      :table-actions="['column-list', 'search']"
      :form-methods="['get', 'create', 'delete']"
      :endpoints="[{ endpoint: 'io/juggler/conditions/config' }]"
    >
      <template #ui_name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="ui_name"
        />
      </template>
      <template #type="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="type"
          :display-value="displayType"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './IoJugglerConditionsEdit'

export default {
  provide() {
    return {
      typeOptions: () => this.typeOptions(this.hasAdc, this.hasAcl),
      hasAcl: () => this.hasAcl,
      aclList: () => this.filteredIoData.filter(io => io.type === 'acl').map(io => io.id),
      analogList: () => this.filteredIoData.filter(io => ['adc', 'acl'].includes(io.type)).map(io => [io.id, io.name_with_pins]),
      ioList: () => this.filteredIoData.filter(io => ['gpio', 'dwi', 'relay'].includes(io.type)).map(io => [io.id, io.name_with_pins])
    }
  },
  data() {
    return {
      editModal: markRaw(EditForm),
      inputColumns: [{ name: 'ui_name', label: this.$t('Name') }, { name: 'type', label: this.$t('Type') }, { name: 'enabled' }],
      availableTypes: {
        io: this.$t('I/O'),
        minute: this.$t('Minute'),
        hour: this.$t('Hour'),
        weekday: this.$t('Week day'),
        monthday: this.$t('Month day'),
        yearday: this.$t('Year day'),
        bool: this.$t('Boolean group'),
        analog: this.$t('Analog voltage'),
        adcacl: this.$t('ADC/ACL')
      },
      ioData: []
    }
  },
  computed: {
    filteredIoData() {
      return this.$io.getFilteredPinsInfo(this.ioData)
    },
    hasAcl() {
      return this.filteredIoData.some(io => io.type === 'acl')
    },
    hasAdc() {
      return this.filteredIoData.some(io => io.type === 'adc')
    }
  },

  methods: {
    /**
     * @description - returns a list of available condition types
     * @param {boolean} hasAdc - does the device hash adc
     * @param  {boolean} hasAcl - does the device hash acl
     * @returns {(string|*)[][]}
     */
    typeOptions(hasAdc, hasAcl) {
      const typeOptions = [
        ['io', this.$t('I/O')],
        ['minute', this.$t('Minute')],
        ['hour', this.$t('Hour')],
        ['weekday', this.$t('Week day')],
        ['monthday', this.$t('Month day')],
        ['yearday', this.$t('Year day')],
        ['bool', this.$t('Boolean group')]
      ]
      if (hasAdc && hasAcl) {
        typeOptions.push(['analog', this.$t('ADC/ACL')])
      } else if (hasAdc) {
        typeOptions.push(['analog', this.$t('Analog voltage')])
      }
      return typeOptions
    },
    /**
     * @description - load I/O data from api
     */
    afterLoad() {
      return this.$axios
        .get('/api/io/status')
        .then(ioInfo => {
          // this is a nasty temporary workaround, remove it when io pin info is in board.json and read from board.json
          this.ioData = ioInfo.success && ioInfo.data ? ioInfo.data : []
          if (!ioInfo.data)
            this.$notification.error(this.$t('Input/output functionality is booting, page will have missing input/output functionality, please wait a few minutes and refresh the page to fix it.'))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load I/O data'))
        })
    },
    /**
     * @description Function check if no more than 10 section are created.
     * @return {{valid: boolean}|{valid: boolean, message: (*)}} - Is it possible to add section
     * @param section - section that is being added
     * @param sections - sections list
     */
    addValidate(section, sections) {
      if (sections.length >= 10) return { valid: false, message: this.$t('Condition limit reached, no more than 10 can be created') }
      if (sections.some(sec => sec.ui_name === section.ui_name)) return { valid: false, message: this.$t('Condition with the same name already exists') }
      return { valid: true }
    },
    /**
     * @description Function return formatted type value
     * @param {String} value TYpe value that comes from API
     * @return {String} Function return formatted type value
     */
    displayType(value) {
      const check = value === 'analog' && this.hasAdc && this.hasAcl
      return check ? this.availableTypes.adcacl : this.availableTypes[value]
    }
  }
}
</script>
