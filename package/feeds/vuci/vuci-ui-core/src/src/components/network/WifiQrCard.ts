import { utils } from '@/plugins/utils'
import type { WifiInterface } from '@/types/wirelessTypes'

// Seperate qr code card download
export function useCard(networkText: string, passwordText: string) {
  function download(content: WifiInterface, showCredentials: boolean) {
    const qrCode = document.getElementById('qrCode') as HTMLCanvasElement
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const margin = 10
    canvas.height = qrCode.width + margin * 2
    canvas.width = showCredentials ? canvas.height + 190 : canvas.height
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(qrCode, margin, margin, qrCode.height, qrCode.width)
    if (showCredentials) {
      const textX = qrCode.width + margin * 3
      _drawTextBlock(ctx, textX, content)
    }
    utils.downloadFromDataURL(canvas.toDataURL(), 'QR_Code.png')
  }
  function _drawTextBlock(ctx: CanvasRenderingContext2D, x: number, content: WifiInterface) {
    const textElement = document.getElementById('wifi-text') as HTMLElement
    ctx.fillStyle = _getCss(textElement, 'color')
    const headerElement = textElement.querySelector('.text-header') as HTMLElement
    const contentElement = textElement.querySelector('.text-content') as HTMLElement
    const headerFont = _getCss(headerElement, 'font')
    const contentFont = _getCss(contentElement, 'font')
    const maxWidth = parseInt(_getCss(contentElement, 'max-width'))

    const lineHeight = headerElement.clientHeight
    let currentY = (ctx.canvas.height - textElement.offsetHeight) / 2
    currentY += lineHeight

    // Draw ssid
    currentY += _drawTextNoSplit(ctx, networkText, x, currentY, headerFont, lineHeight)
    currentY += _drawTextSplit(ctx, content.ssid, x, currentY, contentFont, lineHeight, maxWidth)

    // Draw password
    if (!content.key) return
    currentY += parseInt(_getCss(textElement, 'gap'))
    currentY += _drawTextNoSplit(ctx, passwordText, x, currentY, headerFont, lineHeight)
    _drawTextSplit(ctx, content.key, x, currentY, contentFont, lineHeight, maxWidth)
  }
  function _drawTextNoSplit(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, lineHeight: number) {
    ctx.font = font
    ctx.fillText(text, x, y)
    return lineHeight
  }
  function _drawTextSplit(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, lineHeight: number, maxWidth: number) {
    let currentHeight = 0
    _splitLines(ctx, text, maxWidth).forEach(split => {
      currentHeight += _drawTextNoSplit(ctx, split, x, y + currentHeight, font, lineHeight)
    })
    return currentHeight
  }
  function _splitLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
    return text.split('').reduce(
      (textSplits, currentLetter) => {
        const newSplit = textSplits[textSplits.length - 1] + currentLetter
        if (ctx.measureText(newSplit).width <= maxWidth) {
          textSplits[textSplits.length - 1] = newSplit
        } else {
          textSplits.push(currentLetter)
        }
        return textSplits
      },
      ['']
    )
  }
  function _getCss(element: Element, property: string) {
    return window.getComputedStyle(element, null).getPropertyValue(property)
  }

  return {
    networkText,
    passwordText,
    download
  }
}
