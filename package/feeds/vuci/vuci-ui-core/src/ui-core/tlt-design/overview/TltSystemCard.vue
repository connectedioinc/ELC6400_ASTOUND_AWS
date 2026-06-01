<template>
  <div class="grid md:grid-cols-fill-96 grid-cols-fill-52 gap-6">
    <template v-for="card in cards">
      <tlt-overview-card-type
        v-for="content in card"
        :key="content.title"
        :widget="content"
        :item="content"
        clickable-label
        :disabled="false"
      />
    </template>
  </div>
</template>
<script>
export default {
  props: {
    cards: {
      type: Object,
      default: () => {}
    }
  }
}
</script>
