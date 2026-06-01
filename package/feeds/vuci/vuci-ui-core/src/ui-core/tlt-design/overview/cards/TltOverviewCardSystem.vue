<template>
  <tlt-overview-card
    v-bind="$props"
    :status-path="widget.statusPath"
    :services-path="widget.servicesPath"
  >
    <template #header>
      {{ widget.title }}
    </template>
    <template #header-item>
      <usage-indicator
        :label="widget.headerItem[0].title"
        :percentage="widget.headerItem[0].info"
      />
    </template>
    <tlt-overview-card-item
      v-for="(info, index) in widget.content"
      :key="index"
      :test-id="info.name"
    >
      {{ info.title }}
      <template
        v-if="index !== 2"
        #content
      >
        {{ info.info }}
      </template>
      <template
        v-else
        #content
      >
        <div class="flex gap-2">
          <usage-indicator
            :label="widget.content[2].info[0].name"
            :percentage="widget.content[2].info[0].percents"
            :test-id="widget.content[2].info[0].title"
            :used="widget.hints[0].used"
            :total="widget.hints[0].total"
            :free="widget.hints[0].free"
          />
          <usage-indicator
            :label="widget.content[2].info[1].name"
            :percentage="widget.content[2].info[1].percents"
            :test-id="widget.content[2].info[1].title"
            :used="widget.hints[1].used"
            :total="widget.hints[1].total"
            :free="widget.hints[1].free"
          />
        </div>
      </template>
    </tlt-overview-card-item>
  </tlt-overview-card>
</template>

<script>
import UsageIndicator from '@/components/UsageIndicator.vue'

export default {
  components: {
    UsageIndicator
  },
  props: {
    widget: {
      type: Object,
      default: () => ({})
    }
  }
}
</script>
