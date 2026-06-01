<template>
  <section class="flex flex-col gap-4">
    <tlt-horizontal-card>
      <card-cell>
        <cell-row>
          <template #label>Very Cool</template>
          <template #value>Value</template>
        </cell-row>
      </card-cell>
      <card-cell :columns="columns[1]" />
      <card-cell :columns="columns[2]" />
      <card-cell :columns="columns[3]" />
      <action-cell>
        <tlt-switch
          v-model="value"
          custom-id="abc"
        ></tlt-switch>
      </action-cell>
    </tlt-horizontal-card>
    <tlt-horizontal-card>
      <name-cell
        class="lg:w-1/6"
        :index="1"
        value="Test"
      />
      <card-cell :columns="columns[1]" />
      <card-cell :columns="columns[2]" />
      <card-cell :columns="columns[3]" />
      <action-cell>
        <tlt-switch
          v-model="value"
          custom-id="abcd"
        ></tlt-switch>
      </action-cell>
    </tlt-horizontal-card>
  </section>
</template>

<script>
/**
 * @typedef {object} ColumnItem
 * @prop {string} label - Label of the item
 * @prop {string} value - Value of the item
 * @prop {string} class - Custom class of the item
 * @prop {string} customRender - Name of the slot to render
 * @prop {object} hint - Shows hint near item value
 * @prop {function} onClick - Function to call on item click
 */

import TltHorizontalCard from '@ui-core/tlt-design/overview/card/TltHorizontalCard.vue'
import ActionCell from '@ui-core/tlt-design/overview/card/ActionCell.vue'
import CardCell from '@ui-core/tlt-design/overview/card/CardCell.vue'
import CellRow from '@ui-core/tlt-design/overview/card/CellRow.vue'
import NameCell from '@ui-core/tlt-design/overview/card/NameCell.vue'
export default {
  components: {
    TltHorizontalCard,
    // eslint-disable-next-line vue/no-unused-components
    ActionCell,
    CardCell,
    NameCell,
    CellRow
  },
  data() {
    return {
      value: false,
      columns: [
        [{ label: 'Name', value: '192.168.223.154', onlyMobileLabel: true }],
        [
          { label: 'State', value: 'Established' },
          { label: 'Remote AS', value: '65002' },
          { label: 'State', value: '192.168.154.223' }
        ],
        [
          { label: 'Local AS', value: 'Established' },
          { label: 'Local host', value: '192.168.223.155' },
          { label: 'Accepted prefixes', value: '2' }
        ],
        [
          { label: 'Uptime', value: '00:00:46' },
          { label: 'Updates RX/TX', value: '6/7' },
          { label: 'Total RX/TX', value: '8/9' }
        ]
      ]
    }
  }
}
</script>
