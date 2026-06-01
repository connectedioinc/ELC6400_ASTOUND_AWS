<template>
  <tlt-modal
    :open="open"
    size="medium"
    :hide-navigation="true"
    :title="$t('Licenses')"
    @close="$emit('close')"
  >
    <p>
      {{ $brand('companyFull') }} products incorporate open source software under various licenses, including GPL, LGPL, Apache, MIT, and more. We ensure full compliance with the open source
      community's licensing requirements.<br /><br />Access detailed licensing information and source code for a comprehensive overview of the licenses used and to download the source code for our
      products (<a
        :href="$brand('licenseUrl')"
        target="_blank"
        >here</a
      >). <br /><br />For questions or further information, reach out to us at <a :href="'mailto:' + $brand('companyEmail')">{{ $brand('companyEmail') }}</a> .
    </p>
  </tlt-modal>
</template>
<script>
export default {
  props: {
    open: {
      type: Boolean,
      required: true
    }
  },
  emits: ['close']
}
</script>
