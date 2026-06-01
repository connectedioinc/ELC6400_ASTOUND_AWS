<template>
  <vuci-form
    v-slot="{ uciData }"
    config="vrrpd"
    :after-load="loadData"
  >
    <vuci-typed-section
      type="vrrpd"
      :endpoints="[{ endpoint: 'vrrp/config' }]"
      :title="$t('VRRP configurations')"
      :help="$t('List of created VRRP configurations.')"
      data-key="vrrp"
      :uci-data="uciData"
      :edit-form="editModal"
    >
      <template #custom-design="{ s, index, actions }">
        <tlt-horizontal-card
          v-slot="{ props: { columns } }"
          :test-id="`rowCard-${s.id}`"
          class="mb-4 last:mb-0"
          :card-props="configurationColumns(s)"
        >
          <name-cell
            :value="s.id"
            :index="index + 1"
          />
          <card-cell :columns="columns[0]" />
          <card-cell :columns="columns[1]" />
          <action-cell>
            <cell-row
              :label="$t('Actions')"
              only-mobile-label
            >
              <template #value>
                <vuci-form-edit-delete
                  :id="s.id"
                  class="md:w-max"
                  :actions="actions"
                />
              </template>
            </cell-row>
          </action-cell>
          <action-cell>
            <cell-row
              :label="$t('Enable')"
              only-mobile-label
            >
              <template #value>
                <vuci-form-item-switch
                  class="w-max"
                  :uci-section="s"
                  name="enabled"
                />
              </template>
            </cell-row>
          </action-cell>
        </tlt-horizontal-card>
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.id"
          :label="$t('Name')"
          :help="$t('Name of the new vrrp configuration.')"
          prop="id"
          maxlength="8"
          required
          rules="uciname"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
import editVRRP from './VrrpEdit'

export default {
  provide() {
    return {
      interfaces: this.getInterfaces
    }
  },
  data() {
    return {
      updateStarted: false,
      interfaces: [],
      state: [],
      editModal: markRaw(editVRRP)
    }
  },
  timers: {
    loadState: { time: 3000, autostart: false, immediate: true, repeat: true }
  },
  computed: {
    ...mapState(useMainStore, ['modalOpen'])
  },
  methods: {
    configurationColumns(item) {
      const state = this.filterStatus(item.id)
      return {
        item,
        columns: [
          [
            { label: this.$t('Virtual ID'), value: item.virtual_id > 0 ? item.virtual_id : '-' },
            { label: this.$t('Priority'), value: item.priority > 0 ? item.priority : '-' },
            { label: this.$t('Virtual address'), value: item.virtual_ip ? item.virtual_ip[0] : '-' }
          ],
          [
            { label: this.$t('State'), value: state.state !== 'N/A' ? state.state : '-' },
            { label: this.$t('Main IP'), value: state.main_ip !== 'N/A' ? state.main_ip : '-' }
          ]
        ]
      }
    },
    getInterfaces() {
      return this.interfaces
    },
    loadState() {
      if (this.updateStarted || this.modalOpen) return
      this.updateStarted = true
      return this.$axios
        .get('/api/vrrp/status')
        .then(({ data }) => {
          this.state = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status'))
          this.state = []
        })
        .finally(() => {
          this.updateStarted = false
        })
    },
    filterStatus(section) {
      const defaultState = { main_ip: 'N/A', name: section, state: 'N/A' }
      return this.state.some(status => status.name === section) ? this.state.filter(status => status.name === section)[0] : defaultState
    },
    loadData() {
      return this.$axios
        .get('/api/interfaces/config')
        .then(({ data }) => {
          this.interfaces = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load interface data'))
        })
        .finally(() => {
          this.$timer.start('loadState')
        })
    }
  }
}
</script>
