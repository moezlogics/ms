import DeferredHeadScripts from "./deferred-head-scripts"
import { splitHeadCode } from "./split-head-code"

export default function CustomHeadCode({ html }: { html?: string }) {
  if (!html?.trim()) return null

  const { staticTags, deferredScripts } = splitHeadCode(html)

  return (
    <>
      {staticTags ? (
        <style
          dangerouslySetInnerHTML={{
            __html: `</style>${staticTags}<style>`,
          }}
        />
      ) : null}
      {deferredScripts.length > 0 && (
        <DeferredHeadScripts scripts={deferredScripts} />
      )}
    </>
  )
}
