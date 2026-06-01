<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="mosquitto"
    editing
    :before-save="onBeforeSave"
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :title="$utils.getModalTitle($t('instance'), section.topic)"
      :endpoints="[{ endpoint: `mqtt/bridge/${section.id}/topics/config` }]"
      :data-key="father"
      :uci-data="uciData"
    >
      <vuci-form-item-input
        :uci-section="s"
        name="topic"
        :label="$t('Topic name')"
        rules="string"
        maxlength="64"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        name="direction"
        :label="$t('Direction')"
        initial="out"
        :help="$t('The direction that the messages will be shared in.')"
        :options="directionOpts"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="qos"
        :label="$t('QoS')"
        initial="0"
        :help="$t('The publish/subscribe QoS level used for this topic.')"
        :options="qosOpts"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  props: {
    section: {
      type: Object,
      required: true
    },
    father: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      directionOpts: [
        ['out', this.$t('OUT')],
        ['in', this.$t('IN')],
        ['both', this.$t('BOTH')]
      ],
      qosOpts: [
        ['0', this.$t('At most once (0)')],
        ['1', this.$t('At least once (1)')],
        ['2', this.$t('Exactly once (2)')]
      ]
    }
  },
  methods: {
    onBeforeSave() {
      return new Promise((resolve, reject) => {
        const isInvalid = this.formData[this.father].some(topic => topic.topic === this.section.topic && this.section.id !== topic.id)
        if (isInvalid) return reject(this.$t('Configuration with name %s already exists').format(this.section.topic))
        resolve()
      })
    }
  }
}
</script>
