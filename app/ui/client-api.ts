export function getCookieValue(name: string): string {
  if (typeof document === 'undefined') return ''

  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))

  return cookie ? decodeURIComponent(cookie.split('=')[1] || '') : ''
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const method = init?.method?.toUpperCase() || 'GET'
  const headers = new Headers(init?.headers)

  if (!headers.has('Content-Type') && method !== 'GET' && method !== 'HEAD') {
    headers.set('Content-Type', 'application/json')
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = getCookieValue('csrf-token')
    if (csrfToken) headers.set('x-csrf-token', csrfToken)
  }

  const res = await fetch(input, {
    ...init,
    headers,
  })

  const data = (await res.json()) as T & { error?: string }

  if (!res.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}
