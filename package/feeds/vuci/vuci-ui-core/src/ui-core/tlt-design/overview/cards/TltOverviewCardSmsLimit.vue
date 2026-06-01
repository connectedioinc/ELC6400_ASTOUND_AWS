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
      v-if="widget.content[1]"
      :test-id="widget.content[1].name"
    >
      {{ widget.content[1].title }}
      <template #content>
        {{ widget.content[1].info }}
      </template>
    </tlt-overview-card-item>
    <tlt-overview-card-item
      v-if="widget.content[2].info"
      :test-id="widget.content[2].name"
    >
      {{ widget.content[2].title }}
      <template #content>
        <tlt-hint>
          <template
            v-if="widget.content[2].overLimit"
            #hintBox
          >
            <span>
              {{ $t('SMS limit was reached before SMS limit was changed, it will reset after period ends. To change SMS limit click') }}
              <router-link :to="widget.servicesPath.to"> {{ $t('here') }} </router-link>.
            </span>
          </template>
          {{ widget.content[2].info }}
        </tlt-hint>
      </template>
    </tlt-overview-card-item>
    <tlt-overview-card-item
      v-if="widget.content[3]"
      :test-id="widget.content[3].name"
    >
      {{ widget.content[3].title }}
      <template #content>
        {{ widget.content[3].info }}
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
