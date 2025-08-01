import * as React from 'react';

export function usePersistentState<T>(
  key: string,
  defaultValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = React.useState<T>(defaultValue)

  // Load from localStorage after initial render to avoid hydration mismatch
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored !== null) {
        try {
          setState(JSON.parse(stored) as T)
        } catch {
          setState(stored as unknown as T)
        }
      }
    } catch {
      // ignore
    }
  }, [key])

  React.useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [key, state])

  return [state, setState]
}
