import createWrapper from '@tests/unit/mockFactory'
import PhoneGroups from '../../src/views/system/PhoneGroups.vue'
import PhoneGroupsEdit from '../../src/views/system/PhoneGroupEdit.vue'

const groupsData = [{ name: 'test1' }]
const validationSuccess = { isValid: true }
const phoneValidationFailute = {
  isValid: false,
  message: "Phone group name 'test1' already exists"
}

describe('PhoneGroup.vue', () => {
  it('returns titleExtension with SMS/Call value', async () => {
    const wrapper = createWrapper(PhoneGroups)
    wrapper.vm.$mobile.loadModems = vi.fn()
    wrapper.vm.$mobile.loadModems.mockResolvedValueOnce([])
    wrapper.vm.modems = [{ version: 'test2' }, { version: 'test1' }]
    expect(wrapper.vm.titleExtension).toBe('SMS/Call')
  })
  it('returns titleExtension with SMS value', async () => {
    const wrapper = createWrapper(PhoneGroups)
    wrapper.vm.$mobile.loadModems = vi.fn()
    wrapper.vm.$mobile.loadModems.mockResolvedValueOnce([{ version: 'EC25AFFD' }, { version: 'EC25AFFD' }])
    await wrapper.vm.loadData()
    expect(wrapper.vm.titleExtension).toBe('SMS')
  })
  it.each`
    expectedIsValid | givenGroup    | expectedValidationStatus  | givenValue | testText
    ${true}         | ${groupsData} | ${validationSuccess}      | ${'test2'} | ${'does not exist'}
    ${false}        | ${groupsData} | ${phoneValidationFailute} | ${'test1'} | ${'exists'}
  `('returns isValid $expectedIsValid when instance $testText', ({ givenGroup, expectedValidationStatus, givenValue }) => {
    const wrapper = createWrapper(PhoneGroups)
    wrapper.vm.formData.groups = givenGroup
    const resVal = wrapper.vm.instanceExists(givenValue)
    expect(resVal).toEqual(expectedValidationStatus)
  })
  it('displays error message when API call fails', async () => {
    const wrapper = createWrapper(PhoneGroups)
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.get = vi.fn().mockRejectedValueOnce({})
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('Failed to load modem data')
  })
})

const successPropSection = { tel: ['+00000', '+666666'] }
const failurePropSection = { tel: ['+00000', '+666666', '+00000'] }
const expectedFailureRes = {
  isValid: false,
  message: "Value '+00000' already exists"
}

describe('PhoneGroupEdit.vue', () => {
  it.each`
    expectedIsValid | expectedMessage     | formSection           | givenValue   | expectedResult
    ${true}         | ${'does not exist'} | ${successPropSection} | ${'+370666'} | ${validationSuccess}
    ${false}        | ${'exists'}         | ${failurePropSection} | ${'+00000'}  | ${expectedFailureRes}
  `('returns isValid $expectedIsValid when number $expectedMessage', ({ formSection, givenValue, expectedResult }) => {
    const wrapper = createWrapper(PhoneGroupsEdit, { props: { section: formSection } })
    const eRes = wrapper.vm.numberExists(givenValue)
    expect(eRes).toEqual(expectedResult)
  })
  it('should call success message after phone number file uploaded', async () => {
    const wrapper = createWrapper(PhoneGroupsEdit, { props: { section: { tel: ['+00000', '+666666'] } } })
    wrapper.vm.formData = { groups: [{ id: 'test', tel: ['+00000', '+666666'] }] }
    const successSpy = vi.spyOn(wrapper.vm.$message, 'success')
    await wrapper.vm.onUpload({ res: { success: true, data: { id: 'test', tel: ['+11111', '+22222'] } } })
    expect(successSpy).toHaveBeenCalledWith(wrapper.vm.$t('File uploaded successfully'))
  })
})
