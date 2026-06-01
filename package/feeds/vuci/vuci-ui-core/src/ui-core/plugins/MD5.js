export const ChilliMD5 = {}
const hexcase = 0 /* hex output format. 0 - lowercase 1 - uppercase        */
const chrsz = 8 /* bits per input character. 8 - ASCII 16 - Unicode      */

ChilliMD5.hex_md5 = function (s) {
  return binl2hex(coreMd5(str2binl(s), s.length * chrsz))
}

ChilliMD5.chap = function (hexIdent, strPassword, hexChal, uamSecret) {
  if (uamSecret) {
    const chal = this.fromHex(hexChal)
    hexChal = this.hex_md5(chal + uamSecret)
  }

  //  Convert everything to hex encoded strings
  const hexPassword = str2hex(strPassword)

  // concatenate hex encoded strings
  const hex = hexIdent + hexPassword + hexChal

  // Convert concatenated hex encoded string to its binary representation
  const bin = hex2binl(hex)

  // Calculate MD5 on binary representation
  const md5 = coreMd5(bin, hex.length * 4)

  return binl2hex(md5)
}

ChilliMD5.toHex = function (s) {
  let result = ''
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i).toString('16')
    result += char.length === 1 ? '0' + char : char
  }

  return result
}

ChilliMD5.fromHex = function (s) {
  let result = ''
  for (let i = 0; i < s.length; i += 2) {
    const num = Number('0x' + s[i] + s[i + 1])
    result += String.fromCharCode(num)
  }
  return result
}

ChilliMD5.pap = function (challenge, password, uamSecret) {
  challenge = this.fromHex(challenge)
  if (uamSecret) {
    challenge = this.fromHex(this.hex_md5(challenge + uamSecret))
  }

  // --If challenge isn't long enough, repeat it until it is
  while (challenge.length < password.length) {
    challenge += challenge
  }

  let result = ''
  let index = 0
  while (index < password.length) {
    result += String.fromCharCode(password.charCodeAt(index) ^ challenge.charCodeAt(index))
    index++
  }
  return this.toHex(result)
}

function coreMd5(x, len) {
  x[len >> 5] |= 0x80 << len % 32
  x[(((len + 64) >>> 9) << 4) + 14] = len

  let a = 1732584193
  let b = -271733879
  let c = -1732584194
  let d = 271733878

  for (let i = 0; i < x.length; i += 16) {
    const olda = a
    const oldb = b
    const oldc = c
    const oldd = d

    a = md5Ff(a, b, c, d, x[i + 0], 7, -680876936)
    d = md5Ff(d, a, b, c, x[i + 1], 12, -389564586)
    c = md5Ff(c, d, a, b, x[i + 2], 17, 606105819)
    b = md5Ff(b, c, d, a, x[i + 3], 22, -1044525330)
    a = md5Ff(a, b, c, d, x[i + 4], 7, -176418897)
    d = md5Ff(d, a, b, c, x[i + 5], 12, 1200080426)
    c = md5Ff(c, d, a, b, x[i + 6], 17, -1473231341)
    b = md5Ff(b, c, d, a, x[i + 7], 22, -45705983)
    a = md5Ff(a, b, c, d, x[i + 8], 7, 1770035416)
    d = md5Ff(d, a, b, c, x[i + 9], 12, -1958414417)
    c = md5Ff(c, d, a, b, x[i + 10], 17, -42063)
    b = md5Ff(b, c, d, a, x[i + 11], 22, -1990404162)
    a = md5Ff(a, b, c, d, x[i + 12], 7, 1804603682)
    d = md5Ff(d, a, b, c, x[i + 13], 12, -40341101)
    c = md5Ff(c, d, a, b, x[i + 14], 17, -1502002290)
    b = md5Ff(b, c, d, a, x[i + 15], 22, 1236535329)

    a = md5Gg(a, b, c, d, x[i + 1], 5, -165796510)
    d = md5Gg(d, a, b, c, x[i + 6], 9, -1069501632)
    c = md5Gg(c, d, a, b, x[i + 11], 14, 643717713)
    b = md5Gg(b, c, d, a, x[i + 0], 20, -373897302)
    a = md5Gg(a, b, c, d, x[i + 5], 5, -701558691)
    d = md5Gg(d, a, b, c, x[i + 10], 9, 38016083)
    c = md5Gg(c, d, a, b, x[i + 15], 14, -660478335)
    b = md5Gg(b, c, d, a, x[i + 4], 20, -405537848)
    a = md5Gg(a, b, c, d, x[i + 9], 5, 568446438)
    d = md5Gg(d, a, b, c, x[i + 14], 9, -1019803690)
    c = md5Gg(c, d, a, b, x[i + 3], 14, -187363961)
    b = md5Gg(b, c, d, a, x[i + 8], 20, 1163531501)
    a = md5Gg(a, b, c, d, x[i + 13], 5, -1444681467)
    d = md5Gg(d, a, b, c, x[i + 2], 9, -51403784)
    c = md5Gg(c, d, a, b, x[i + 7], 14, 1735328473)
    b = md5Gg(b, c, d, a, x[i + 12], 20, -1926607734)
    a = md5Hh(a, b, c, d, x[i + 5], 4, -378558)
    d = md5Hh(d, a, b, c, x[i + 8], 11, -2022574463)
    c = md5Hh(c, d, a, b, x[i + 11], 16, 1839030562)
    b = md5Hh(b, c, d, a, x[i + 14], 23, -35309556)
    a = md5Hh(a, b, c, d, x[i + 1], 4, -1530992060)
    d = md5Hh(d, a, b, c, x[i + 4], 11, 1272893353)
    c = md5Hh(c, d, a, b, x[i + 7], 16, -155497632)
    b = md5Hh(b, c, d, a, x[i + 10], 23, -1094730640)
    a = md5Hh(a, b, c, d, x[i + 13], 4, 681279174)
    d = md5Hh(d, a, b, c, x[i + 0], 11, -358537222)
    c = md5Hh(c, d, a, b, x[i + 3], 16, -722521979)
    b = md5Hh(b, c, d, a, x[i + 6], 23, 76029189)
    a = md5Hh(a, b, c, d, x[i + 9], 4, -640364487)
    d = md5Hh(d, a, b, c, x[i + 12], 11, -421815835)
    c = md5Hh(c, d, a, b, x[i + 15], 16, 530742520)
    b = md5Hh(b, c, d, a, x[i + 2], 23, -995338651)

    a = md5Ii(a, b, c, d, x[i + 0], 6, -198630844)
    d = md5Ii(d, a, b, c, x[i + 7], 10, 1126891415)
    c = md5Ii(c, d, a, b, x[i + 14], 15, -1416354905)
    b = md5Ii(b, c, d, a, x[i + 5], 21, -57434055)
    a = md5Ii(a, b, c, d, x[i + 12], 6, 1700485571)
    d = md5Ii(d, a, b, c, x[i + 3], 10, -1894986606)
    c = md5Ii(c, d, a, b, x[i + 10], 15, -1051523)
    b = md5Ii(b, c, d, a, x[i + 1], 21, -2054922799)
    a = md5Ii(a, b, c, d, x[i + 8], 6, 1873313359)
    d = md5Ii(d, a, b, c, x[i + 15], 10, -30611744)
    c = md5Ii(c, d, a, b, x[i + 6], 15, -1560198380)
    b = md5Ii(b, c, d, a, x[i + 13], 21, 1309151649)
    a = md5Ii(a, b, c, d, x[i + 4], 6, -145523070)
    d = md5Ii(d, a, b, c, x[i + 11], 10, -1120210379)
    c = md5Ii(c, d, a, b, x[i + 2], 15, 718787259)
    b = md5Ii(b, c, d, a, x[i + 9], 21, -343485551)

    a = safeAdd(a, olda)
    b = safeAdd(b, oldb)
    c = safeAdd(c, oldc)
    d = safeAdd(d, oldd)
  }
  return [a, b, c, d]
}
function md5Cmn(q, a, b, x, s, t) {
  return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b)
}

