import { useTranslate } from '@ui-core/composables/useI18n'
import { useMainStore } from '@/stores/main'
import { isArray, isFunction } from '@ui-core/utils/inspect.ts'
import { useIoPinData } from './useIoPinData'
import { pinColors } from './ioConstants'
import type { Io } from '@/types/ioTypes'

export type PinoutBlockType = '16pin' | '10pin' | 'm12_4pin' | '5pin' | '4pin' | '2pin'

export type IoPinoutBlock = {
  image: string
  style: string
  title: string
  pinMap: Record<string, string>
  pinColors?: Record<string, string>
}

export type IoPinoutBlockVariant = IoPinoutBlock & {
  additionalCondition: boolean | ((ioData?: Io[]) => boolean)
}

export type IoPinoutBlocks = {
  [K in PinoutBlockType]?: IoPinoutBlockVariant[] | IoPinoutBlock
}

export const useIoPinoutBlocks = () => {
  const $t = useTranslate()
  const store = useMainStore()

  const { ioPinData } = useIoPinData()

  const serialExists = store.board?.serial?.filter((serial: { path: string }) => serial.path).length > 0
  const isRUTM55 = store.device.startsWith('RUTM55')

  // pinColors can be overridden in specific block definitions, otherwise they are generated based on ioPinData
  const ioPinoutBlocks: IoPinoutBlocks = {
    '16pin': [
      {
        additionalCondition: serialExists && isRUTM55,
        image: '/icons/io_16pin_rs_rutm.svg',
        style: 'max-w-75',
        title: $t('Input/Output pinout'),
        pinMap: {
          1: $t('Digital input (only for passive sensors)'),
          2: $t('Digital galvanically isolated input (0-4 VDC: low logic level / 9-30 VDC: high logic level)'),
          3: $t('Galvanically isolated open collector output (External 0-30 VDC, 0.25A)'),
          4: $t('OC output (External VCC 0-30 VDC)'),
          5: $t('Relay output (COM) (External 0-24 VDC or 0-40 VAC, 4A)'),
          6: 'GND',
          7: 'RS232 (TX)',
          8: 'RS232 (RX)',
          9: 'GND',
          10: $t('%s (digital isolated input)').format('GND'),
          11: $t('%s (OC output)').format('GND'),
          12: $t('Analog input'),
          13: $t('Relay output (NO)'),
          14: 'GND',
          15: 'RS485 (A)',
          16: 'RS485 (B)'
        },
        pinColors: {
          6: pinColors.black,
          7: pinColors.orange,
          8: pinColors.orange,
          9: pinColors.black,
          14: pinColors.black,
          15: pinColors.orange,
          16: pinColors.orange
        }
      },
      {
        additionalCondition: serialExists,
        image: '/icons/io_16pin_rs.svg',
        style: 'max-w-75',
        title: $t('Input/Output pinout'),
        pinMap: {
          1: $t('Power'),
          2: $t('Configurable Input/Output'),
          3: $t('Configurable Input/Output'),
          4: $t('Configurable Input/Output'),
          5: 'RS232 (CTS)',
          6: 'RS232 (RTS)',
          7: 'RS485 (R+)',
          8: 'RS485 (D+)',
          9: $t('Ground'),
          10: $t('Ground'),
          11: $t('Analog Input'),
          12: $t('Ground'),
          13: 'RS232 (TX)',
          14: 'RS232 (RX)',
          15: 'RS485 (R-)',
          16: 'RS485 (D-)'
        },
        pinColors: {
          1: pinColors.red,
          5: pinColors['light-green'],
          6: pinColors['light-green'],
          7: pinColors.orange,
          8: pinColors.orange,
          9: pinColors.black,
          10: pinColors.black,
          12: pinColors.black,
          13: pinColors['light-green'],
          14: pinColors['light-green'],
          15: pinColors.orange,
          16: pinColors.orange
        }
      },
      {
        additionalCondition: true,
        image: '/icons/io_16pin.svg',
        style: 'max-w-75',
        title: $t('Input/Output pinout'),
        pinMap: {
          1: $t('Passive/Active input (Dry/Wet)'),
          2: $t('Passive/Active input (Dry/Wet)'),
          3: $t('Relay (Normally closed)'),
          4: $t('Relay (Common)'),
          5: $t('Relay (Normally open)'),
          6: $t('Ground'),
          7: 'ADC (4-20mA)',
          8: $t('Isolated input'),
          9: $t('Power'),
          10: $t('Ground'),
          11: $t('Latching Relay (Normally closed)'),
          12: $t('Latching Relay (Common)'),
          13: $t('Latching Relay (Normally open)'),
          14: '3.8 V',
          15: $t('One Wire'),
          16: $t('Isolated ground')
        },
        pinColors: {
          6: pinColors.black,
          9: pinColors.red,
          10: pinColors.black,
          14: pinColors.red,
          15: pinColors.purple
        }
      }
    ],
    '10pin': {
      image: '/icons/io_10pin.svg',
      style: 'max-w-50',
      title: $t('Input/Output pinout'),
      pinMap: {
        1: $t('Digital input (only for passive sensors)'),
        2: $t('Digital galvanically isolated input (0-4 VDC: low logic level / 9-30 VDC: high logic level)'),
        3: $t('Galvanically isolated open collector output (External 0-30 VDC, 0.25A)'),
        4: $t('OC output (External VCC 0-30 VDC)'),
        5: $t('Relay output (COM) (External 0-24 VDC or 0-40 VAC, 4A)'),
        6: $t('%s (digital & analog input)').format('GND'),
        7: $t('%s (digital isolated input)').format('GND'),
        8: $t('%s (OC output)').format('GND'),
        9: $t('Analog input (0-24 VDC, 20 mA)'),
        10: $t('Relay output (NO)')
      }
    },
    '2pin': {
      image: '/icons/relay_2pin.svg',
      style: 'max-w-62',
      title: $t('Relay pinout'),
      pinMap: {
        1: $t('Relay output (COM) (External 0-24 VDC or 0-40 VAC, 4A)'),
        2: $t('Relay output (NO)')
      }
    }
  }

  const powerPinoutBlocks: IoPinoutBlocks = {
    m12_4pin: {
      image: '/icons/m12_4pin_power.svg',
      style: 'max-w-38 max-w-38',
      title: $t('Power socket pinout'),
      pinMap: {
        1: $t('Power (+9-48 VDC)'),
        2: $t('Ground'),
        3: $t('Ignition'),
        4: $t('Low battery')
      },
      pinColors: { 1: pinColors.red, 2: pinColors.black }
    },
    '5pin': {
      image: '/icons/power_5pin.svg',
      style: 'max-w-62',
      title: $t('Power socket pinout'),
      pinMap: {
        1: $t('Power Input 1 — DC/AC 50/60Hz (9-75 VDC or 16-52 VAC)'),
        2: $t('Power Input 1 — DC/AC 50/60Hz (9-75 VDC or 16-52 VAC)'),
        3: $t('Chassis Ground'),
        4: $t('Power Input 2 — DC/AC 50/60Hz (9-75 VDC or 16-52 VAC)'),
        5: $t('Power Input 2 — DC/AC 50/60Hz (9-75 VDC or 16-52 VAC)')
      },
      pinColors: {
        2: pinColors.black,
        3: pinColors.green,
        5: pinColors.black
      }
    },
    '4pin': [
      {
        additionalCondition: ioData => !!ioData?.find((io: Io) => io.bi_dir === '1'),
        image: '/icons/power_4pin.svg',
        style: 'max-w-38',
        title: $t('Power socket pinout'),
        pinMap: {
          1: $t('Power'),
          2: $t('Ground'),
          3: $t('Configurable Input/Output'),
          4: $t('Configurable Input/Output')
        },
        pinColors: { 1: pinColors.red, 2: pinColors.black }
      },
      {
        additionalCondition: true,
        image: '/icons/power_4pin.svg',
        style: 'max-w-38',
        title: $t('Power socket pinout'),
        pinMap: {
          1: $t('Power'),
          2: $t('Ground'),
          3: $t('Input (4 PIN connector) (0-6 VDC: low logic level / 8-<Power supply VDC>: high logic level)'),
          4: $t('Output (4 PIN connector) (30 VDC, 0.3A)')
        },
        pinColors: { 1: pinColors.red, 2: pinColors.black }
      }
    ]
  }

  function getPinoutBlockByType(type: PinoutBlockType, pinoutBlocks: IoPinoutBlocks, ioData?: Io[]) {
    const selectedBlock = pinoutBlocks[type]
    if (!isArray(selectedBlock)) return selectedBlock

    return selectedBlock.find((block: IoPinoutBlockVariant) => {
      if (isFunction(block.additionalCondition)) return block.additionalCondition(ioData)
      return !!block.additionalCondition
    })
  }

  function getPinoutBlock(type: PinoutBlockType, pinoutBlocks: IoPinoutBlocks, ioData: Io[]) {
    const block = getPinoutBlockByType(type, pinoutBlocks, ioData)
    if (!block) return undefined
    return getPinoutColors(block, ioData)
  }

  const getIoPinoutBlock = (type: PinoutBlockType, ioData: Io[]) => getPinoutBlock(type, ioPinoutBlocks, ioData)

  const getPowerPinoutBlock = (type: PinoutBlockType, ioData: Io[]) => getPinoutBlock(type, powerPinoutBlocks, ioData)

  function getPinoutColors(pinoutBlock: IoPinoutBlock, ioData: Io[]) {
    const fullPinoutBlock = { ...pinoutBlock }
    fullPinoutBlock.pinColors = Object.keys(pinoutBlock.pinMap).reduce(
      (acc, pin) => {
        acc[pin] = pinoutBlock.pinColors?.[pin] || getPinColor(pin, ioData)
        return acc
      },
      {} as Record<string, string>
    )
    return fullPinoutBlock
  }

  function getPinColor(pin: string, ioData: Io[]) {
    const ioSection = ioData.find((io: Io) => io.block_pins.includes(Number(pin)))
    if (!ioSection) return 'default'
    return ioPinData[ioSection.id as keyof typeof ioPinData]?.color || 'default'
  }

  return {
    ioPinoutBlocks,
    powerPinoutBlocks,
    getPinoutBlockByType,
    getIoPinoutBlock,
    getPowerPinoutBlock
  }
}
