'use client'

import { useEffect } from 'react'

/**
 * Hook to protect course content from being copied.
 * Blocks: right-click, text selection shortcuts, dev tools shortcuts,
 * drag events, and print attempts.
 */
export function useContentProtection() {
  useEffect(() => {
    // Block right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    // Block keyboard shortcuts for copy, view source, save, dev tools, select all
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+C (copy)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault()
        return false
      }
      // Ctrl+A (select all)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        return false
      }
      // Ctrl+U (view source)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault()
        return false
      }
      // Ctrl+S (save page)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        return false
      }
      // Ctrl+Shift+I (dev tools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault()
        return false
      }
      // Ctrl+Shift+J (console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
        e.preventDefault()
        return false
      }
      // Ctrl+Shift+C (inspect element)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        return false
      }
      // F12 (dev tools)
      if (e.key === 'F12') {
        e.preventDefault()
        return false
      }
      // Ctrl+P (print)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        return false
      }
    }

    // Block drag events
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault()
      return false
    }

    // Block copy event
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      return false
    }

    // Block cut event
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault()
      return false
    }

    // Block selectstart (text selection initiation)
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement
      // Allow selection in input/textarea fields
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return true
      }
      e.preventDefault()
      return false
    }

    // Register all event listeners
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('dragstart', handleDragStart)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('cut', handleCut)
    document.addEventListener('selectstart', handleSelectStart)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('dragstart', handleDragStart)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('cut', handleCut)
      document.removeEventListener('selectstart', handleSelectStart)
    }
  }, [])
}
