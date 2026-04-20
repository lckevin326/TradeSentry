type SafeFetchJsonOptions<T> = {
  fallback: T
  fetcher?: typeof fetch
}

export async function safeFetchJson<T>(
  input: string | URL | Request,
  options: SafeFetchJsonOptions<T>,
): Promise<T> {
  const fetcher = options.fetcher ?? fetch

  try {
    const response = await fetcher(input)
    const text = await response.text()

    if (!text.trim()) {
      return options.fallback
    }

    return JSON.parse(text) as T
  } catch {
    return options.fallback
  }
}
