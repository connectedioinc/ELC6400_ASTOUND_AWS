<template>
  <section>
    <tlt-tabs :tabs="tabs">
      <template
        v-for="tab in tabs"
        #[tab.tab]
        >{{ tab.title }} content here</template
      >
    </tlt-tabs>
    <tlt-tabs
      class="mt-40"
      :tabs="tabs"
      inner
    >
      <template
        v-for="tab in tabs"
        #[tab.tab]
        >{{ tab.title }} content here</template
      >
    </tlt-tabs>
  </section>
</template>

<script>
export default {
  data() {
    return {
      /**
       * @type {import('@ui-core/tlt-design/layout/TltTabs.vue').TltTab[]}
       */
      tabs: [
        { tab: 'first', title: 'General' },
        { tab: 'second', title: 'Users' },
        { tab: 'sixt', title: 'A' },
        { tab: 'fifth', title: 'Users D' },
        { tab: 'sevent', title: 'Users Daaaaaa' }
        // { tab: 'sixth', title: 'sixth' },
        // { tab: 'seventh', title: 'seventh' },
        // { tab: 'eighth', title: 'eighth' }
      ]
    }
  }
}
</script>

<style scoped></style>
