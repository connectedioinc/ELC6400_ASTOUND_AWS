function loadScript() {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/gh/openlayers/openlayers.github.io@4eccf2cf93856a69c7c982df04ae8b91b43aac52/en/v6.4.3/build/ol.js'
    script.integrity = 'sha384-RffttofZaGGmE3uVvQmIW/dh1bzuHAJtWkxFyjRkb7eaUWfHo3W3GV8dcET2xTPI'
    script.crossOrigin = 'anonymous'
    script.setAttribute('data-allow-fail', 'true')
    script.onload = () => resolve()
    script.onerror = () => reject()
    document.body.appendChild(script)
  })
}

function loadStyles() {
  return new Promise<void>((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdn.jsdelivr.net/gh/openlayers/openlayers.github.io@4eccf2cf93856a69c7c982df04ae8b91b43aac52/en/v6.4.3/css/ol.css'
    link.onload = () => resolve()
    link.onerror = () => reject()
    document.head.appendChild(link)
  })
}

export const map = {
  loadPromise: null as Promise<void> | null,

  load() {
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = Promise.all([loadScript(), loadStyles()])
      .then(() => {})
      .catch(() => {
        console.error('Failed to load OpenLayers modules')
      })

    return this.loadPromise
  },

  isAvailable() {
    return typeof ol !== 'undefined'
  }
}
