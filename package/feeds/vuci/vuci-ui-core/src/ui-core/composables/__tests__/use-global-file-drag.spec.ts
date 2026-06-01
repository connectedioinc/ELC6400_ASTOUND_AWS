import { describe, it, expect, vi } from 'vitest'
import { effectScope } from 'vue'
import { useGlobalFileDrag } from '../use-global-file-drag'

describe('useGlobalFileDrag', () => {
  it('should only once add the dragenter, dragover, dragleave, and drop listeners', () => {
    const addListenerSpy = vi.spyOn(document.body, 'addEventListener')

    const reactiveScope = effectScope()
    reactiveScope.run(() => {
      const { isDraggingFiles } = useGlobalFileDrag()

      expect(isDraggingFiles.value).toBeFalsy()
      // dragenter, dragover, dragleave, drop
      expect(addListenerSpy).toHaveBeenCalledTimes(4)
      // consequent calls should not add more listeners
      useGlobalFileDrag()
      useGlobalFileDrag()
      useGlobalFileDrag()
      expect(addListenerSpy).toHaveBeenCalledTimes(4)
    })
    reactiveScope.stop()
  })
  it('should remove event listeners when all requested scopes are destroyed', () => {
    const removeListenerSpy = vi.spyOn(document.body, 'removeEventListener')
    const scope = effectScope()
    const scope2 = effectScope()
    scope.run(() => {
      const { isDraggingFiles } = useGlobalFileDrag()
      expect(isDraggingFiles.value).toBeFalsy()
    })
    scope2.run(() => {
      const { isDraggingFiles } = useGlobalFileDrag()
      expect(isDraggingFiles.value).toBeFalsy()
    })
    scope.stop()
    expect(removeListenerSpy).toHaveBeenCalledTimes(0)
    scope2.stop()
    expect(removeListenerSpy).toHaveBeenCalledTimes(4)
  })
})
