import fuzzysort from 'fuzzysort'

export type SearchOptions<T = unknown> = Fuzzysort.KeysOptions<T>
export type SearchResult<T = unknown> = Fuzzysort.KeysResult<T>

const defaultSearchOptions: Partial<SearchOptions> = {
  threshold: 0.5
}

export function searchAll<T>(targets: T[], query: string, options: SearchOptions<T>) {
  return fuzzysort.go(query, targets, { ...defaultSearchOptions, ...options })
}

export function highlight(text: string, query: string, open: string = '<mark>', close: string = '</mark>') {
  if (!query.trim()) return escapeHTML(text)

  const words = query.split(/\s+/).filter(Boolean)
  if (words.length === 0) return escapeHTML(text)

  const highlightMap = new Array(text.length).fill(false)

  for (const word of words) {
    const result = fuzzysort.single(word, text)
    if (!result || !result.indexes) continue

    for (const idx of result.indexes) {
      highlightMap[idx] = true
    }
  }

  let highlighted = ''
  let i = 0
  while (i < text.length) {
    if (highlightMap[i]) {
      highlighted += open + escapeHTML(text[i]) + close
      i++
    } else {
      const start = i
      while (i < text.length && !highlightMap[i]) i++
      highlighted += escapeHTML(text.slice(start, i))
    }
  }

  return highlighted
}

/**
 * Escapes HTML characters &, < and >
 * @param input - String containing HTML that needs to be escaped
 */
export function escapeHTML(input: string) {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
