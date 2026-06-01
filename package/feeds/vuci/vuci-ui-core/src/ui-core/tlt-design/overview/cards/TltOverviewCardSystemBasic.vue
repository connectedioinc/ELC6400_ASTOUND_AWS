<template>
  <tlt-overview-card
    v-bind="$props"
    :status-path="widget.statusPath"
    :services-path="widget.servicesPath"
  >
    <template #header>
      <tlt-hint :hints="widget.help">
        {{ widget.title }}
      </tlt-hint>
    </template>
    <div class="content-container">
      <tlt-overview-card-item
        v-for="(info, index) in widget.content"
        :key="index"
      >
        <tlt-hint :hints="info.help">
          {{ info.title }}
        </tlt-hint>
        <template #content>
          {{ info.info }}
        </template>
      </tlt-overview-card-item>
    </div>
  </tlt-overview-card>
</template>

<script>
export default {
  props: {
    widget: {
      type: Object,
      default: () => ({})
    }
  }
}
</script>

<style scoped></style>
