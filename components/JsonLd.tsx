/**
 * Renders a JSON-LD block.
 *
 * Server component on purpose: crawlers that do not execute JavaScript still
 * need to see this in the initial HTML, which rules out injecting it from the
 * client.
 *
 * `<` is escaped because a description containing `</script>` would otherwise
 * close the tag early and break the page — the standard XSS route for any
 * server-rendered JSON payload.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c")

  return (
    <script
      type="application/ld+json"
      // Safe: the value is JSON.stringify output with `<` neutralised above.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
