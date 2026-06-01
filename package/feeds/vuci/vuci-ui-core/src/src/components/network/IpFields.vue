<template>
  <vuci-form-item-input
    :uci-section="s"
    :label="$t('IPv4 address')"
    :help="$t('Your router\'s address on the network.')"
    name="ipaddr"
    :required="!s.ip6addr"
    rules="ip4addr"
    :depend="extraCondition"
    :no-write="wizard || (noWrite && !extraCondition)"
    :initial="initialIp"
    @change="self => self.vuciSection.validate()"
  />
  <vuci-form-item-select
    :uci-section="s"
    :label="$t('IPv4 netmask')"
    :help="$t('Netmask defines how \'large\' a network is.')"
    :options="netmasks"
    name="netmask"
    rules="netmask"
    allow-create
    required
    :depend="extraCondition"
    :no-write="noWrite && !extraCondition"
  />
</template>
<script>
export default {
  props: {
    s: {
      type: Object,
      required: true
    },
    extraCondition: {
      type: Boolean,
      default: true
    },
    wizard: {
      type: Boolean,
      default: false
    },
    noWrite: {
      type: Boolean,
      default: false
    },
    initialIp: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      netmasks: ['255.255.255.0', '255.255.0.0', '255.0.0.0']
    }
  }
}
</script>
