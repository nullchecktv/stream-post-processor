import { useEffect } from 'react'

export function usePageTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title ? `${title} | Encore` : 'Encore'

    return () => {
      document.title = previousTitle
    }
  }, [title])
}

