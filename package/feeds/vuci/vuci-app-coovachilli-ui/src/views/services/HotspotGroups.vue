<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="chilli"
  >
    <vuci-typed-section
      type="group"
      :uci-data="uciData"
      :title="$t('User groups')"
      :table-actions="['search', 'column-list']"
      :columns="columns"
      :edit-form="HotspotGroupEdit"
      :endpoints="[{ endpoint: 'hotspot/groups/config' }]"
      data-key="groups"
      :add-validate="addSection"
      :add-title="$t('Add new user group')"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
        />
      </template>
      <template #dBandwidth="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="downloadbandwidth"
          :display-value="readMbs"
        />
      </template>
      <template #uBandwidth="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="uploadbandwidth"
          :display-value="readMbs"
        />
      </template>
      <template #dLimit="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="downloadlimit"
          :display-value="readMb"
        />
      </template>
      <template #uLimit="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="uploadlimit"
          :display-value="readMb"
        />
      </template>
      <template #period="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="period"
          :display-value="displayPeriod"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.name"
          required
          :label="$t('Name')"
          prop="name"
          maxlength="16"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script>
import { markRaw } from 'vue'
import HotspotGroupEdit from './HotspotGroupEdit'

export default {
  data() {
    return {
      formData: {},
      HotspotGroupEdit: markRaw(HotspotGroupEdit)
    }
  },
  computed: {
    columns() {
      return [
        { name: 'name', label: this.$t('Name') },
        {
          name: 'dBandwidth',
          label: this.$t('Download bandwidth'),
          help: this.$t('The max allowed download speed, in megabits.')
        },
        {
          name: 'uBandwidth',
          label: this.$t('Upload bandwidth'),
          help: this.$t('The max allowed upload speed, in megabits.')
        },
        {
          name: 'dLimit',
          label: this.$t('Download limit'),
          help: this.$t('Disable hotspot user after download limit value in MB is reached.')
        },
        {
          name: 'uLimit',
          label: this.$t('Upload limit'),
          help: this.$t('Disable hotspot user after upload limit value in MB is reached.')
        },
        {
          name: 'period',
          label: this.$t('Period'),
          help: this.$t('Period for which hotspot data limiting should apply.')
        }
      ]
    }
  },
  methods: {
    addSection(addForm) {
      const nameExists = this.formData.groups.some(groups => groups.name === addForm.name)
      if (!nameExists) return { valid: true }
      return {
        message: this.$t('Group name is already in use'),
        valid: false
      }
    },
    readMbs(value) {
      return value ? value + ' Mb/s' : this.$t('Unlimited')
    },
    readMb(value) {
      return value ? value + ' MB' : this.$t('Unlimited')
    },
    displayPeriod(value) {
      return value ? this.loadPeriod(value) : '-'
    },
    loadPeriod(val) {
      if (val === '1') return this.$t('Day')
      else if (val === '2') return this.$t('Week')
      return this.$t('Month')
    }
  }
}
</script>
