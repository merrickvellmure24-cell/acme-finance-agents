export interface ParsedAgentOutput {
  dataScanned: string[]
  reasoningSteps: string[]
  conclusions: { level: 'RED' | 'YELLOW' | 'GREEN'; text: string }[]
  report: string
  summary: string
  health: 'RED' | 'YELLOW' | 'GREEN'
  needsEscalation: boolean
}

export default function parseAgentOutput(rawText: string): ParsedAgentOutput {
  // Strip <think>...</think> blocks emitted by reasoning models (e.g. Qwen3.6-27B raw format)
  const text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

  const empty: ParsedAgentOutput = {
    dataScanned: [],
    reasoningSteps: [],
    conclusions: [],
    report: text,
    summary: '',
    health: 'GREEN',
    needsEscalation: false,
  }

  if (!text) return empty

  const sections: Record<string, string> = {}
  const markerRe = /##(DATA_SCANNED|FRAUD_AUDIT|REASONING|CONCLUSIONS|REPORT)##/g
  const markers: { name: string; start: number; contentStart: number }[] = []

  let m: RegExpExecArray | null
  while ((m = markerRe.exec(text)) !== null) {
    markers.push({ name: m[1], start: m.index, contentStart: m.index + m[0].length })
  }

  // Slice each section from its content start to the next marker's start
  for (let i = 0; i < markers.length; i++) {
    const end = i + 1 < markers.length ? markers[i + 1].start : text.length
    sections[markers[i].name] = text.slice(markers[i].contentStart, end).trim()
  }

  // Merge FRAUD_AUDIT into REASONING (AP/vendor agent uses this extra section)
  if (sections.FRAUD_AUDIT && !sections.REASONING) {
    sections.REASONING = sections.FRAUD_AUDIT
  } else if (sections.FRAUD_AUDIT) {
    sections.REASONING = sections.FRAUD_AUDIT + '\n' + sections.REASONING
  }

  const dataScanned = (sections.DATA_SCANNED || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  const reasoningSteps = (sections.REASONING || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  const conclusionLines = (sections.CONCLUSIONS || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  const conclusions: ParsedAgentOutput['conclusions'] = []
  for (const line of conclusionLines) {
    // Match both plain `RED:` and bold `**RED:**` variants
    if (/^\*{0,2}RED\*{0,2}:\s*/i.test(line)) {
      conclusions.push({ level: 'RED', text: line.replace(/^\*{0,2}RED\*{0,2}:\s*/i, '') })
    } else if (/^\*{0,2}YELLOW\*{0,2}:\s*/i.test(line)) {
      conclusions.push({ level: 'YELLOW', text: line.replace(/^\*{0,2}YELLOW\*{0,2}:\s*/i, '') })
    } else if (/^\*{0,2}GREEN\*{0,2}:\s*/i.test(line)) {
      conclusions.push({ level: 'GREEN', text: line.replace(/^\*{0,2}GREEN\*{0,2}:\s*/i, '') })
    } else if (conclusions.length > 0) {
      conclusions[conclusions.length - 1].text += ' ' + line
    }
  }

  // Clean up conclusion text: strip stray ##MARKERS## and unfilled [placeholders]
  for (const c of conclusions) {
    c.text = c.text
      .replace(/\s*##[A-Z_]+#{0,2}\s*$/gi, '')  // trailing ##REPORT## or ##REPORT
      .replace(/^\[([^\]]+)\]\s*/g, '')           // leading [template placeholder]
      .trim()
  }

  const report = sections.REPORT || text
  const summary = conclusions[0]?.text || conclusionLines[0] || ''

  const levels = conclusions.map(c => c.level)
  const health: ParsedAgentOutput['health'] = levels.includes('RED')
    ? 'RED'
    : levels.includes('YELLOW')
    ? 'YELLOW'
    : 'GREEN'

  return {
    dataScanned,
    reasoningSteps,
    conclusions,
    report,
    summary,
    health,
    needsEscalation: health === 'RED',
  }
}
