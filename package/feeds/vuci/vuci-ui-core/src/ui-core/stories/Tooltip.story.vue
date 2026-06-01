<template>
  <div class="relative w-full h-full">
    <div class="font-semibold text-lg my-4">Tooltips</div>
    <div class="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] px-6 py-8">
      <div
        v-for="location in locations"
        :key="location"
      >
        <button
          :id="location"
          class="px-4 py-1.5 hover:bg-theme-bg-secondary-subtle-hover rounded-md bg-theme-bg-secondary-3"
        >
          tooltip {{ location }}
        </button>
        <tlt-tooltip
          :target="`#${location}`"
          :placement="location"
          >Use the shortcut
          <span class="py-0.5 px-2 inline-block rounded-md font-normal bg-theme-bg-secondary/10">/</span>
          to start searching</tlt-tooltip
        >
      </div>
    </div>
  </div>
</template>

<script>
import TltTooltip from '@ui-core/components/tooltip/TltTooltip.vue'
export default {
  components: { TltTooltip },
  data() {
    return {
      locations: ['bottom', 'left', 'right', 'top']
    }
  }
}
</script>
