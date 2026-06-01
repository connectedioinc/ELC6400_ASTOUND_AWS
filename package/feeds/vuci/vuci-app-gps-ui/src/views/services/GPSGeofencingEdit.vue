<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="geofencingData"
    config="gps"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'gps/geofencing/config' }]"
      data-key="geofences"
      :uci-data="uciData"
      :name="section.id"
      :title="$utils.getModalTitle($t('geofencing details'), section.id)"
      :help="$t('This section is used to configure the geofence area. Scroll your mouse pointer over field names in order to see helpful hints.')"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Turns the geofence instance on or off.')"
        name="enabled"
        @vue:mounted="onEnableMounted"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Longitude (X)')"
        :help="
          $t(
            'East-west position of a point on the Earth\'s surface. Combining this and the Latitude information will produce a point on the world map that will serve as the center of the geofence area.'
          )
        "
        name="longitude"
        placeholder="0.000000"
        initial="0.000000"
        rules="precision_range(-180.000000,180.000000)"
        @change="changeLongitude"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Latitude (Y)')"
        :help="
          $t(
            'North-south position of a point on the Earth\'s surface. Combining this and the Longitude information will produce a point on the world map that will serve as the center of the geofence area'
          )
        "
        name="latitude"
        placeholder="0.000000"
        initial="0.000000"
        rules="precision_range(-90.000000,90.000000)"
        @change="changeLatitude"
      />
      <vuci-form-item-input
        ref="radius"
        :uci-section="s"
        :label="$t('Radius')"
        :help="$t('Radius (in meters) of this geofence area.')"
        name="radius"
        placeholder="200"
        initial="200"
        rules="irange(1,999999)"
        @change="changeRadius"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Generate event on')"
        :help="$t('Specifies whether the rule should be triggered when the device enters the geofence area, leaves it or on both events.')"
        name="generate_event"
        :options="events"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Switch profile')"
        :help="$t('Select a profile to switch to on this geofencing event.')"
        name="switch_profile"
        initial=""
        :options="profileOptions"
      />
      <vuci-form-item-button
        :uci-section="s"
        name="getLocation"
        :label="$t('Get current coordinates')"
        :help="$t('Obtains the device\'s current coordinates and places them in the Longitude and Latitude fields.')"
        :text="$t('Get')"
        @click="getLocation"
      />
      <div
        v-show="!mapLoadingError"
        id="map-geofencing"
        class="map"
      />
      <div v-show="mapLoadingError">
        {{ $t('Browser does not have access to internet to show map. Make sure your browser has access to internet and refresh the page.') }}
      </div>
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import { map } from '@/plugins/map'

export default {
  inject: ['profiles'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      mapLoadingError: false,
      map: null,
      layer: null,
      zoom: 11,
      center: [Number(this.section.longitude) ? Number(this.section.longitude) : 0, Number(this.section.latitude) ? Number(this.section.latitude) : 0],
      circlePoint: [Number(this.section.longitude) ? Number(this.section.longitude) : 0, Number(this.section.latitude) ? Number(this.section.latitude) : 0],
      radius: Number(this.section.radius) ? Number(this.section.radius) : 200,
      events: [
        ['on_exit', this.$t('Exit')],
        ['on_enter', this.$t('Enter')],
        ['on_both', this.$t('Enter/exit')]
      ],
      geofencingData: {}
    }
  },
  computed: {
    profileOptions() {
      const options = [['', this.$t('None')]]
      const profiles = this.profiles().map(profile => profile.id)
      return options.concat(profiles)
    }
  },
  methods: {
    calculateRadius() {
      const radLat = (this.circlePoint[1] * Math.PI) / 180
      const calculatedRadius = ((1 - Math.pow(0.081, 2)) * (1 / Math.cos(radLat))) / (1 - Math.pow(0.081, 2) * Math.pow(Math.sin(radLat), 2))
      return calculatedRadius * this.radius
    },
    async onEnableMounted() {
      await map.loadPromise
      this.renderMap()
    },
    renderMap() {
      /* eslint-disable no-undef */
      if (map.isAvailable()) {
        this.map = new ol.Map({
          target: 'map-geofencing',
          layers: [
            new ol.layer.Tile({
              source: new ol.source.OSM()
            })
          ],
          view: new ol.View({
            center: ol.proj.fromLonLat(this.center),
            zoom: this.zoom
          })
        })
        this.renderGeofencing()
      } else {
        this.mapLoadingError = true
      }
    },
    renderGeofencing() {
      if (map.isAvailable()) {
        if (this.layer) {
          this.map.removeLayer(this.layer)
        }

        this.layer = new ol.layer.Vector({
          source: new ol.source.Vector({
            features: [new ol.Feature(new ol.geom.Circle(ol.proj.fromLonLat(this.circlePoint), this.calculateRadius()))]
          }),
          style: [
            new ol.style.Style({
              stroke: new ol.style.Stroke({
                color: 'rgb(238,153,0)'
              }),
              fill: new ol.style.Fill({
                color: 'rgba(238,153,0,0.4)'
              }),
              text: new ol.style.Text({
                text: this.section.id,
                font: '12px Open Sans, sans-serif',
                stroke: new ol.style.Stroke({
                  color: 'white',
                  width: 2.5
                })
              })
            })
          ]
        })

        const view = new ol.View({
          center: ol.proj.fromLonLat(this.center),
          zoom: this.zoom
        })

        this.map.addLayer(this.layer)
        this.map.setView(view)
      }
    },
    changeLongitude(e) {
      if (!isNaN(Number(e.model))) {
        this.center = [Number(e.model), this.center[1]]
        this.circlePoint = [Number(e.model), this.circlePoint[1]]
        this.renderGeofencing()
      }
    },
    changeLatitude(e) {
      if (!isNaN(Number(e.model))) {
        this.center = [this.center[0], Number(e.model)]
        this.circlePoint = [this.circlePoint[0], Number(e.model)]
        this.renderGeofencing()
      }
    },
    changeRadius(e) {
      if (!isNaN(Number(e.model))) {
        this.radius = Number(e.model)
        this.renderGeofencing()
      }
    },
    getLocation() {
      this.$spin(true)
      return this.$axios
        .get('/api/gps/position/status')
        .then(({ data: coordinates }) => {
          if (coordinates.fix_status && coordinates.fix_status === '1') {
            const editableSection = this.geofencingData.geofences.find(section => section.id === this.section.id)
            editableSection.latitude = coordinates.latitude
            editableSection.longitude = coordinates.longitude
            this.center = [Number(coordinates.longitude), Number(coordinates.latitude)]
            this.circlePoint = [Number(coordinates.longitude), Number(coordinates.latitude)]
            this.renderGeofencing()
          } else {
            this.$message.error(this.$t('Failed getting current position'))
          }
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
