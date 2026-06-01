<template>
  <vuci-form
    v-slot="{ uciData }"
    config="gps"
    :after-load="loadData"
  >
    <vuci-typed-section
      :title="$t('Geofencing')"
      :help="
        $t(
          'This section displays geofence instances currently existing on the router. A geofence is a virtually defined boundary for a real-world geographic area. In order to begin editing an instance, click the button that looks like a pencil located next to it.'
        )
      "
      :table-actions="['column-list', 'search']"
      type="geofencing"
      :columns="geofencingColumns"
      :edit-form="gpsGeofencingEditModal"
      :endpoints="[{ endpoint: 'gps/geofencing/config' }]"
      data-key="geofences"
      :uci-data="uciData"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #longitude="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="longitude"
        />
      </template>
      <template #latitude="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="latitude"
        />
      </template>
      <template #radius="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="radius"
        />
      </template>
      <template #generate_event="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          :display-value="displayGenerateEventOn"
          name="generate_event"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.id"
          :label="$t('Name')"
          prop="id"
          maxlength="16"
          rules="uciname"
          required
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import gpsGeofencingEdit from './GPSGeofencingEdit'
import { map } from '@/plugins/map'

export default {
  provide() {
    return {
      profiles: this.getProfiles
    }
  },
  data() {
    return {
      gpsGeofencingEditModal: markRaw(gpsGeofencingEdit),
      geofencingColumns: [
        { name: 'name', label: this.$t('Name') },
        { name: 'longitude', label: this.$t('Longitude (X)') },
        { name: 'latitude', label: this.$t('Latitude (Y)') },
        { name: 'radius', label: this.$t('Radius') },
        { name: 'generate_event', label: this.$t('Generate event on') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      availableEvents: {
        on_exit: this.$t('Exit'),
        on_enter: this.$t('Enter'),
        on_both: this.$t('Enter/Exit')
      },
      profiles: []
    }
  },
  created() {
    map.load()
  },
  methods: {
    getProfiles() {
      return this.profiles
    },
    displayGenerateEventOn(value) {
      return this.availableEvents[value] || this.$t('N/A')
    },
    loadData() {
      return this.$axios
        .get('/api/profiles/config')
        .then(({ data }) => {
          this.profiles = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load profile data'))
        })
    }
  }
}
</script>
