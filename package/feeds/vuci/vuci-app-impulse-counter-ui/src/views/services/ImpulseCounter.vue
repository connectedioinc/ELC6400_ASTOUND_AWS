<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="impulse_counter"
    :after-load="startStatus"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('Impulse counter configuration')"
      data-key="impulse_counter"
      :endpoints="[{ endpoint: 'impulse_counter/global' }]"
    >
      <tlt-form-model-item
        element-id="status"
        :help="$t('Status of service, whether it is currently running.')"
        :label="$t('Status')"
      >
        <tlt-dummy-value
          :value="status?.state === '1' ? $t('Up') : $t('Down')"
          :class="status?.state === '1' ? 'success' : 'error'"
        />
      </tlt-form-model-item>
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enabled')"
        :help="$t('Enable impulse counter.')"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="count_store_duration"
        :label="$t('Count store duration')"
        :help="$t('Define for how long the impulse counts are retained, in seconds, before being reset.')"
        required
        initial="86400"
        allow-create
        :options="storeDurationOptions"
        rules="irange(3600,3456000)"
      />
      <vuci-form-item-button
        :uci-section="s"
        name="reset"
        type="button"
        size="sm"
        :help="$t('Reset collected impulse counts.')"
        :label="$t('Reset counts')"
        :text="$t('Clear database')"
        no-write
        @click="clearPrompt"
      />
    </vuci-named-section>
    <vuci-typed-section
      :uci-data="uciData"
      data-key="input"
      :endpoints="[{ endpoint: 'impulse_counter/config' }]"
      type="input"
      :title="$t('Input configuration')"
      :columns="inputColumns"
      :table-actions="['column-list']"
      :edit-form="editModal"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
        />
      </template>
      <template #count="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="count"
          :display-value="displayCount"
          no-write
        />
      </template>
      <template #gpio="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="gpio"
          :display-value="displayGpio"
          no-write
        />
      </template>
      <template #edge="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="edge"
          :display-value="displayEdge"
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
          v-model="addModel.name"
          prop="name"
          :label="$t('New configuration name')"
          :help="$t('Name of the new input configuration.')"
          rules="string"
          maxlength="200"
          required
        />
        <tlt-form-item-select
          v-model="addModel.gpio"
          prop="gpio"
          :label="$t('GPIO pin')"
          :help="$t('Select GPIO pin.')"
          :options="gpioListValue"
        />
      </template>
      <template #action-design="{ actions }">
        <tlt-button
          button-id="add"
          :disabled="!gpioListValue.length"
          @click="actions.create"
        >
          {{ $t('Add') }}
        </tlt-button>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './InputEdit'

