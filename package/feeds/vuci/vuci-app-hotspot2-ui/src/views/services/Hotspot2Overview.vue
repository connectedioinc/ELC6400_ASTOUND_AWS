<template>
  <vuci-form
    v-slot="{ uciData }"
    config="wireless"
    :after-load="afterLoad"
  >
    <vuci-typed-section
      type="wifi-iface"
      :title="$t('Hotspot 2.0')"
      :columns="columns"
      :edit-form="Hotspot2Edit"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'hotspot2/config' }]"
      data-key="hotspot2"
      :form-methods="['edit', 'get']"
    >
      <template #interface="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="ssid"
          no-write
        />
      </template>
      <template #enable="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="interworking"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script>
import { markRaw } from 'vue'
import Hotspot2Edit from './Hotspot2Edit'

export default {
  provide() {
    return {
      formOptions: this.getFormOptions
    }
  },
  data() {
    return {
      columns: [
        { name: 'interface', label: this.$t('Interface') },
        { name: 'enable', label: this.$t('Enabled') }
      ],
      Hotspot2Edit: markRaw(Hotspot2Edit),
      sections: ['venues', '3gpp', 'nai', 'names', 'capabilities'],
      wirelessInterfaces: []
    }
  },
  methods: {
    getFormOptions() {
      return { wirelessInterfaces: this.wirelessInterfaces }
    },
    afterLoad(form) {
      const requests = ['/api/wireless/interfaces/config', ...this.buildBulkRequest('/api/hotspot2', form.hotspot2, this.sections)]
      return this.$axios
        .bulkGet(requests)
        .then(([wirelessRes, ...bulkRes]) => {
          if (wirelessRes.success) this.wirelessInterfaces = wirelessRes.data
          else this.$message.error(this.$t('Failed to load wireless interfaces'))
          return this.parseBulkResponse(form.hotspot2, this.sections, 'ssid', bulkRes)
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
          return {}
        })
    },
    buildBulkRequest(endoint, formTypedSection, sections) {
      return formTypedSection
        .map(section => {
          return sections.map(item => `${endoint}/${section.id}/${item}/config`)
        })
        .flat()
    },
    divideArray(array, partCount) {
      const equalyDividedArrayIndex = Math.ceil(array.length / partCount)
      return [...Array(partCount)].map(() => {
        return array.splice(0, equalyDividedArrayIndex)
      })
    },
    parseBulkResponse(formItems, sections, sectionDisplayNameIndex, bulkRes) {
      const sectionsObj = {}
      const itemResponses = this.divideArray(bulkRes, formItems.length)
      itemResponses.forEach((itemRes, itemIndex) => {
        const item = formItems[itemIndex]
        const typedSectionDisplay = item[sectionDisplayNameIndex]
        itemRes.forEach(({ data, success }, index) => {
          if (success) {
            sectionsObj[`${item.id}_${sections[index]}`] = data
          } else {
            this.$message.error(this.$t('Failed to load data from "%s" endpoint in "%s" section').format(sections[index], typedSectionDisplay))
          }
        })
      })
      return sectionsObj
    }
  }
}
</script>
