<template>
  <tlt-overview-card
    :status-path="widget.statusPath"
    :services-path="widget.servicesPath"
    v-bind="$props"
  >
    <template #header>
      {{ widget.title }}
    </template>
    <tlt-overview-card-item :test-id="widget.content[0].name">
      {{ widget.content[0].title }}
      <template #content>
        {{ widget.content[0].status }}
      </template>
    </tlt-overview-card-item>
    <tlt-overview-card-item
      v-if="widget.content[1].show"
      :test-id="widget.content[1].name"
    >
      {{ widget.content[1].title }}
      <template #content>
        <div class="flex">
          <div :class="widget.content[1].connectionStateColor">
            {{ widget.content[1].connectionStateText }}
          </div>
          <!-- eslint-disable -->
          <div
            v-if="widget.content[1].error"
            v-html="$xss(widget.content[1].error)"
          />
          <!-- eslint-enable -->
        </div>
      </template>
    </tlt-overview-card-item>
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
