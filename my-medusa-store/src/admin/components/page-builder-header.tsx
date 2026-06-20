import { Container, Heading, Text, Badge } from "@medusajs/ui"

/**
 * Builder-style banner shown at the top of a page editor (Homepage / Store
 * Page). Gives the editors a consistent "page builder" identity: a stacked
 * accent strip, a blocks icon, the page name, and a one-line intro.
 */
export default function PageBuilderHeader({
  page,
  subtitle,
}: {
  page: string
  subtitle: string
}) {
  return (
    <Container className="p-0 overflow-hidden">
      <div
        className="flex items-center gap-4 px-6 py-5"
        style={{
          background:
            "linear-gradient(90deg, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0.02) 60%, transparent 100%)",
        }}
      >
        {/* Stacked-blocks glyph */}
        <span
          className="flex items-center justify-center rounded-xl shrink-0"
          style={{
            width: 44,
            height: 44,
            background: "rgba(99,102,241,0.14)",
            color: "rgb(99,102,241)",
            fontSize: 22,
          }}
          aria-hidden
        >
          ⧉
        </span>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Heading level="h1">{page}</Heading>
            <Badge size="small" color="purple">
              Page Builder
            </Badge>
          </div>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {subtitle}
          </Text>
        </div>
      </div>
    </Container>
  )
}
