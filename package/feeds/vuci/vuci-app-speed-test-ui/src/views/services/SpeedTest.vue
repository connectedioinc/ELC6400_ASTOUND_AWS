<template>
  <tlt-card :title="$t('Speed test')">
    <div class="xl:mt-14 flex flex-col xl:flex-row justify-center">
      <div
        class="flex flex-row xl:flex-col mb-8 xl:gap-[84px]"
        test-id="speed-label-wrapper"
      >
        <div
          class="flex w-full gap-4 items-center mr-2 xl:mr-0 p-4 xl:w-[282px] h-20 rounded-xl border"
          test-id="speed-label"
        >
          <div class="bg-theme-text-primary rounded-full p-1">
            <tlt-icon
              icon="download-import"
              size="size-6"
              class="text-theme-text-on-primary"
            />
          </div>
          <div
            test-id="download"
            class="flex flex-col"
          >
            <h2 class="text-theme-text-secondary font-semibold text-body-secondary mb-2">
              {{ $t('Download') }}
            </h2>
            <p v-if="currentState === 'TESTING_DOWNLOAD'">
              {{ $t('Testing...') }}
            </p>
            <p v-else>
              {{ finalAvgDownload > 0 ? finalAvgDownload.toFixed(2) + ' ' + $t('Mbps') : '-' }}
            </p>
          </div>
        </div>
        <div
          class="flex w-full gap-4 items-center p-4 xl:w-[282px] h-20 rounded-xl border"
          test-id="speed-label"
        >
          <div class="bg-theme-bg-warning rounded-full p-1">
            <tlt-icon
              icon="upload-export"
              size="size-6"
              class="text-theme-text-on-warning"
            />
          </div>
          <div test-id="upload">
            <h2 class="text-theme-text-secondary font-semibold text-body-secondary mb-2">
              {{ $t('Upload') }}
            </h2>
            <p v-if="currentState === 'TESTING_UPLOAD'">
              {{ $t('Testing...') }}
            </p>
            <p v-else>
              {{ finalAvgUpload > 0 ? finalAvgUpload.toFixed(2) + ' ' + $t('Mbps') : '-' }}
            </p>
          </div>
        </div>
      </div>
      <div>
        <div class="mx-6 2xl:mx-20 flex justify-center items-center">
          <canvas id="speed-test">
            {{ $t('Your browser does not support the canvas element.') }}
          </canvas>
        </div>
        <div
          class="flex flex-col items-center mb-10 gap-5"
          test-id="provider-wrapper"
        >
          <div class="flex items-center justify-center gap-2">
            <tlt-icon
              :icon="
                currentState === 'TESTING_UPLOAD' || currentState === 'FINISHED' || currentState === 'CHECKING_CONNECTION' || currentState === 'COOLDOWN' || !currentState
                  ? 'upload-export'
                  : 'download-import'
              "
              size="size-4"
              :class="{
                'text-[var(--blue-700)]': currentState === 'TESTING_DOWNLOAD',
                'text-[var(--orange-400)]': currentState === 'TESTING_UPLOAD',
                'text-gray-600':
                  !currentState || currentState === 'CHECKING_CONNECTION' || currentState === 'IDLE' || currentState === 'ERROR' || currentState === 'FINISHED' || currentState === 'COOLDOWN'
              }"
            />
            <span>{{ $t('Mbps') }}</span>
          </div>
          <div>
            <strong>{{ $t('Carrier') }}:</strong> {{ mobileOperator }}
          </div>
          <tlt-button
            button-id="starttest"
            :disabled="(!customServerUrl && !url) || isDisabledButton"
            @click="startSpeedTest"
          >
            {{ $t('Start test') }}
          </tlt-button>
        </div>
      </div>
      <div class="flex flex-col gap-2 xl:gap-0">
        <div class="w-full gap-4 flex items-center p-4 xl:w-[282px] h-20 rounded-xl border">
          <tlt-icon
            icon="device"
            class="h-8 w-8 bg-theme-bg-secondary-3 p-1 rounded-full text-theme-text-on-secondary shrink-0"
          />
          <div
            class="flex flex-col truncate"
            test-id="interface"
          >
            <h2 class="text-theme-text-secondary font-semibold text-body-secondary mb-2">
              {{ $t('Interface') }}
            </h2>
            <tlt-hint
              class="!flex items-center gap-2"
              :hints="[{ info: interfaceInfo }]"
            >
              <p class="truncate">
                {{ interfaceInfo ? interfaceInfo : $t('Searching for Interface information') }}
              </p>
            </tlt-hint>
          </div>
        </div>
        <div class="hidden xl:flex flex-col justify-center items-center py-2">
          <div
            v-for="circle in 9"
            :key="circle"
            class="w-1 h-1 mb-1 bg-theme-bg-secondary-subtle rounded-full last:mb-0"
            :class="{
              '!bg-theme-bg-primary-1': currentState === 'TESTING_DOWNLOAD' && circles.includes(circle),
              '!bg-theme-bg-warning': currentState === 'TESTING_UPLOAD' && circles.includes(circle)
            }"
          />
        </div>
        <div class="w-full gap-4 flex items-center p-4 xl:w-[282px] h-20 rounded-xl border">
          <tlt-icon
            icon="server"
            class="h-8 w-8 bg-theme-bg-secondary-3 p-1 rounded-full text-theme-text-on-secondary shrink-0"
          />
          <div
            test-id="server"
            class="flex flex-col truncate"
          >
            <div class="flex items-center text-body-secondary mb-2 font-semibold">
              <h2 class="text-theme-text-secondary mr-2">
                {{ $t('Server') }}
              </h2>
              <tlt-button
                type="text"
                button-id="changeserver"
                :disabled="isDisabledButton"
                @click="openModal"
              >
                {{ $t('Change') }}
              </tlt-button>
            </div>
            <tlt-hint
              :hints="[{ info: serverInfo }]"
              class="!flex items-center gap-2"
            >
              <p class="truncate">
                {{ serverInfo ? serverInfo : $t('Searching for Server information') }}
              </p>
            </tlt-hint>
          </div>
        </div>
      </div>
    </div>
    <tlt-modal
      ref="serversModal"
      :open="modalOpen"
      @close="closeModal"
    >
      <tlt-form sid="tlt-form-speedtest-servers">
        <tlt-table
          id="servers"
          :title="$t('Speed test server list')"
          :columns="serverColumns"
          :data-source="serverList"
          :no-value-text="serversExist ? $t('This section does not contain any servers yet') : $t('Cannot retrieve any servers. Please check your internet connection')"
          pagination
          selectable
          :table-actions="[
            { id: 'custom-url', label: $t('Use custom URL'), buttonProps: { iconLeft: 'customURL' }, callback: () => (customServerUrlModalOpen = true) },
            { id: 'refresh', label: $t('Refresh'), buttonProps: { iconLeft: 'refresh' }, callback: () => refreshServerList(searchWord) },
            'column-list',
            'search'
          ]"
          @selected="getSelected"
        >
          <template #search>
            <table-search
              v-model="searchWord"
              class="max-lg:order-first"
              @submit="refreshServerList(searchWord)"
            />
          </template>
        </tlt-table>
      </tlt-form>
    </tlt-modal>
    <tlt-modal
      :title="$t('Use custom server URL for testing')"
      size="small"
      :open="customServerUrlModalOpen"
      @close="closeCustomServerUrlModal"
    >
      <ListLayout gap="md">
        <tlt-form-item-input
          v-model="customServerUrl"
          :help="$t('Saving empty Custom URL field will result in selecting first server from the server list.')"
          :label="$t('Custom URL')"
          prop="custom_url"
          placeholder="www.example.com"
        />
        <hr class="!p-0" />
        <div class="flex gap-8 justify-end mx-1">
          <tlt-button
            button-id="cancel"
            color="secondary"
            @click="customServerUrlModalOpen = false"
          >
            {{ $t('Cancel') }}
          </tlt-button>
          <tlt-button
            button-id="saveandapply"
            @click="saveCustomServerUrl"
          >
            {{ $t('Save & Apply') }}
          </tlt-button>
        </div>
      </ListLayout>
    </tlt-modal>
  </tlt-card>
