import { filterFiles, mapToSelectOption, getCertificateWarning, normalizeFileName, showTPM2Warning } from '@/plugins/certificates'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { useMessages } from '@/stores/messages'

describe('certificates utils', () => {
  const mockCertificates = [
    { id: 1, type: 'client', fullname: 'client-cert-1' },
    { id: 2, type: 'server', fullname: 'server-cert-1' },
    { id: 3, type: 'client', fullname: 'client-cert-2' },
    { fullname: 'rsa-weak.cert', encryption: 'rsa', key_size: '1024' },
    { fullname: 'rsa-strong.cert', encryption: 'rsa', key_size: '2048' },
    { fullname: 'ecc-weak.cert', encryption: 'ecc', key_size: '128' },
    { fullname: 'ecc-strong.cert', encryption: 'ecc', key_size: '256' },
    { fullname: 'other-weak.cert', encryption: 'des', key_size: '1024' },
    { fullname: 'other-strong.cert', encryption: 'des', key_size: '2048' }
  ]
  beforeEach(() => {
    setActivePinia(createTestingPinia())
  })

  it.each`
    filter      | expectedCount
    ${'client'} | ${2}
    ${'server'} | ${1}
    ${'ca'}     | ${0}
  `('filterFiles returns $expectedCount items for "$filter" type', ({ filter, expectedCount }) => {
    const result = filterFiles(mockCertificates, filter)
    expect(result).toHaveLength(expectedCount)
  })

  it('filterFiles adds sequential key indices', () => {
    const result = filterFiles(mockCertificates, 'client')
    expect(result[0].key).toBe(0)
    expect(result[1].key).toBe(1)
  })

  it('mapToSelectOption converts certificate to SelectOption', () => {
    const cert = { fullname: 'test-cert' }
    const result = mapToSelectOption(cert)
    expect(result).toEqual({
      key: 'test-cert',
      value: 'test-cert'
    })
  })
  it.each`
    path                            | certificates        | expectedResult
    ${null}                         | ${mockCertificates} | ${undefined}
    ${''}                           | ${mockCertificates} | ${undefined}
    ${'/path/to/cert.pem'}          | ${[]}               | ${undefined}
    ${'/path/to/unknown.cert'}      | ${mockCertificates} | ${undefined}
    ${'/path/to/rsa-strong.cert'}   | ${mockCertificates} | ${undefined}
    ${'/path/to/ecc-strong.cert'}   | ${mockCertificates} | ${undefined}
    ${'/path/to/other-strong.cert'} | ${mockCertificates} | ${undefined}
  `('getCertificateWarning returns undefined for $path', ({ path, certificates, expectedResult }) => {
    expect(getCertificateWarning(path, certificates)).toBe(expectedResult)
  })
  it.each`
    path                          | expectedMessage
    ${'/path/to/rsa-weak.cert'}   | ${'minimum RSA key length of 2048 bits'}
    ${'/path/to/ecc-weak.cert'}   | ${'minimum ECC key length of 256 bits'}
    ${'/path/to/other-weak.cert'} | ${'minimum key length of 2048 bits'}
  `('getCertificateWarning returns warning for $path', ({ path, expectedMessage }) => {
    const result = getCertificateWarning(path, mockCertificates)
    expect(result).toContain(expectedMessage)
  })
  it.each`
    filePath                                                 | expected
    ${'/path/to/dh-file.txt'}                                | ${'dh-file.txt'}
    ${'/path/to/normal-file.txt'}                            | ${'normal-file.txt'}
    ${'simple-file.pem'}                                     | ${'simple-file.pem'}
    ${'cbid.openvpn.inst1.keyclient1.key'}                   | ${'client1.key'}
    ${'cbid.openvpn.inst1.keyclient1.key (306 Bytes)'}       | ${'client1.key (306 Bytes)'}
    ${'cbid.openvpn.inst1.caca.cert.pem'}                    | ${'ca.cert.pem'}
    ${'cbid.openvpn.inst1.key1.key.pem'}                     | ${'1.key.pem'}
    ${'cbid.test.test.certserver.pem'}                       | ${'server.pem'}
    ${'cbid.test.test.caroot.crt'}                           | ${'root.crt'}
    ${'cbid.test.test.leftcertclient.crt'}                   | ${'client.crt'}
    ${'cbid.test.test.cacertauthority.pem'}                  | ${'authority.pem'}
    ${'cbid.test.test.CAfilemain.crt'}                       | ${'main.crt'}
    ${'cbid.test.test.ca_filelocal.pem'}                     | ${'local.pem'}
    ${'cbid.test.test.user_certjohn.crt'}                    | ${'john.crt'}
    ${'cbid.test.test.ca_certroot.pem'}                      | ${'root.pem'}
    ${'cbid.test.test.user_keyjane.key'}                     | ${'jane.key'}
    ${'cbid.test.test.client_certmobile.crt'}                | ${'mobile.crt'}
    ${'cbid.chilli.1.sslcertfilesslcafile.pem'}              | ${'sslcafile.pem'}
    ${'cbid.test.test.sslcafileauthority.crt'}               | ${'authority.crt'}
    ${'cbid.test.test.private_keyuser.key'}                  | ${'user.key'}
    ${'cbid.test.test.sslkeyfilessl.key'}                    | ${'ssl.key'}
    ${'cbid.test.test.publickeyfilepublic.pub'}              | ${'public.pub'}
    ${'cbid.test.test.privatekeyfileprivate.key'}            | ${'private.key'}
    ${'cbid.test.test.server_tls_certificateapi.crt'}        | ${'api.crt'}
    ${'cbid.test.test.unknownprefix.txt'}                    | ${'unknownprefix.txt'}
    ${'invalid-cbid-format.txt'}                             | ${'invalid-cbid-format.txt'}
    ${'cbid.short'}                                          | ${'cbid.short'}
    ${'cbid.openvpn.inst1_nb4d4g.cert192.168.1.99.cert.pem'} | ${'192.168.1.99.cert.pem'}
    ${'cbid.openvpn.inst1_nb4d4g.key192.168.1.99.key.pem'}   | ${'192.168.1.99.key.pem'}
    ${'cbid.openvpn.inst2_4qhphd.cert44.test.cert.pem'}      | ${'44.test.cert.pem'}
  `('normalizeFileName transforms $filePath to $expected', ({ filePath, expected }) => {
    expect(normalizeFileName(filePath)).toBe(expected)
  })

  it.each`
    useTpm | hasExportFeature | expectedTitle                         | expectedMessage
    ${'1'} | ${true}          | ${'Configuration Export Limitations'} | ${'Keys stored in TPM2 are excluded from exported configurations and from backup files. As a result, the exported configuration will be incomplete and cannot be restored on other devices. When importing the configuration on the same device, TPM2 keys must be manually reselected.'}
    ${'1'} | ${false}         | ${'TPM2 Storage Limitations'}         | ${'Keys stored in TPM2 are excluded from device backup files. When restoring a backup, TPM2-stored keys must be manually re-uploaded and reconfigured.'}
  `('showTPM2Warning shows info notification when useTpm=$useTpm and hasExportFeature=$hasExportFeature', ({ useTpm, hasExportFeature, expectedTitle, expectedMessage }) => {
    const notification = useMessages()
    const messagesSpy = vi.spyOn(notification, 'info')
    showTPM2Warning(useTpm, hasExportFeature)
    expect(messagesSpy).toHaveBeenCalledWith({
      title: expectedTitle,
      text: expectedMessage
    })
  })
  it.each`
    useTpm | hasExportFeature
    ${'0'} | ${true}
    ${'0'} | ${false}
    ${''}  | ${true}
    ${''}  | ${false}
  `('showTPM2Warning removes notification when useTpm=$useTpm and hasExportFeature=$hasExportFeature', ({ useTpm, hasExportFeature }) => {
    const notification = useMessages()
    const messagesSpy = vi.spyOn(notification, 'info')
    showTPM2Warning(useTpm, hasExportFeature)
    expect(messagesSpy).not.toHaveBeenCalled()
  })
})