function md5Ff(a, b, c, d, x, s, t) {
  return md5Cmn((b & c) | (~b & d), a, b, x, s, t)
}

function md5Gg(a, b, c, d, x, s, t) {
  return md5Cmn((b & d) | (c & ~d), a, b, x, s, t)
}

function md5Hh(a, b, c, d, x, s, t) {
  return md5Cmn(b ^ c ^ d, a, b, x, s, t)
}

function md5Ii(a, b, c, d, x, s, t) {
  return md5Cmn(c ^ (b | ~d), a, b, x, s, t)
}

function safeAdd(x, y) {
  const lsw = (x & 0xffff) + (y & 0xffff)
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16)
  return (msw << 16) | (lsw & 0xffff)
}
function bitRol(num, cnt) {
  return (num << cnt) | (num >>> (32 - cnt))
}

function str2binl(str) {
  const bin = []
  const mask = (1 << chrsz) - 1
  for (let i = 0; i < str.length * chrsz; i += chrsz) {
    bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << i % 32
  }
  return bin
}

function binl2hex(binarray) {
  const hexTab = hexcase ? '0123456789ABCDEF' : '0123456789abcdef'
  let str = ''
  for (let i = 0; i < binarray.length * 4; i++) {
    str += hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0xf) + hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0xf)
  }
  return str
}

function str2hex(str) {
  const hexTab = hexcase ? '0123456789ABCDEF' : '0123456789abcdef'
  let hex = ''
  let val
  for (let i = 0; i < str.length; i++) {
    val = str.charCodeAt(i)
    hex = hex + hexTab.charAt(val / 16)
    hex = hex + hexTab.charAt(val % 16)
  }
  return hex
}

function hex2binl(hex) {
  /*  Clean-up hex encoded input string */
  hex = hex.toLowerCase()
  hex = hex.replace(/ /g, '')

  const bin = []

  /* Transfrom to array of integers (binary representation) */
  for (let i = 0; i < hex.length * 4; i = i + 8) {
    const octet = parseInt(hex.substr(i / 4, 2), 16)
    bin[i >> 5] |= (octet & 255) << i % 32
  }
  return bin
}
export default {
  install(app) {
    app.config.globalProperties.$MD5 = ChilliMD5
  }
}