export default {
  provide() {
    return {
      formOptions: this.getFormOptions
    }
  },
  data() {
    return {
      editModal: markRaw(EditForm),
      formData: {},
      status: {},
      inputColumns: [
        {
          name: 'name',
          label: this.$t('Input name')
        },
        {
          name: 'count',
          label: this.$t('Count')
        },
        { name: 'gpio', label: this.$t('GPIO pin') },
        { name: 'edge', label: this.$t('Edge') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      edgeOptions: [
        ['rising', this.$t('Rising')],
        ['falling', this.$t('Falling')],
        ['both', this.$t('Both')]
      ],
      storeDurationOptions: [
        ['3600', this.$t('Hour')],
        ['86400', this.$t('Day')],
        ['604800', this.$t('Week')],
        ['2592000', this.$t('Month')]
      ],
      displayValues: [],
      statusData: [],
      ioList: []
    }
  },

  computed: {
    /**
     * Returns the filtered list of GPIOs based on the formData input.
     * If the formData input is empty, it returns the entire ioList.
     * If the formData input is not empty, it filters out the GPIOs that have already been selected.
     *
     * @returns {Array} The filtered list of GPIOs.
     */
    gpioListValue() {
      if (!this.formData.input?.length) return this.ioList
      return this.ioList.filter(io => !this.formData.input.some(input => input.gpio === io.key))
    }
  },
  mounted() {
    this.$timer.start({ method: this.updateStatus, time: 3000, autostart: false, immediate: true })
  },
  methods: {
    /**
     * Starts the status update timer for the ImpulseCounter component.
     * This method is called after the form loads to begin periodic status updates.
     */
    startStatus() {
      this.$timer.start(this.updateStatus)
    },
    /**
     * Returns the provided value or 0 if the value is falsy.
     *
     * @param {any} value - The value to be displayed.
     * @returns {number} - The provided value or 0 if the value is falsy.
     */
    displayCount(_, self) {
      return this.statusData.find(data => data.input === self.uciSection.gpio)?.count || 0
    },
    /**
     * Clears the database entries.
     *
     * This method shows a prompt to the user asking if they want to clear the database entries.
     * If the user confirms, it sends a POST request to the server to clear the database.
     * If the request is successful, a success message is displayed.
     * If the request fails, an error message is displayed.
     */
    clearPrompt() {
      this.$prompt.show({
        title: this.$t('Clear database entries?'),
        content: this.$t('This process cannot be undone.'),
        okText: this.$t('Clear'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.$axios
            .post(`/api/impulse_counter/actions/clear_database`)
            .then(() => {
              this.$message.success(this.$t('Database cleared successfully'))
            })
            .catch(() => {
              this.$message.error(this.$t('Failed to clear database'))
            })
        }
      })
    },
    /**
     * Updates the status of the ImpulseCounter component.
     * Makes a bulk request to retrieve the status data and I/O data from the API.
     * If successful, updates the component's status and input count values.
     * If unsuccessful, displays an error message.
     * If an unexpected error occurs, displays a generic error message.
     *
     * @returns {Promise} A promise that resolves when the status update is complete.
     */
    updateStatus() {
      return this.$axios
        .bulkGet(['/api/impulse_counter/status', '/api/io/status'])
        .then(([service, io]) => {
          if (service.success) {
            this.status = service.data
          } else {
            this.$message.error(this.$t('Failed to load status data'))
          }
          if (io.success) {
            if (this.ioList.length === 0) {
              this.mapIoList(io.data)
            }
            if (!this.formData?.input) return
            this.statusData = this.formData.input.map(input => {
              const ioData = io.data.find(data => data.id === input.gpio)
              return {
                input: input.gpio,
                count: ioData?.count || 0
              }
            })
          } else {
            this.$message.error(this.$t('Failed to load I/O data'))
          }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    /**
     * Returns the form options for the ImpulseCounter component.
     *
     * @returns {Object} The form options object.
     */
    getFormOptions() {
      return {
        gpio: this.gpioListValue,
        edge: this.edgeOptions,
        displayValues: this.displayValues
      }
    },
    /**
     * Maps the input data to the `ioList` property.
     * Filters the pins based on their type and direction.
     * Returns an array of objects with `key` and `value` properties.
     *
     * @param {Array} data - The input data to be mapped.
     */
    mapIoList(data) {
      const ioList = this.$io.getFilteredPinsInfo(data || [])
      this.displayValues = ioList.map(io => ({ key: io.id, value: io.name_with_pins }))
      this.ioList = ioList
        .filter(input => input.type === 'gpio' && (input.direction === 'in' || !input.direction) && input.counter_support !== '0')
        .map(input => ({ key: input.id, value: this.displayValues.find(io => io.key === input.id)?.value }))
    },
    /**
     * Returns the display value for a given GPIO key.
     * If the key is found in the `ioList`, the corresponding value is returned.
     * Otherwise, the original key is returned.
     *
     * @param {string} value - The GPIO key to display.
     * @returns {string} - The display value for the GPIO key.
     */
    displayGpio(value) {
      return this.displayValues.find(io => io.key === value)?.value || value
    },
    /**
     * Returns the display value for the given edge value.
     * If a matching option is found in the `edgeOptions` array, the corresponding display value is returned.
     * If no matching option is found, the original value is returned.
     *
     * @param {string} value - The edge value to be displayed.
     * @returns {string} - The display value for the given edge value.
     */
    displayEdge(value) {
      return this.edgeOptions.find(option => option[0] === value)?.[1] || value
    }
  }
}
</script>
