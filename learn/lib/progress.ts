const STORAGE_KEY = 'acme-academy-progress'

export function getCompletedLessons(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function setLessonComplete(slug: string, complete: boolean) {
  const current = new Set(getCompletedLessons())
  if (complete) current.add(slug)
  else current.delete(slug)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]))
}

export function isLessonComplete(slug: string): boolean {
  return getCompletedLessons().includes(slug)
}
