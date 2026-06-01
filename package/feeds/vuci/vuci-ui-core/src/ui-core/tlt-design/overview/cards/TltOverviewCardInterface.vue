<template>
  <tlt-overview-card
    v-bind="$props"
    :status-path="widget.statusPath"
    :services-path="widget.servicesPath"
  >
    <template #header>
      {{ widget.title }}
    </template>
    <tlt-overview-card-item :test-id="widget.content[0].name">
      {{ widget.content[0].title }}
      <template #content>
        {{ widget.content[0].info }}
      </template>
    </tlt-overview-card-item>
    <tlt-overview-card-item
      v-if="widget.config.proto !== 'none'"
      :test-id="widget.content[1].name"
    >
      {{ widget.content[1].title }}
      <template #content>
        <ip-details
          :config="widget.config"
          :status="widget.status"
          :show-ip-type="widget.status.area_type === 'wan'"
        />
      </template>
    </tlt-overview-card-item>
    <tlt-overview-card-item
      v-if="widget.content[2]"
      :test-id="widget.content[2].name"
    >
      {{ widget.content[2].title }}
      <template #content>
        <div
          v-if="widget.apnRow"
          style="overflow: hidden; text-overflow: ellipsis"
        >
          {{ widget.content[2].info }}
        </div>
        <template v-else>
          {{ widget.content[2].info }}
        </template>
      </template>
    </tlt-overview-card-item>
    <tlt-overview-card-item
      v-for="extraWidget in widget.content.filter((_, idx) => idx > 2)"
      :key="extraWidget.title"
      :test-id="extraWidget.name"
    >
      {{ extraWidget.title }}
      <template #content>
        {{ extraWidget.info }}
      </template>
    </tlt-overview-card-item>
  </tlt-overview-card>
</template>

<script>
import IpDetails from '@/components/shared/IpDetails.vue'
export default {
  components: { IpDetails },
  props: {
    widget: {
      type: Object,
      default: () => ({})
    }
  }
}
</script>

<style scoped></style>
