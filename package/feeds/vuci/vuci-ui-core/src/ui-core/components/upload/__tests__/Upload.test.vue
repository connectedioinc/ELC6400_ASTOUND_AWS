<template>
  <div>
    <label for="upload-test">Test label</label>
    <UploadRoot
      id="upload-test"
      v-slot="{ files }"
      multiple
    >
      <UploadDropzone class="dropzone">
        <UploadTrigger class="bg-blue-700 text-white inline-block p-2 rounded-lg"> Browse</UploadTrigger>
        or drag and drop file here
      </UploadDropzone>
      <UploadItem
        v-for="(file, index) in files"
        :key="`${file.name}-${index}`"
        class="flex gap-2 items-center"
        :file="file"
      >
        <UploadItemName />
        <UploadItemSizeText unit-system="decimal" />
        <UploadItemDeleteTrigger class="rounded-lg hover:rounded-4xl hover:bg-blue-200 bg-blue-100 p-1 transition-all duration-300" />
      </UploadItem>
    </UploadRoot>
  </div>
</template>

<script setup lang="ts">
import { UploadDropzone, UploadItem, UploadItemName, UploadItemDeleteTrigger, UploadItemSizeText, UploadRoot, UploadTrigger } from '@components/upload'
type Props = {}
const props = defineProps<Props>()
</script>

<style lang="" scoped></style>
