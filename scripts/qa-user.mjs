// Existing reader regressions represent returning users. First visits have their own suite.
export async function returningUser(page) {
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem('scripture-scribe-introduction-v1', 'seen') } catch { /* Storage-failure tests remain valid. */ }
  })
}
