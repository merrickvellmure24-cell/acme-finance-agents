import { notFound } from 'next/navigation'
import { LessonLayout } from '@/components/LessonLayout'
import { getLessonNeighbors } from '@/lib/lessons'
import { getAllLessonSlugs, getLessonMarkdown } from '@/lib/content'

export function generateStaticParams() {
  return getAllLessonSlugs().map(slug => ({ slug }))
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { lesson, prev, next } = getLessonNeighbors(slug)

  if (!lesson) notFound()

  const content = getLessonMarkdown(slug)

  return <LessonLayout lesson={lesson} content={content} prev={prev} next={next} />
}
