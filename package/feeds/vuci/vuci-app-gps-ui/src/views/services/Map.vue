<template>
  <tlt-table
    id="available_devices"
    :columns="gpsColumns"
    :data-source="gpsData"
    :title="$t('Map')"
    :help="$t('This section displays the router\'s position on the world map, provided that the router has a GPS fix.')"
    :table-actions="['column-list', 'search']"
  >
    <template #before>
      <div
        v-show="!mapLoadingError"
        id="map"
        class="map mb-4"
      />
      <div
        v-show="mapLoadingError"
        class="mb-4"
      >
        {{ $t('Browser does not have access to internet to show map. Make sure your browser has access to internet and refresh the page.') }}
      </div>
    </template>
  </tlt-table>
  <div class="list-layout--ignore">
    <tlt-button
      button-id="update"
      :disabled="false"
      @click="updateLocation"
    >
      {{ $t('Update location') }}
    </tlt-button>
  </div>
</template>

<script>
import { map } from '@/plugins/map'

export default {
  data() {
    return {
      gpsColumns: [
        { dataIndex: 'fixTime', title: this.$t('Fix time') },
        { dataIndex: 'latitude', title: this.$t('Latitude') },
        { dataIndex: 'longitude', title: this.$t('Longitude') },
        { dataIndex: 'satellites', title: this.$t('Satellites') },
        { dataIndex: 'accuracy', title: this.$t('Accuracy') }
      ],
      gpsData: [],
      mapLoadingError: false,
      map: null,
      layer: null,
      errors: {
        1: this.$t('GPS service is off'),
        2: this.$t('No GPS signal')
      }
    }
  },
  created() {
    map.load().finally(() => {
      this.updateLocation()
    })
  },
  async mounted() {
    await map.loadPromise
    this.renderMap()
  },
  methods: {
    renderMap() {
      /* eslint-disable no-undef */
      if (map.isAvailable()) {
        this.map = new ol.Map({
          target: 'map',
          layers: [
            new ol.layer.Tile({
              source: new ol.source.OSM()
            })
          ],
          view: new ol.View({
            center: ol.proj.fromLonLat([0, 0]),
            zoom: 0
          })
        })
      } else {
        this.mapLoadingError = true
      }
    },
    updateLocation() {
      this.$spin()
      this.fixTime = this.$t('N/A')
      this.latitude = this.$t('N/A')
      this.longitude = this.$t('N/A')
      if (this.layer) {
        this.map.removeLayer(this.layer)
      }
      this.layer = null
      return this.$axios
        .get('/api/gps/global')
        .then(({ data }) => {
          if (data.enabled !== '1') throw new Error(1)
          return this.$axios.get('/api/gps/position/status')
        })
        .then(({ data: coordinates }) => {
          if (!coordinates.fix_status || ['N/A', '0'].includes(coordinates.fix_status)) throw new Error(2)
          this.gpsData = [
            {
              fixTime: this.$localDate(coordinates.utc_timestamp),
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              satellites: coordinates.satellites,
              accuracy: coordinates.accuracy
            }
          ]
          this.fixTime = coordinates.utc_timestamp
          this.latitude = coordinates.latitude
          this.longitude = coordinates.longitude

          if (map.isAvailable()) {
            const feature = new ol.Feature({
              geometry: new ol.geom.Point(ol.proj.fromLonLat([Number(coordinates.longitude), Number(coordinates.latitude)]))
            })
            this.layer = new ol.layer.Vector({
              source: new ol.source.Vector({
                features: [feature]
              }),
              style: new ol.style.Style({
                image: new ol.style.Icon({
                  anchor: [0.5, 25],
                  anchorXUnits: 'fraction',
                  anchorYUnits: 'pixels',
                  src: '/icons/marker.png'
                })
              })
            })
            const view = new ol.View({
              center: ol.proj.fromLonLat([Number(coordinates.longitude), Number(coordinates.latitude)]),
              zoom: 11
            })
            this.map.addLayer(this.layer)
            this.map.setView(view)
          }
        })
        .catch(err => {
          this.$message.error(this.errors[err.message])
        })
        .finally(() => {
          this.$spin(false)
        })
    }
  }
}
</script>
<style scoped>
.map {
  height: 400px;
  width: 100%;
}
</style>
