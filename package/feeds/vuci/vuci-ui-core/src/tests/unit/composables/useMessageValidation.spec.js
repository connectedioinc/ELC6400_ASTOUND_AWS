import { useMessageValidation } from '@/composables/useMessageValidation'

describe('useMessageValidation', () => {
  it.each([
    {
      desc: 'GSM 7-bit message which fits in one message (single-part)',
      input: 'abc123/?!@[]',
      expected: { charsLeft: 146, smsUsed: 1 }
    },
    {
      desc: 'GSM 7-bit message which does not fit in one message (multi-part)',
      input: 'abc123/?!@[]'.repeat(12),
      expected: { charsLeft: 137, smsUsed: 2 }
    },
    {
      desc: 'GSM 7-bit message which does not fit in few multi-part messages',
      input: 'abc123/?!@[]'.repeat(30),
      expected: { charsLeft: 37, smsUsed: 3 }
    },
    {
      desc: 'Unicode message which fits in one message (single-part)',
      input: 'abc123🖥',
      expected: { charsLeft: 62, smsUsed: 1 }
    },
    {
      desc: 'Unicode message which does not fit in one message (multi-part)',
      input: 'abc123🖥'.repeat(10),
      expected: { charsLeft: 54, smsUsed: 2 }
    },
    {
      desc: 'Unicode message which does not fit in few multi-part messages',
      input: 'abc123🖥'.repeat(21),
      expected: { charsLeft: 33, smsUsed: 3 }
    }
  ])('should analyze $desc', ({ input, expected }) => {
    const { analyzeSmsMessage } = useMessageValidation()
    expect(analyzeSmsMessage(input)).toEqual(expected)
  })
})
