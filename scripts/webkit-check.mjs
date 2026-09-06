/**
 * Safari/WebKit compatibility check.
 *
 * Loads pages in Playwright's WebKit — the same engine family that powers
 * Safari — and reports anything a real Safari user would hit: uncaught JS
 * exceptions, console errors, failed network requests, and a screenshot so
 * layout problems are visible rather than guessed at.
 *
 * WebKit here is a current build, so it verifies "does this work in modern
 * Safari". It cannot reproduce bugs specific to an old version (e.g. Safari
 * 16.4's color-mix quirk) — for those you still need the real device.
 *
 *   node scripts/webkit-check.mjs                       # localhost:3000
 *   node scripts/webkit-check.mjs https://tallplus.co   # production
 *   node scripts/webkit-check.mjs http://localhost:3000 /product/some-slug
 */
import { webkit } from 'playwright'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] || 'http://localhost:3000'
const paths = process.argv.slice(3)
const routes = paths.length ? paths : ['/', '/shop', '/cart']

const OUT = 'scratch/webkit'
mkdirSync(OUT, { recursive: true })

const browser = await webkit.launch()
let totalProblems = 0

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },   // iPhone 14-ish
]) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  })

  for (const route of routes) {
    const page = await context.newPage()
    const pageErrors = []
    const consoleErrors = []
    const failedRequests = []

    // An uncaught exception is the one that blanks the page — capture it
    // separately from console noise so the report stays readable.
    page.on('pageerror', (err) => pageErrors.push(err.message.split('\n')[0]))
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 160))
    })
    page.on('requestfailed', (req) => {
      failedRequests.push(`${req.failure()?.errorText ?? 'failed'} — ${req.url().slice(0, 100)}`)
    })

    const url = base.replace(/\/$/, '') + route
    let status = 'n/a'
    try {
      const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
      status = res ? String(res.status()) : 'no response'
    } catch (e) {
      pageErrors.push(`navigation failed: ${e.message.split('\n')[0]}`)
    }

    // Did CSS actually apply? If Tailwind never loaded, <body> keeps the
    // browser default margin of 8px and a transparent background — a cheap,
    // reliable signal that styling is broken rather than merely ugly.
    const styling = await page.evaluate(() => {
      const cs = getComputedStyle(document.body)
      return {
        bodyMargin: cs.margin,
        bodyBg: cs.backgroundColor,
        fontFamily: cs.fontFamily.slice(0, 40),
        styleSheets: document.styleSheets.length,
        // Rules actually parsed by this engine; 0 means the CSS was rejected.
        rulesParsed: [...document.styleSheets].reduce((n, s) => {
          try { return n + s.cssRules.length } catch { return n }
        }, 0),
      }
    })

    const shot = `${OUT}/${viewport.name}${route.replace(/\W+/g, '_') || '_home'}.png`
    await page.screenshot({ path: shot, fullPage: false })

    const problems = pageErrors.length + failedRequests.length
    totalProblems += problems

    console.log(`\n── ${viewport.name}  ${url}  [HTTP ${status}]`)
    console.log(`   stylesheets: ${styling.styleSheets}  rules parsed: ${styling.rulesParsed}`)
    console.log(`   body margin: ${styling.bodyMargin}   bg: ${styling.bodyBg}`)
    console.log(`   font: ${styling.fontFamily}`)
    if (styling.rulesParsed === 0) console.log('   *** NO CSS RULES PARSED — styling is broken ***')
    if (pageErrors.length) {
      console.log(`   JS EXCEPTIONS (${pageErrors.length}):`)
      pageErrors.forEach((e) => console.log(`     ! ${e}`))
    }
    if (consoleErrors.length) {
      console.log(`   console errors (${consoleErrors.length}):`)
      consoleErrors.slice(0, 5).forEach((e) => console.log(`     - ${e}`))
    }
    if (failedRequests.length) {
      console.log(`   failed requests (${failedRequests.length}):`)
      failedRequests.slice(0, 5).forEach((e) => console.log(`     - ${e}`))
    }
    if (!problems && styling.rulesParsed > 0) console.log('   OK — no errors, CSS applied')
    console.log(`   screenshot: ${shot}`)

    await page.close()
  }

  await context.close()
}

await browser.close()
console.log(`\n${'='.repeat(60)}`)
console.log(totalProblems === 0
  ? 'RESULT: no JS exceptions or failed requests in WebKit.'
  : `RESULT: ${totalProblems} problem(s) found — see above.`)
