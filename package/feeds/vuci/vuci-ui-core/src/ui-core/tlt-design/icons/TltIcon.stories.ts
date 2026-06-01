import type { Meta, StoryObj } from '@storybook/vue3-vite'

import TltIcon, { type Props } from './TltIcon.vue'

type TltIconProps = Props & {
  size: number
  color: string
}

const meta: Meta<TltIconProps> = {
  component: TltIcon,
  render: args => ({
    components: { TltIcon },
    setup() {
      return { args }
    },
    template: `
      <TltIcon
        v-bind="args"
        :style="{
          height: args.size + 'px',
          width: args.size + 'px',
          color: args.color
        }"
      />
    `
  }),
  args: {
    icon: 'success',
    size: 20,
    color: '#000000'
  },
  argTypes: { icon: { table: { disable: true } } }
}

export default meta

export const Icon: StoryObj<TltIconProps> = {
  argTypes: { icon: { table: { disable: false } } }
}

export const Info: StoryObj<TltIconProps & { solid?: boolean }> = {
  args: { icon: 'info', solid: false }
}

export const Error: StoryObj<TltIconProps & { solid?: boolean }> = {
  args: { icon: 'error', solid: false }
}

export const Password: StoryObj<TltIconProps & { hide?: boolean }> = {
  args: { icon: 'password', hide: false }
}

import type { Props as IconPortProps } from './IconPort.vue'
import { portIconColors } from '@/plugins/ports'
export const Port: StoryObj<TltIconProps & IconPortProps> = {
  args: { icon: 'port', type: 'eth', pins: false, color: 'fill-theme-bg-primary-1' },
  argTypes: {
    type: { control: 'select', options: ['eth', 'sfp'] },
    color: { control: { type: 'select', labels: Object.fromEntries(Object.entries(portIconColors).map(a => a.reverse())) }, options: Object.values(portIconColors) }
  }
}

export const Signal: StoryObj<TltIconProps & { strength: number }> = {
  args: { icon: 'signal' },
  argTypes: {
    strength: { control: { type: 'range', min: -1, max: 4, step: 1 } }
  }
}

export const SignalWifi: StoryObj<TltIconProps & { strength: number }> = {
  args: { icon: 'signal-wifi' },
  argTypes: {
    strength: { control: { type: 'range', min: -1, max: 4, step: 1 } }
  }
}

export const SortDirection: StoryObj<TltIconProps & { direction: 'asc' | 'desc' | 'both' | 0 | 1 | -1; activeColor?: string }> = {
  args: { icon: 'sort-direction' },
  argTypes: {
    activeColor: { control: { type: 'color' } },
    direction: { control: { type: 'select' }, options: ['asc', 'desc', 'both', 0, 1, -1] }
  }
}

export const Spinner: StoryObj<TltIconProps & { animate?: boolean }> = {
  args: { icon: 'spinner', animate: true },
  argTypes: {
    animate: { control: 'boolean' }
  }
}

// export const AddCircle: Story = { args: { icon: 'add-circle' } }
// export const AddSquare: Story = { args: { icon: 'add-square' } }
// export const Aggregated: Story = { args: { icon: 'aggregated' } }
// export const ArrowDown: Story = { args: { icon: 'arrow-down' } }
// export const ArrowUp: Story = { args: { icon: 'arrow-up' } }
// export const Authorized: Story = { args: { icon: 'authorized' } }
// export const Bell: Story = { args: { icon: 'bell' } }
// export const Bluetooth: Story = { args: { icon: 'bluetooth' } }
// export const Chevron: Story = { args: { icon: 'chevron' } }
// export const ChevronDouble: Story = { args: { icon: 'chevron-double' } }
// export const Circle: Story = { args: { icon: 'circle' } }
// export const Cloud: Story = { args: { icon: 'cloud' } }
// export const Code: Story = { args: { icon: 'code' } }
// export const Columns: Story = { args: { icon: 'columns' } }
// export const Cookie: Story = { args: { icon: 'cookie' } }
// export const Copy: Story = { args: { icon: 'copy' } }
// export const Device: Story = { args: { icon: 'device' } }
// export const Dice: Story = { args: { icon: 'dice' } }
// export const Download: Story = { args: { icon: 'download' } }
// export const DownloadPm: Story = { args: { icon: 'download-pm' } }
// export const DragAnywhere: Story = { args: { icon: 'drag-anywhere' } }
// export const DropdownArrow: Story = { args: { icon: 'dropdown-arrow' } }
// export const Edit: Story = { args: { icon: 'edit' } }
// export const Empty: Story = { args: { icon: 'empty' } }
// export const ExternalLink: Story = { args: { icon: 'external-link' } }
// export const FileFail: Story = { args: { icon: 'file-fail' } }
// export const Files: Story = { args: { icon: 'files' } }
// export const Filter: Story = { args: { icon: 'filter' } }
// export const Gear: Story = { args: { icon: 'gear' } }
// export const Interface: Story = { args: { icon: 'interface' } }
// export const Lan: Story = { args: { icon: 'lan' } }
// export const Lock: Story = { args: { icon: 'lock' } }
// export const Mail: Story = { args: { icon: 'mail' } }
// export const Mobile: Story = { args: { icon: 'mobile' } }
// export const MobileSetup: Story = { args: { icon: 'mobile-setup' } }
// export const More: Story = { args: { icon: 'more' } }
// export const Pause: Story = { args: { icon: 'pause' } }
// export const Play: Story = { args: { icon: 'play' } }
// export const Poe: Story = { args: { icon: 'poe' } }
// export const QrCode: Story = { args: { icon: 'qr-code' } }
// export const Refresh: Story = { args: { icon: 'refresh' } }
// export const RemoveCircle: Story = { args: { icon: 'remove-circle' } }
// export const Rms: Story = { args: { icon: 'rms' } }
// export const Search: Story = { args: { icon: 'search' } }
// export const Server: Story = { args: { icon: 'server' } }
// export const Sim: Story = { args: { icon: 'sim' } }
// export const SimSolid: Story = { args: { icon: 'sim-solid' } }
// export const Status: Story = { args: { icon: 'status' } }
// export const StatusCircle: Story = { args: { icon: 'status-circle' } }
// export const Success: Story = { args: { icon: 'success' } }
// export const Thumb: Story = { args: { icon: 'thumb' } }
// export const Time: Story = { args: { icon: 'time' } }
// export const Tooltip: Story = { args: { icon: 'tooltip' } }
// export const Unauthorized: Story = { args: { icon: 'unauthorized' } }
// export const Unlock: Story = { args: { icon: 'unlock' } }
// export const Upgrade: Story = { args: { icon: 'upgrade' } }
// export const Upload: Story = { args: { icon: 'upload' } }
// export const UploadPm: Story = { args: { icon: 'upload-pm' } }
// export const UsbEject: Story = { args: { icon: 'usb-eject' } }
// export const User: Story = { args: { icon: 'user' } }
// export const Validation: Story = { args: { icon: 'validation' } }
// export const Wan: Story = { args: { icon: 'wan' } }
// export const Warning: Story = { args: { icon: 'warning' } }
// export const Wifi: Story = { args: { icon: 'wifi' } }
// export const Wired: Story = { args: { icon: 'wired' } }
// export const X: Story = { args: { icon: 'x' } }
// export const XCircle: Story = { args: { icon: 'x-circle' } }