</template>

<script>
import TableSearch from '@ui-core/components/table/TableSearch.vue'

export default {
  components: { TableSearch },
  data() {
    return {
      customServerUrlModalOpen: false,
      customServerUrl: null,
      searchWord: '',
      vueCanvas: null,
      vueCtx: null,
      startingPos: 0.75 * Math.PI,
      endPos: 2.25 * Math.PI,
      canvasNumbers: [0, 5, 10, 50, 100, 250, 500, 750, 1000],
      avgDownload: 0,
      avgUpload: 0,
      finalAvgDownload: 0,
      finalAvgUpload: 0,
      servers: [],
      targetIP: '',
      target: 0,
      currentState: '',
      currentValue: 0,
      isDisabledButton: false,
      modalOpen: false,
      serverColumns: [
        { dataIndex: 'country', title: this.$t('Country') },
        { dataIndex: 'city', title: this.$t('City') },
        { dataIndex: 'distance', title: this.$t('Distance') },
        { dataIndex: 'name', title: this.$t('Name') }
      ],
      currentData: {},
      host: '',
      url: '',
      myIp: '',
      wan: '',
      serversExist: true,
      currentSpeedTestIndex: null,
      circles: [],
      mobileOperator: ''
    }
  },
  timers: {
    loadResults: { time: 1000, repeat: true }
  },
  computed: {
    serverList() {
      return this.servers.map(server => ({
        country: server.country,
        city: server.name,
        name: server.sponsor,
        host: server.host,
        url: server.url,
        distance: `${server.distance}km`
      }))
    },
    interfaceInfo() {
      return `${this.wan}${this.myIp ? ' - ' + this.myIp : ''}`
    },
    serverInfo() {
      return this.customServerUrl || `${this.host}${this.targetIP ? ' - ' + this.targetIP : ''}`
    }
  },
  watch: {
    currentState(val) {
      clearInterval(this.interval)
      this.currentSpeedTestIndex = null
      this.circles = []
      if (val === 'TESTING_UPLOAD') {
        this.interval = setInterval(() => {
          if (this.currentSpeedTestIndex < 9) {
            this.currentSpeedTestIndex++
            this.circles.push(this.currentSpeedTestIndex)
            if (this.currentSpeedTestIndex > 3) {
              this.circles.shift(this.currentSpeedTestIndex - 3)
            }
          } else {
            this.currentSpeedTestIndex = null
            this.circles = []
          }
        }, 100)
      } else if (val === 'TESTING_DOWNLOAD') {
        this.interval = setInterval(() => {
          if (this.currentSpeedTestIndex >= 1) {
            this.circles.unshift(this.currentSpeedTestIndex)
            this.currentSpeedTestIndex--
            if (this.currentSpeedTestIndex < 6) {
              this.circles.pop(this.currentSpeedTestIndex)
            }
          } else {
            this.currentSpeedTestIndex = 9
            this.circles = []
          }
        }, 100)
      }
    }
  },
  created() {
    this.loadData()
  },
  mounted() {
    this.vueCanvas = document.getElementById('speed-test')
    this.vueCtx = this.vueCanvas.getContext('2d')
    this.draw()
  },
  methods: {
    draw() {
      const val = this.currentValue
      this.vueCtx.clearRect(0, 0, this.vueCanvas.width, this.vueCanvas.height)
      let x = 0
      const interval = 0.1875
      if (val > 0) {
        x = x + ((interval * 2) / 10) * (val >= 10 ? 10 : val)
      }
      if (val > 10) {
        x = x + (interval / 40) * (val >= 50 ? 40 : val - 10)
      }
      if (val > 50) {
        x = x + (interval / 50) * (val >= 100 ? 50 : val - 50)
      }
      if (val > 100) {
        x = x + (interval / 150) * (val >= 250 ? 150 : val - 100)
      }
      if (val > 250) {
        x = x + ((interval * 3) / 750) * (val >= 1000 ? 750 : val - 250)
      }
      const angle = Math.PI * x
      this.vueCanvas.width = '300'
      this.vueCanvas.height = '300'
      this.drawGaugeSpeeds()
      this.drawGauge(this.endPos)
      this.drawGauge(Math.PI * 0.75 + angle, true)
      this.drawCircle4()
      this.drawCircle3()
      this.drawCircle2()
      this.drawCircle1withStroke()
      this.drawPointerCircle()
      this.drawPointer(angle)
      this.drawSpeed(this.target)

      if (Math.round(this.target * 10) !== Math.round(this.currentValue * 10)) {
        this.currentValue += this.inclineCalculation(this.target, val)
        if (this.currentValue < 0.1) {
          this.currentValue = 0
        }
        window.requestAnimationFrame(this.draw)
      }
    },
    drawGauge(angle, gradient = false) {
      this.vueCtx.lineWidth = 20
      if (gradient) {
        const gradient = this.vueCtx.createLinearGradient(this.vueCanvas.width / 2, this.vueCanvas.height / 2, 50, 200)
        if (this.currentState === 'TESTING_DOWNLOAD' || this.currentState === 'COOLDOWN') {
          gradient.addColorStop('0', '#0066CC')
          gradient.addColorStop('0.5', '#023D78')
        }
        if (this.currentState === 'TESTING_UPLOAD' || this.currentState === 'FINISHED') {
          gradient.addColorStop('0', '#FBB90F')
          gradient.addColorStop('0.5', '#E5670B')
        }
        this.vueCtx.strokeStyle = gradient
      } else {
        this.vueCtx.strokeStyle = '#E9E9E9'
      }

      this.vueCtx.beginPath()
      this.vueCtx.arc(this.vueCanvas.width / 2, this.vueCanvas.height / 2, 102, this.startingPos, angle)
      this.vueCtx.stroke()
    },
    drawPointer(angle) {
      angle = Math.PI * 1.75 - angle
      this.vueCtx.beginPath()
      this.vueCtx.globalAlpha = 1
      const onGaugePoint = this.getCoordinates(angle, this.vueCanvas.width / 2 - (this.vueCanvas.width / 2) * 0.26)
      const lowerStartPoint = this.getCoordinates(angle + 1.5 * Math.PI, this.vueCanvas.width * 0.015)
      const upperStartPoint = this.getCoordinates(angle - 1.5 * Math.PI, this.vueCanvas.width * 0.015)
      this.vueCtx.moveTo(lowerStartPoint[0], lowerStartPoint[1])
      this.vueCtx.lineTo(onGaugePoint[0], onGaugePoint[1])
      this.vueCtx.lineTo(upperStartPoint[0], upperStartPoint[1])

      const grid = this.vueCtx.createLinearGradient(onGaugePoint[0], onGaugePoint[1], this.vueCanvas.width / 2, this.vueCanvas.height)
      grid.addColorStop(1, '#1F1E1E')

      this.vueCtx.fillStyle = grid
      this.vueCtx.fill()
    },
    drawGaugeSpeeds() {
      for (let i = 0; i < this.canvasNumbers.length; i++) {
        const angle = (Math.PI * 1.5 * i) / (this.canvasNumbers.length - 1) - Math.PI * 1.75
        const point = this.getCoordinates(-angle, (this.vueCanvas.height / 2) * 0.9)
        this.vueCtx.textAlign = 'center'
        this.vueCtx.font = '600 14px Arial'
        if (this.currentState === 'TESTING_DOWNLOAD' && this.target >= this.canvasNumbers[i]) {
          this.vueCtx.fillStyle = '#023D78'
        } else if (this.currentState === 'TESTING_UPLOAD' && this.target >= this.canvasNumbers[i]) {
          this.vueCtx.fillStyle = '#E5670B'
        } else {
          this.vueCtx.fillStyle = '#000000'
          this.vueCtx.font = '14px Arial'
        }
        this.vueCtx.fillText(this.canvasNumbers[i], point[0], point[1])
      }
    },
    drawSpeed(value) {
      this.vueCtx.fillStyle = '#000000'
      this.vueCtx.font = '32px Arial'
      this.vueCtx.textAlign = 'center'
      this.vueCtx.fillText(value > 0 ? Math.round(value * 100) / 100 : '-', this.vueCanvas.width / 2, this.vueCanvas.height - 30)
    },
    drawCircle1withStroke() {
      this.vueCtx.beginPath()
      this.vueCtx.arc(this.vueCanvas.width / 2, this.vueCanvas.height / 2, 17.5, 0, 2 * Math.PI)
      this.vueCtx.fillStyle = '#E9E9E9'
      this.vueCtx.lineWidth = 1
      this.vueCtx.fill()
      this.vueCtx.strokeStyle = '#DADADA'
      this.vueCtx.stroke()
      this.vueCtx.strokeStyle = 'black'
    },
    drawCircle2() {
      this.vueCtx.beginPath()
      this.vueCtx.arc(this.vueCanvas.width / 2, this.vueCanvas.height / 2, 35, 0, 2 * Math.PI)
      this.vueCtx.lineWidth = 1
      this.vueCtx.fillStyle = '#FAFAFA'
      this.vueCtx.fill()
      this.vueCtx.strokeStyle = '#E9E9E9'
      this.vueCtx.stroke()
    },
    drawCircle3() {
      this.vueCtx.beginPath()
      this.vueCtx.arc(this.vueCanvas.width / 2, this.vueCanvas.height / 2, 53, 0, 2 * Math.PI)
      this.vueCtx.lineWidth = 1
      this.vueCtx.fillStyle = '#FAFAFA'
      this.vueCtx.fill()
      this.vueCtx.strokeStyle = '#E9E9E9'
      this.vueCtx.stroke()
    },
    drawCircle4() {
      this.vueCtx.beginPath()
      this.vueCtx.arc(this.vueCanvas.width / 2, this.vueCanvas.height / 2, 72.5, 0, 2 * Math.PI)
      this.vueCtx.lineWidth = 1
      this.vueCtx.fillStyle = '#FAFAFA'
      this.vueCtx.fill()
      this.vueCtx.strokeStyle = '#E9E9E9'
      this.vueCtx.stroke()
    },
    drawPointerCircle() {
      this.vueCtx.beginPath()
      this.vueCtx.arc(this.vueCanvas.width / 2, this.vueCanvas.height / 2, 7.5, 0, 2 * Math.PI)
      this.vueCtx.strokeStyle = '#1F1E1E'
      this.vueCtx.stroke()
      this.vueCtx.fillStyle = '#1F1E1E'
      this.vueCtx.fill()
    },
    inclineCalculation(target, val) {
      const dif = target - val
      if (Math.abs(dif) > 0.1) {
        return dif / 10
      } else if (dif > 0) {
        return 0.01
      } else if (dif < 0) {
        return -0.01
      }
    },
    getCoordinates(angle, rad) {
      return [this.vueCanvas.width / 2 + rad * Math.sin(angle), this.vueCanvas.height / 2 + rad * Math.cos(angle)]
    },
    startSpeedTest() {
      this.$prompt.show({
        title: this.$t('Run speed test?'),
        content: this.$t('Speed tests can drain a significant amount of data. Please make according considerations before using the speed test tool.'),
        okText: this.$t('Continue'),
        cancelText: this.$t('Cancel'),
        onOk: this.onOk
      })
    },
    onOk() {
      this.isDisabledButton = true
      this.avgDownload = 0
      this.avgUpload = 0
      this.finalAvgDownload = 0
      this.finalAvgUpload = 0
      return this.$axios.post('/api/speedtest/actions/start', { data: { url: this.customServerUrl || this.url } }).then(() => {
        this.$timer.start('loadResults')
      })
    },
    loadResults() {
      return this.$axios.get('/api/speedtest/status?exclude=isp,external_ip').then(({ success, data }) => {
        this.currentState = data.state
        if (!success || data.state === 'ERROR') this.$timer.stop('loadResults')
        if (this.currentState === 'FINISHED') {
          this.target = 0
          this.finalAvgUpload = this.avgUpload
          this.draw()
          this.isDisabledButton = false
          this.$timer.stop('loadResults')
          return
        }
        if (this.currentState === 'ERROR') {
          this.target = 0
          this.$message.error(this.$t(data.error))
          this.host = this.$t('Failed to find provider')
          this.targetIP = this.$t('Failed to find IP')
          this.isDisabledButton = false
        } else if (this.currentState === 'COOLDOWN') {
          this.target = 0
          this.finalAvgDownload = this.avgDownload
        } else if (this.currentState === 'TESTING_DOWNLOAD' && this.avgDownload !== this.convertToMbps(data.avgDownloadSpeed)) {
          this.avgDownload = this.convertToMbps(data.avgDownloadSpeed)
          this.target = this.avgDownload
        } else if (this.currentState === 'TESTING_UPLOAD' && this.avgUpload !== this.convertToMbps(data.avgUploadSpeed)) {
          this.avgUpload = this.convertToMbps(data.avgUploadSpeed)
          this.target = this.avgUpload
        }
        this.draw()
      })
    },
    closeCustomServerUrlModal() {
      this.$prompt.show({
        title: this.$t('Go back?'),
        content: this.$t('Unsaved changes will be discarded'),
        okText: this.$t('Discard'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.customServerUrlModalOpen = false
        }
      })
    },
    saveCustomServerUrl() {
      return this.$axios
        .put('/api/speedtest/config/general', { data: { custom_url: this.customServerUrl } })
        .then(response => {
          if (response.success) {
            this.customServerUrlModalOpen = false
            this.customServerUrl = response.data.custom_url
            if (!response.data.custom_url) {
              this.servers.length && this.getSelected(this.servers[0])
              this.$message.success(this.$t('Custom URL removed successfully'))
            } else this.$message.success(this.$t('Custom URL saved successfully'))
          }
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to save custom server URL.'))
        })
    },
    loadIP(url) {
      return this.$axios
        .post('/api/speedtest/actions/get_ip', { data: { url } })
        .then(response => {
          this.targetIP = response.data.response
        })
        .catch(() => {
          this.targetIP = ''
          this.$message.error(this.$t('Failed to retrieve provider IP address. Please check your internet connection.'))
        })
    },
    getSelected(val) {
      this.currentData = val
      this.closeModal()
      this.url = this.currentData.url
      this.host = this.currentData.name
      this.isDisabledButton = true
      this.customServerUrl = null
      return this.loadIP(this.currentData.host).then(() => {
        this.isDisabledButton = false
      })
    },
    loadData() {
      const endpoints = ['/api/speedtest/options', '/api/speedtest/status', '/api/speedtest/config/general']
      return this.$axios
        .bulkGet(endpoints)
        .then(([serverListRes, wanRes, customUrlRes]) => {
          if (serverListRes.success) {
            this.servers = serverListRes.data
            this.host = this.servers[0].sponsor
            this.targetIP = this.servers[0].ip ?? ''
            this.url = this.servers[0].url ?? ''
          } else {
            this.servers = []
            this.$message.error(this.$t('Cannot retrieve server list.'))
          }
          if (wanRes.success) {
            this.wan = wanRes.data.wan_name
            this.mobileOperator = wanRes.data.isp
            this.myIp = wanRes.data.wan_ip
          } else {
            this.$message.error(this.$t('Failed to retrieve wan. Please check your internet connection.'))
          }
          if (customUrlRes.success) this.customServerUrl = customUrlRes.data.custom_url
          else this.$message.error(this.$t('Failed to retrieve custom server URL.'))
        })
        .catch(() => {
          this.$timer.stop('loadResults')
          this.$message.error('An unexpected error occurred')
        })
    },
    refreshServerList(text) {
      this.$spin()
      return this.$axios
        .post('/api/speedtest/actions/refresh', text ? { data: { search: text } } : null)
        .then(response => {
          this.servers = response.success ? response.data : []
        })
        .catch(() => {
          this.$message.error(this.$t('Cannot retrieve server list.'))
          this.serversExist = false
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    convertToMbps(value) {
      return value / 125000
    },
    openModal() {
      this.modalOpen = true
      this.isDisabledButton = true
    },
    closeModal() {
      this.modalOpen = false
      this.isDisabledButton = false
    }
  }
}
</script>
