import fs from 'fs'
import path from 'path'
import terms from '@/content/terms.json'
import screens from '@/content/screens.json'
import { LESSONS } from '@/lib/lessons'

export type Term = (typeof terms)[number]
export type Screen = (typeof screens)[number]

export function getAllTerms(): Term[] {
  return terms
}

export function getAllScreens(): Screen[] {
  return screens
}

export function getLessonMarkdown(slug: string): string {
  const filePath = path.join(process.cwd(), 'content/lessons', `${slug}.md`)
  return fs.readFileSync(filePath, 'utf8')
}

export function getAllLessonSlugs(): string[] {
  return LESSONS.map(l => l.slug)
}
