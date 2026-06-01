<template>
  <div>
    <tlt-breadcrumbs
      :crumbs="crumbs"
      class="mb-10"
    ></tlt-breadcrumbs>
    <tlt-breadcrumbs
      :crumbs="crumbs"
      class="pointer-events-none"
    ></tlt-breadcrumbs>
  </div>
</template>

<script>
import TltBreadcrumbs from '@/components/VuciLayout/src/TltBreadcrumbs.vue'

export default {
  components: { TltBreadcrumbs },
  data() {
    return {
      crumbs: [
        {
          name: 'Location 1',
          path: '/__dev/TltIcon'
        },
        {
          name: 'Location 2',
          path: '/__dev/tltAlert'
        },
        {
          name: 'Location 3',
          path: '/__dev/TltButton'
        },
        {
          name: 'Location to path 4',
          path: '/__dev/TltToast'
        },
        {
          name: 'Location to path 5',
          path: '/__dev/abc'
        },
        {
          name: 'Location to path 6',
          path: '/__dev/bbc'
        },
        {
          name: 'Location to path 7',
          path: '/__dev/zzzz'
        }
      ]
    }
  }
}
</script>
