<template>
  <tlt-overview-card
    v-bind="$props"
    :status-path="widget.statusPath"
    :services-path="widget.servicesPath"
  >
    <template #header>
      <slot
        name="header"
        :widget="widget"
      >
        {{ widget.title }}
      </slot>
    </template>
    <div class="content-container">
      <div
        v-if="widget.content && widget.content.length === 0"
        class="pt-2"
      >
        {{ widget.noContent || $t('This card does not contain any content yet') }}
      </div>
      <template v-else>
        <tlt-overview-card-item
          v-for="(info, index) in widget.content"
          :key="index"
          :test-id="info.name"
        >
          <tlt-hint
            v-if="!!info.titleHint"
            :hints="info.titleHint"
          >
            {{ info.title }}
          </tlt-hint>
          <template v-else>
            {{ info.title }}
          </template>
          <template #content>
            <slot
              name="content"
              :info="info"
            >
              <div
                v-if="info.style"
                :class="info.style"
              >
                {{ info.info }}
              </div>
              <template v-else>
                {{ info.info }}
              </template>
            </slot>
          </template>
        </tlt-overview-card-item>
      </template>
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
