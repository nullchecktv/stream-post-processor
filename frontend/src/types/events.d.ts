export interface RefreshPageContentEvent extends CustomEvent {
  detail: {
    url: string
    message: {
      type: string
      title: string
      message: string
      url: string
      timestamp: string
      metadata?: Record<string, unknown>
    }
  }
}

declare global {
  interface WindowEventMap {
    refreshPageContent: RefreshPageContentEvent
  }
}

export {}
