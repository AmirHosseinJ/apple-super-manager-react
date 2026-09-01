import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { unwrapCollection } from './http'

const useIsMounted = () => {
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  return mounted
}

/**
 * Loads a paginated DRF collection and owns the page/search/ordering/filter
 * query state that `DataTable` drives.
 */
export const useCollection = (
  fetcher,
  { pageSize = 20, filters = {}, ordering = '', enabled = true } = {},
) => {
  const [items, setItems] = useState([])
  const [count, setCount] = useState(0)
  const [paginated, setPaginated] = useState(false)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState(ordering)
  const [reloadToken, setReloadToken] = useState(0)

  const mounted = useIsMounted()
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const filterKey = JSON.stringify(filters)

  useEffect(() => {
    setPage(1)
  }, [filterKey, search, pageSize])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return undefined
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const params = { page, page_size: pageSize }
    if (search) params.search = search
    if (sort) params.ordering = sort
    Object.entries(JSON.parse(filterKey)).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params[key] = value
    })

    fetcherRef
      .current({ params, signal: controller.signal })
      .then((payload) => {
        if (!mounted.current || controller.signal.aborted) return
        const collection = unwrapCollection(payload)
        setItems(collection.items)
        setCount(collection.count)
        setPaginated(collection.paginated)
      })
      .catch((requestError) => {
        if (!mounted.current || requestError?.name === 'AbortError') return
        setError(requestError)
        setItems([])
        setCount(0)
      })
      .finally(() => {
        if (!mounted.current || controller.signal.aborted) return
        setLoading(false)
      })

    return () => controller.abort()
  }, [enabled, page, pageSize, search, sort, filterKey, reloadToken, mounted])

  const refresh = useCallback(() => setReloadToken((token) => token + 1), [])

  // When the API is unpaginated the whole list arrives at once; slice locally so
  // the table controls behave identically either way.
  const visibleItems = useMemo(() => {
    if (paginated) return items
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, paginated, page, pageSize])

  return {
    items: visibleItems,
    allItems: items,
    count,
    loading,
    error,
    page,
    setPage,
    pageSize,
    search,
    setSearch,
    sort,
    setSort,
    refresh,
  }
}

/** Loads a single resource, or the full list when no pagination is required. */
export const useResource = (fetcher, { enabled = true, initialData = null } = {}) => {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)

  const mounted = useIsMounted()
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return undefined
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetcherRef
      .current({ signal: controller.signal })
      .then((payload) => {
        if (!mounted.current || controller.signal.aborted) return
        setData(payload)
      })
      .catch((requestError) => {
        if (!mounted.current || requestError?.name === 'AbortError') return
        setError(requestError)
      })
      .finally(() => {
        if (!mounted.current || controller.signal.aborted) return
        setLoading(false)
      })

    return () => controller.abort()
  }, [enabled, reloadToken, mounted])

  const refresh = useCallback(() => setReloadToken((token) => token + 1), [])

  return { data, loading, error, refresh, setData }
}

/**
 * Wraps a write call with pending/error state. `run` resolves with the payload
 * and rejects with the `ApiError` so callers can branch on 409 vs 400.
 */
export const useMutation = (mutator) => {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const mounted = useIsMounted()
  const mutatorRef = useRef(mutator)
  mutatorRef.current = mutator

  const run = useCallback(
    async (...args) => {
      setPending(true)
      setError(null)
      try {
        return await mutatorRef.current(...args)
      } catch (mutationError) {
        if (mounted.current) setError(mutationError)
        throw mutationError
      } finally {
        if (mounted.current) setPending(false)
      }
    },
    [mounted],
  )

  const reset = useCallback(() => setError(null), [])

  return { run, pending, error, reset }
}

/**
 * Loads every page of a collection for use in select inputs. Option lists here
 * are small (providers, consumer groups, templates), so one pass is enough.
 */
export const useOptions = (fetcher, { enabled = true } = {}) => {
  const { data, loading, error, refresh } = useResource(
    useCallback(
      ({ signal }) => fetcher({ params: { page_size: 500 }, signal }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    ),
    { enabled },
  )

  const options = useMemo(() => unwrapCollection(data).items, [data])

  return { options, loading, error, refresh }
}
