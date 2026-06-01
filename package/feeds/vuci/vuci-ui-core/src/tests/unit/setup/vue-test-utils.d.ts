import { DOMWrapper } from '@vue/test-utils'

declare module '@vue/test-utils' {
  interface VueWrapper {
    findByTestId(testId: string): DOMWrapper<Element>
    findAllByTestId(testId: string): DOMWrapper<Element>[]
    getByTestId(testId: string): DOMWrapper<Element>
  }
}
