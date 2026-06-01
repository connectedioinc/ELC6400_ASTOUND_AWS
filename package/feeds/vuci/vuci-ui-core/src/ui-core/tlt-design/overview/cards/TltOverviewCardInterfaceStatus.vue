<template>
  <tlt-overview-card
    :status-path="widget.statusPath"
    :services-path="widget.servicesPath"
    v-bind="{ ...$props, ...$attrs }"
  >
    <template #header>
      {{ widget.title }}
    </template>
    <tlt-overview-card-item
      v-for="widgetItem in widget.content"
      :key="widgetItem.title"
      :test-id="widgetItem.name"
    >
      {{ widgetItem.title }}
      <template #content>
        <ip-details
          v-if="widgetItem.ipDetails"
          :config="{}"
          :status="widget.status"
          :display="widgetItem.ipDetails"
        />
        <template v-else>{{ widgetItem.info }}</template>
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
