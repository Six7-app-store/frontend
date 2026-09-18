import { describe, it, expect } from 'vitest'

import { prettyJson, highlightJson } from '@/utils/json-display'

describe('prettyJson', () => {
  it('returns an empty string for null and undefined', () => {
    expect(prettyJson(null)).toBe('')
    expect(prettyJson(undefined)).toBe('')
  })

  it('indents objects and arrays with two spaces', () => {
    expect(prettyJson({ a: 1 })).toBe('{\n  "a": 1\n}')
    expect(prettyJson([1])).toBe('[\n  1\n]')
  })

  it('re-indents JSON-looking strings', () => {
    expect(prettyJson(' {"a":[true]} ')).toBe('{\n  "a": [\n    true\n  ]\n}')
  })

  it('keeps non-JSON strings verbatim, including broken JSON', () => {
    expect(prettyJson('Traceback: boom')).toBe('Traceback: boom')
    expect(prettyJson('{not json}')).toBe('{not json}')
    expect(prettyJson('null')).toBe('null')
  })

  it('stringifies other primitives', () => {
    expect(prettyJson(42)).toBe('42')
    expect(prettyJson(false)).toBe('false')
  })

  it('falls back to String() for unserialisable objects', () => {
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    expect(prettyJson(cyclic)).toBe('[object Object]')
  })
})

describe('highlightJson', () => {
  it('returns an empty string for empty input', () => {
    expect(highlightJson('')).toBe('')
  })

  it('wraps keys, strings, numbers, booleans and null in colour classes', () => {
    expect(highlightJson('{"k": "v", "n": -1.5, "b": true, "z": null}')).toBe(
      '{<span class="text-blue-500 font-medium">"k":</span> '
      + '<span class="text-emerald-500">"v"</span>, '
      + '<span class="text-blue-500 font-medium">"n":</span> '
      + '<span class="text-cyan-500">-1.5</span>, '
      + '<span class="text-blue-500 font-medium">"b":</span> '
      + '<span class="text-purple-500 font-bold">true</span>, '
      + '<span class="text-blue-500 font-medium">"z":</span> '
      + '<span class="text-gray-500 italic">null</span>}',
    )
  })

  it('escapes HTML before highlighting', () => {
    expect(highlightJson('"<img src=x onerror=alert(1)>"')).toBe(
      '<span class="text-emerald-500">"&lt;img src=x onerror=alert(1)&gt;"</span>',
    )
    expect(highlightJson('a & b')).toBe('a &amp; b')
  })
})
