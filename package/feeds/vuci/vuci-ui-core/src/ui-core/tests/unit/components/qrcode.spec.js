import { escapeMecard } from '@/components/QrCode.vue'

describe('QrCode.ts', () => {
  it.each`
    text                | escapedString
    ${'myPassword'}     | ${'myPassword'}
    ${'myPassword:;,"'} | ${'myPassword\\:\\;\\,\\"'}
  `('return $escapedString when string: $text', ({ text, escapedString }) => {
    expect(escapeMecard(text)).toEqual(escapedString)
  })
})
