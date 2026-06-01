import { useTranslate } from '@ui-core/composables/useI18n'

export const useMessageValidation = () => {
  const $t = useTranslate()

  const maxSmsCount = 8

  function validateSms(message: string) {
    const { charsLeft } = analyzeSmsMessage(message)
    return {
      isValid: charsLeft >= 0,
      message: $t('A message must fit in %d SMS messages.').format(maxSmsCount)
    }
  }

  function getSmsCharacters(message: string) {
    const { smsUsed, charsLeft } = analyzeSmsMessage(message)
    return $t('SMS %d (%d characters left)').format(smsUsed, charsLeft)
  }

  const gsm7Map: { [key: string]: number } = {
    '@': 1,
    Δ: 1,
    ' ': 1,
    0: 1,
    '¡': 1,
    P: 1,
    '¿': 1,
    p: 1,
    '£': 1,
    _: 1,
    '!': 1,
    1: 1,
    A: 1,
    Q: 1,
    a: 1,
    q: 1,
    $: 1,
    Φ: 1,
    '"': 1,
    2: 1,
    B: 1,
    R: 1,
    b: 1,
    r: 1,
    '¥': 1,
    Γ: 1,
    '#': 1,
    3: 1,
    C: 1,
    S: 1,
    c: 1,
    s: 1,
    è: 1,
    Λ: 1,
    '¤': 1,
    4: 1,
    D: 1,
    T: 1,
    d: 1,
    t: 1,
    é: 1,
    Ω: 1,
    '%': 1,
    5: 1,
    E: 1,
    U: 1,
    e: 1,
    u: 1,
    ù: 1,
    Π: 1,
    '&': 1,
    6: 1,
    F: 1,
    V: 1,
    f: 1,
    v: 1,
    ì: 1,
    Ψ: 1,
    "'": 1,
    7: 1,
    G: 1,
    W: 1,
    g: 1,
    w: 1,
    ò: 1,
    Σ: 1,
    '(': 1,
    8: 1,
    H: 1,
    X: 1,
    h: 1,
    x: 1,
    Ç: 1,
    Θ: 1,
    ')': 1,
    9: 1,
    I: 1,
    Y: 1,
    i: 1,
    y: 1,
    '\n': 1,
    Ξ: 1,
    '*': 1,
    ':': 1,
    J: 1,
    Z: 1,
    j: 1,
    z: 1,
    Ø: 1,
    '\u001B': 1,
    '+': 1,
    ';': 1,
    K: 1,
    Ä: 1,
    k: 1,
    ä: 1,
    ø: 1,
    Æ: 1,
    ',': 1,
    '<': 1,
    L: 1,
    Ö: 1,
    l: 1,
    ö: 1,
    '\r': 1,
    æ: 1,
    '-': 1,
    '=': 1,
    M: 1,
    Ñ: 1,
    m: 1,
    ñ: 1,
    Å: 1,
    ß: 1,
    '.': 1,
    '>': 1,
    N: 1,
    Ü: 1,
    n: 1,
    ü: 1,
    å: 1,
    É: 1,
    '/': 1,
    '?': 1,
    O: 1,
    '§': 1,
    o: 1,
    à: 1,
    '|': 2,
    '^': 2,
    '€': 2,
    '{': 2,
    '}': 2,
    '[': 2,
    '~': 2,
    ']': 2,
    '\\': 2
  }
  const maxMultiUni = 134
  const maxSinUni = 140
  const maxMultiGsm = 153
  const maxSinGsm = 160
  const byteLengthUtf16 = (str: string) => str.length * 2

  function analyzeSmsMessage(text: string) {
    const charArr = [...text]

    let uniSingle = true
    let uniCur = 0
    let uniUsed = 1
    let uniRez = 0
    let uniMax = maxSinUni

    let gsmSingle = true
    let gsmCur = 0
    let gsmUsed = 1
    let gsmRez = 0
    let gsmMax = maxSinGsm

    const useUni = charArr.some(chr => !gsm7Map[chr])
    for (let i = 0; i < charArr.length; i++) {
      const chr = charArr[i]
      const uniClen = byteLengthUtf16(chr)
      const gsmClen = gsm7Map[chr]

      if (!useUni) {
        // GSM 7-bit encoding logic
        if (gsmSingle && gsmClen + gsmCur > maxMultiGsm && gsmClen + gsmCur <= maxSinGsm && gsmUsed < maxSmsCount) {
          // Still fits into single single-part, but not in single multi-part
          gsmRez += gsmClen
          gsmCur += gsmClen
        } else if (gsmSingle && gsmClen + gsmCur > maxSinGsm && gsmUsed < maxSmsCount) {
          // Does not fit in into single single-part anymore, switching to multi-part
          gsmCur = gsmRez + gsmClen
          gsmRez = 0
          gsmUsed += 1
          gsmMax = maxMultiGsm
          gsmSingle = false
        } else if (!gsmSingle && gsmClen + gsmCur > maxMultiGsm && gsmUsed < maxSmsCount) {
          // Does not fit in into current multi-part anymore
          gsmCur = gsmClen
          gsmUsed += 1
        } else {
          gsmCur += gsmClen
        }
      }

      // Unicode (UCS-2) encoding logic
      if (uniSingle && uniClen + uniCur > maxMultiUni && uniClen + uniCur <= maxSinUni && uniUsed < maxSmsCount) {
        // Still fits into single single-part, but not in single multi-part
        uniRez += uniClen
        uniCur += uniClen
      } else if (uniSingle && uniClen + uniCur > maxSinUni && uniUsed < maxSmsCount) {
        // Does not fit in into single single-part anymore, switching to multi-part
        uniCur = uniRez + uniClen
        uniRez = 0
        uniUsed += 1
        uniMax = maxMultiUni
        uniSingle = false
      } else if (!uniSingle && uniClen + uniCur > maxMultiUni && uniUsed < maxSmsCount) {
        // Does not fit in into current multi-part anymore
        uniCur = uniClen
        uniUsed += 1
      } else {
        uniCur += uniClen
      }
    }
    if (useUni) {
      return {
        smsUsed: uniUsed,
        charsLeft: uniMax / 2 - uniCur / 2
      }
    } else {
      return { smsUsed: gsmUsed, charsLeft: gsmMax - gsmCur }
    }
  }

  return {
    validateSms,
    getSmsCharacters,
    analyzeSmsMessage
  }
}
