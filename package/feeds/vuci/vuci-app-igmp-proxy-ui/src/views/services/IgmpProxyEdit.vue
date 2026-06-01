<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="igmpproxy"
    :before-save="onBeforeSave"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      data-key="igmpproxy"
      :name="section.id"
      :title="$t('Routing interface')"
      :endpoints="[{ endpoint: 'igmp_proxy/routes/config' }]"
    >
      <vuci-form-item-select
        ref="direction"
        :uci-section="s"
        name="direction"
        :label="$t('Direction')"
        :help="directionHint"
        :options="[
          ['upstream', $t('Upstream')],
          ['downstream', $t('Downstream')]
        ]"
        rawhtml
      />
      <vuci-form-item-select
        :uci-section="s"
        name="network"
        :label="$t('Interface')"
        :help="$t('The name of the interface the settings are for.')"
        :options="interfaceOpts"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="zone"
        :label="$t('Firewall zone')"
        :help="$t('Name of a firewall zone this interface belongs to.')"
        :options="zoneOpts"
      />
      <vuci-form-item-list
        :uci-section="s"
        name="altnet"
        :label="$t('Networks')"
        :help="
          $t(`A list of CIDR-masked Network entries \
          to control what subnets are allowed to have their \
          multicast data proxied. Multiple subnets can be \
          configured or 0.0.0.0/0 specified to allow any \
          network. Option can be omitted entirely to only \
          allow same network as configured on interface.`)
        "
        rules="subnet4"
        placeholder="0.0.0.0/0"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  inject: ['formOptions'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      directionHint: this.$t(
        `%sUpstream%s - The upstream network interface is the outgoing
        interface which is responsible for communicating to available multicast
        data sources. There can only be one upstream interface. %s
        %sDownstream%s - Downstream network interfaces are the distribution
        interfaces to the destination networks, where multicast clients can
        join groups and receive multicast data. One or more downstream interfaces
        must be configured.`
      ).format('<b>', '</b>', '<br>', '<b>', '</b>')
    }
  },
  computed: {
    interfaceOpts() {
      return this.formOptions().interfaces
    },
    zoneOpts() {
      return this.formOptions().zones
    }
  },
  methods: {
    onBeforeSave() {
      return new Promise((resolve, reject) => {
        if (this.section.direction !== 'upstream') return resolve()
        const upstreamExists = this.formData.igmpproxy.some(o => o.id !== this.section.id && o.direction === 'upstream')
        if (upstreamExists) {
          reject(this.$t('Only a single instance with upstream direction can be saved.'))
        }
        resolve()
      })
    }
  }
}
</script>
