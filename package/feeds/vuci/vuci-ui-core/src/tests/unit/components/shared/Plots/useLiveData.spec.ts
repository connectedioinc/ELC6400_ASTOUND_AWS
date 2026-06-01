import { useLiveData } from '@/components/shared/Plots/useLiveData'
import { createComposableWrapper } from '@tests/unit/mockFactory'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'

describe('useLiveData.ts', () => {
  let wrapper: ReturnType<typeof useLiveData>
  beforeEach(() => {
    ;[wrapper] = createComposableWrapper(() => useLiveData('/api/endpoint/status', 30000))
  })
  it('returns last status record', () => {
    const lastStatus = [{ id: '1', up: true }]
    wrapper.rawLiveData.value = [
      { time: 0, value: [{ id: '1', up: false }] },
      { time: 0, value: lastStatus }
    ]
    expect(wrapper.lastLiveStatus.value).toEqual(lastStatus)
  })
  it('appends data on success', async () => {
    const existingData = [
      { time: 1000, value: { id: '1', up: false } },
      { time: 2000, value: { id: '1', up: false } }
    ]
    const newData = { id: '1', up: true }
    const currTime = 3000
    wrapper.rawLiveData.value = [...existingData]
    vi.spyOn(axios, 'get').mockResolvedValue({ success: true, data: newData })
    vi.spyOn(Date, 'now').mockReturnValue(currTime)
    await wrapper.getLiveData()
    expect(wrapper.rawLiveData.value).toEqual([...existingData, { time: currTime, value: newData }])
  })
  it('shows error on fail', async () => {
    const message = useMessages()
    vi.spyOn(axios, 'get').mockRejectedValue({ success: false })
    const spy = vi.spyOn(message, 'error')
    await wrapper.getLiveData()
    expect(spy).toBeCalled()
  })
})
