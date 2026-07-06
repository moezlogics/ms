const SCRIPT_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi

export function splitHeadCode(html: string): {
  staticTags: string
  deferredScripts: string[]
} {
  const deferredScripts: string[] = []
  const staticTags = html
    .replace(SCRIPT_RE, (match) => {
      deferredScripts.push(match)
      return ""
    })
    .trim()

  return { staticTags, deferredScripts }
}
