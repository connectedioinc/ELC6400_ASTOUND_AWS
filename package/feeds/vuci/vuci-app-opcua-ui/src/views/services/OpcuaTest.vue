<template>
  <tlt-button
    type="text"
    button-id="test"
    :readonly="isRunning || readonly"
    @click="test(uciSection)"
    >{{ $t('Test') }}</tlt-button
  >
</template>

<script>
import * as opcuaUtils from './opcuaUtils'

export default {
  props: {
    getData: {
      type: Function,
      required: true
    },
    endpoint: {
      type: String,
      required: true
    },
    uciSection: {
      type: Object,
      required: true
    },
    readonly: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      isRunning: false
    }
  },
  methods: {
    async test(s) {
      const data = this.getData(s)
      this.isRunning = true
      return this.$axios
        .post(this.endpoint, { data })
        .then(({ data }) => {
          this.$message.success(this.$t('Test is successful'))
        })
        .catch(e => {
          const errorData = e.response.data.errors[0]
          this.$message.error(opcuaUtils.translateErrorCode(errorData.code))
        })
        .finally(() => {
          this.isRunning = false
        })
    }
  }
}
</script>
