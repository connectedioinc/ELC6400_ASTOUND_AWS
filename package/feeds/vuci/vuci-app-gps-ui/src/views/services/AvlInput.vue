<template>
  <vuci-form
    v-slot="{ uciData }"
    :after-load="afterLoad"
    config="avl"
  >
    <vuci-typed-section
      :title="$t('Input rules')"
      :table-actions="['column-list', 'search']"
      type="input"
      :columns="inputColumns"
      :edit-form="avlInputEditModal"
      :uci-data="uciData"
      data-key="inputs"
      :endpoints="[{ endpoint: 'gps/avl/io_rules/config' }]"
    >
      <template #io_name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="io_name"
          :display-value="displayIOName"
        />
      </template>
      <template #priority="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="priority"
          :display-value="displayPriority"
        />
      </template>
      <template #event="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="event"
          :display-value="() => displayEvent(s)"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :readonly="validateSection(s).invalid && (s.enabled === '0' || !s.enabled)"
          :hints="[{ info: validateSection(s).message }]"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import avlInputEdit from './AvlInputEdit'

export default {
  provide() {
    return {
      ioList: () => this.ioList
    }
  },
  data() {
    return {
      avlInputEditModal: markRaw(avlInputEdit),
      inputColumns: [
        { name: 'io_name', label: this.$t('Input'), help: this.$t('AVL rule input type.') },
        { name: 'priority', label: this.$t('Priority'), help: this.$t('Rule priority.') },
        { name: 'event', label: this.$t('Generate event'), help: this.$t('Input event for rule activation.') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      priorities: {
        low: this.$t('Low'),
        high: this.$t('High'),
        panic: this.$t('Panic'),
        security: this.$t('Security')
      },
      inputTriggers: [
        ['no', this.$t('Input active')],
        ['nc', this.$t('Input low')],
        ['both', this.$t('Both')]
      ],
      ADCTriggers: [
        ['in', this.$t('Inside range')],
        ['out', this.$t('Outside range')]
      ],
      ioList: [],
      isGpioType: false
    }
  },
  methods: {
    validateSection(s) {
      if (!s.io_name || !s.priority || !s.event)
        return {
          invalid: true,
          message: this.$t('Section cannot be enabled due to missing required values, navigate to edit modal to fill out required values.')
        }
      return { invalid: false }
    },
    updateTriggers(type) {
      const element = this.ioList.find(io => io.id === type)
      this.isGpioType = element?.type === 'gpio'
    },
    afterLoad() {
      return this.$axios
        .get('/api/io/status')
        .then(response => {
          // this is a nasty temporary workaround, remove it when io pin info is in board.json and read from board.json
          if (!response.data)
            this.$notification.error(this.$t('Input/output functionality is booting, page will have missing input/output functionality, please wait a few minutes and refresh the page to fix it.'))
          this.ioList = this.$io.getFilteredPinsInfo(response.data || [])
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load I/O data'))
        })
    },
    displayIOName(value) {
      const found = this.ioList.find(entry => entry.id === value)
      return found ? found.name_with_pins : value
    },
    displayPriority(value) {
      return this.priorities[value] ? this.priorities[value] : this.$t('N/A')
    },
    displayEvent(self) {
      const event = self.event
      const min = self.min ? self.min : '0'
      const max = self.max ? self.max : '0'
      let valueOptions = 'V'
      if (self.acl) {
        valueOptions = self.acl === 'current' ? 'mA' : '%'
      }
      const minMaxLine = `(${min}${valueOptions} - ${max}${valueOptions})`

      if (event === 'no') {
        return this.$t('Input active')
      } else if (event === 'nc') {
        return this.$t('Input low')
      } else if (event === 'both') {
        return this.$t('Both')
      } else if (event === 'in') {
        return '%s %s'.format(this.$t('In'), minMaxLine)
      } else if (event === 'out') {
        return '%s %s'.format(this.$t('Out'), minMaxLine)
      }
      return this.$t('N/A')
    }
  }
}
</script>
