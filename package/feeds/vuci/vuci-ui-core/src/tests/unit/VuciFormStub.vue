<template>
  <div>
    <slot
      :uci-data="uciData"
      :editable-section="editableData"
    />
  </div>
</template>

<script>
export default {
  data() {
    return {
      editableData: {},
      uciData: {}
    }
  }
}
</script>
