import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import './redesign.css'

type Verse = { number: number; text: string }
type Chapter = { number: number; verses: Verse[] }
type Book = { id: string; name: string; chapters: Chapter[] }
type Bible = {
  translation: { id: string; name: string; source: string; notice: string }
  books: Book[]
}
type Position = { book: number; chapter: number; verse: number }
type SavedPlace = { id: string; position: Position; savedAt: number }
type Handedness = 'right' | 'left'
type Theme = 'paper' | 'night'
type Panel = 'navigate' | 'settings' | null

type CanonicalPosition = { bookId: string; chapter: number; verse: number }
type TranslationState = { position: CanonicalPosition; savedPlaces: { id: string; position: CanonicalPosition; savedAt: number }[] }
type LibraryState = { translation?: string; translations?: Record<string, TranslationState> }
const TRANSLATIONS: Record<string, string> = { WEB: 'bible.json', ASV1901: 'asv1901.json', BSB: 'bsb.json' }
const LIBRARY_KEY = 'scripture-scribe-library-v3'
function loadLibrary(): LibraryState {
  try { return JSON.parse(localStorage.getItem(LIBRARY_KEY) || '{}') || {} } catch { return {} }
}
function canonical(bible: Bible, p: Position): CanonicalPosition {
  const b = bible.books[p.book], c = b.chapters[p.chapter]
  return { bookId: b.id, chapter: c.number, verse: c.verses[p.verse].number }
}
function locate(bible: Bible, p?: CanonicalPosition): Position {
  if (!p) return DEFAULT_POSITION
  const book = bible.books.findIndex(b => b.id === p.bookId)
  const chapter = bible.books[book]?.chapters.findIndex(c => c.number === p.chapter) ?? -1
  const verse = bible.books[book]?.chapters[chapter]?.verses.findIndex(v => v.number === p.verse) ?? -1
  return book >= 0 && chapter >= 0 && verse >= 0 ? { book, chapter, verse } : DEFAULT_POSITION
}
function validPosition(bible: Bible, p: Position): boolean {
  return Boolean(p && bible.books[p.book]?.chapters[p.chapter]?.verses[p.verse])
}
const STORAGE_KEY = 'scripture-scribe-state-v2'
const LEGACY_STORAGE_KEY = 'scripture-scribe-settings-v1'
const DEFAULT_POSITION: Position = { book: 0, chapter: 0, verse: 0 }

const BOOK_ALIASES: Record<string, string> = {
  ge: 'GEN', gen: 'GEN', ex: 'EXO', exo: 'EXO', exod: 'EXO', lev: 'LEV',
  nu: 'NUM', num: 'NUM', de: 'DEU', deu: 'DEU', deut: 'DEU', jos: 'JOS', josh: 'JOS',
  jdgs: 'JDG', judg: 'JDG', ru: 'RUT', ruth: 'RUT', '1sa': '1SA', '1sam': '1SA',
  '2sa': '2SA', '2sam': '2SA', '1ki': '1KI', '1kgs': '1KI', '2ki': '2KI', '2kgs': '2KI',
  '1ch': '1CH', '1chr': '1CH', '2ch': '2CH', '2chr': '2CH', ezr: 'EZR', neh: 'NEH',
  est: 'EST', job: 'JOB', ps: 'PSA', psa: 'PSA', psalm: 'PSA', psalms: 'PSA',
  pr: 'PRO', pro: 'PRO', prov: 'PRO', ec: 'ECC', ecc: 'ECC', qoheleth: 'ECC',
  song: 'SNG', sos: 'SNG', ss: 'SNG', isa: 'ISA', jer: 'JER', lam: 'LAM',
  eze: 'EZK', ezek: 'EZK', dan: 'DAN', hos: 'HOS', joe: 'JOL', joel: 'JOL',
  amo: 'AMO', ob: 'OBA', oba: 'OBA', jonah: 'JON', mic: 'MIC', nah: 'NAM',
  hab: 'HAB', zeph: 'ZEP', hag: 'HAG', zec: 'ZEC', zech: 'ZEC', mal: 'MAL',
  mt: 'MAT', mat: 'MAT', matt: 'MAT', mk: 'MRK', mar: 'MRK', mark: 'MRK',
  lk: 'LUK', luk: 'LUK', luke: 'LUK', jn: 'JHN', joh: 'JHN', john: 'JHN',
  ac: 'ACT', act: 'ACT', acts: 'ACT', ro: 'ROM', rom: 'ROM', '1co': '1CO',
  '1cor': '1CO', '2co': '2CO', '2cor': '2CO', ga: 'GAL', gal: 'GAL', eph: 'EPH',
  php: 'PHP', phil: 'PHP', col: 'COL', '1th': '1TH', '1thess': '1TH',
  '2th': '2TH', '2thess': '2TH', '1ti': '1TI', '1tim': '1TI', '2ti': '2TI',
  '2tim': '2TI', tit: 'TIT', phm: 'PHM', philem: 'PHM', heb: 'HEB', jas: 'JAS',
  james: 'JAS', '1pe': '1PE', '1pet': '1PE', '2pe': '2PE', '2pet': '2PE',
  '1jn': '1JN', '1john': '1JN', '2jn': '2JN', '2john': '2JN', '3jn': '3JN',
  '3john': '3JN', jude: 'JUD', rev: 'REV', revelation: 'REV',
}

const BookmarkIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={filled ? 'filled-icon' : undefined}>
    <path d="M6.5 4.5A1.5 1.5 0 0 1 8 3h8a1.5 1.5 0 0 1 1.5 1.5V21L12 17.6 6.5 21V4.5Z" />
  </svg>
)

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="10.8" cy="10.8" r="6.3" />
    <path d="m15.5 15.5 4.2 4.2" />
  </svg>
)

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M6 15v4" />
  </svg>
)

const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
  </svg>
)

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />
  </svg>
)

const SunIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
  </svg>
)

const ArrowUpIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6" /></svg>
)

const ArrowDownIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 10 6 6 6-6" /></svg>
)

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>
)

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
  </svg>
)

function samePosition(a: Position, b: Position) {
  return a.book === b.book && a.chapter === b.chapter && a.verse === b.verse
}

function normalizeBookName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function loadSavedState() {
  try {
    const current = localStorage.getItem(STORAGE_KEY)
    if (current) {
      return JSON.parse(current) as {
        position?: Position
        handedness?: Handedness
        fontSize?: number
        theme?: Theme
        savedPlaces?: SavedPlace[]
      }
    }
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    return legacy ? JSON.parse(legacy) : {}
  } catch {
    return {}
  }
}

function getReference(bible: Bible, position: Position) {
  const book = bible.books[position.book]
  const chapter = book.chapters[position.chapter]
  return `${book.name} ${chapter.number}:${chapter.verses[position.verse].number}`
}

function resolveReference(input: string, bible: Bible): Position | null {
  const cleaned = input.trim().replace(/[.]/g, '')
  const match = cleaned.match(/^(.+?)\s*(\d+)\s*(?::|\s)\s*(\d+)?$/)
  if (!match) return null

  const [, rawBook, rawChapter, rawVerse] = match
  const bookQuery = normalizeBookName(rawBook)
  const aliasId = BOOK_ALIASES[bookQuery]
  const exactIndex = bible.books.findIndex((book) => normalizeBookName(book.name) === bookQuery)
  const aliasIndex = aliasId ? bible.books.findIndex((book) => book.id === aliasId) : -1
  const prefixMatches = bible.books
    .map((book, index) => ({ book, index }))
    .filter(({ book }) => normalizeBookName(book.name).startsWith(bookQuery))
  const bookIndex = exactIndex >= 0 ? exactIndex : aliasIndex >= 0 ? aliasIndex : prefixMatches.length === 1 ? prefixMatches[0].index : -1
  if (bookIndex < 0) return null

  const chapterNumber = Number(rawChapter)
  const chapterIndex = bible.books[bookIndex].chapters.findIndex((chapter) => chapter.number === chapterNumber)
  if (chapterIndex < 0) return null

  const verseNumber = rawVerse ? Number(rawVerse) : 1
  const verseIndex = bible.books[bookIndex].chapters[chapterIndex].verses.findIndex((verse) => verse.number === verseNumber)
  if (verseIndex < 0) return null
  return { book: bookIndex, chapter: chapterIndex, verse: verseIndex }
}

function App() {
  const saved = useMemo(() => loadSavedState(), [])
  const initialLibrary = useMemo(loadLibrary, [])
  const library = useRef(initialLibrary)
  const [translation, setTranslation] = useState(() => initialLibrary.translation && TRANSLATIONS[initialLibrary.translation] ? initialLibrary.translation : 'WEB')
  const carryPosition = useRef<CanonicalPosition | undefined>(undefined)
  const [positionNotice, setPositionNotice] = useState('')
  const [saveError, setSaveError] = useState(false)
  const [focusWriting, setFocusWriting] = useState(false)
  const [lineGuide, setLineGuide] = useState(false)
  const [guideHeight, setGuideHeight] = useState(54)
  const [guideTop, setGuideTop] = useState<number | null>(null)
  const [bible, setBible] = useState<Bible | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [position, setPosition] = useState<Position>(saved.position ?? DEFAULT_POSITION)
  const [draftPosition, setDraftPosition] = useState<Position>(saved.position ?? DEFAULT_POSITION)
  const [handedness, setHandedness] = useState<Handedness>(saved.handedness ?? 'right')
  const [fontSize, setFontSize] = useState(saved.fontSize ?? 36)
  const [theme, setTheme] = useState<Theme>(saved.theme ?? 'paper')
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>(saved.savedPlaces ?? [])
  const [panel, setPanel] = useState<Panel>(null)
  const [referenceQuery, setReferenceQuery] = useState('')
  const activeVerseRef = useRef<HTMLElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadError(false)
    setBible(null)
    fetch(`${import.meta.env.BASE_URL}data/${TRANSLATIONS[translation]}`)
      .then((response) => {
        if (!response.ok) throw new Error('Bible text did not load.')
        return response.json() as Promise<Bible>
      })
      .then((data) => {
        if (cancelled) return
        const stored = library.current.translations?.[translation]
        const next = stored ? locate(data, stored.position) : translation === 'WEB' && validPosition(data, saved.position) ? saved.position : locate(data, carryPosition.current)
        const requested = stored?.position ?? carryPosition.current
        setPositionNotice(requested && JSON.stringify(canonical(data, next)) !== JSON.stringify(requested) ? 'That reference is unavailable in this translation. Showing Genesis 1:1.' : '')
        setPosition(next)
        setDraftPosition(next)
        setSavedPlaces(stored ? stored.savedPlaces.map(place => ({ ...place, position: locate(data, place.position) })) : translation === 'WEB' ? (saved.savedPlaces ?? []).filter((place: SavedPlace) => validPosition(data, place.position)) : [])
        setBible(data)
      })
      .catch(() => { if (!cancelled) setLoadError(true) })
    return () => { cancelled = true }
  }, [translation, saved])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    if (!bible || bible.translation.id !== translation) return
    carryPosition.current = canonical(bible, position)
    library.current = { translation, translations: { ...library.current.translations, [translation]: {
      position: canonical(bible, position), savedPlaces: savedPlaces.map(place => ({ ...place, position: canonical(bible, place.position) })),
    } } }
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(library.current))
      // Keep old WEB data intact and old global settings compatible.
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadSavedState(), handedness, fontSize, theme,
        ...(translation === 'WEB' ? { position, savedPlaces } : {}),
      }))
      setSaveError(false)
    } catch { setSaveError(true) }
  }, [bible, translation, position, handedness, fontSize, theme, savedPlaces, saved])

  useEffect(() => { setGuideTop(null) }, [position, fontSize, translation, focusWriting])
  useEffect(() => {
    const clear = () => setGuideTop(null)
    window.addEventListener('resize', clear)
    return () => window.removeEventListener('resize', clear)
  }, [])

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    activeVerseRef.current?.scrollIntoView({ behavior: 'instant', block: 'nearest' })
    if (!reducedMotion) activeVerseRef.current?.animate([
      { opacity: 0.45, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 230, easing: 'cubic-bezier(.2,.7,.2,1)' })
  }, [position])

  useEffect(() => {
    if (panel === 'navigate') window.setTimeout(() => searchInputRef.current?.focus(), 80)
  }, [panel])

  const ensureWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null
        })
      }
    } catch {
      // Wake lock support differs by browser. Navigation still works without it.
    }
  }, [])

  const move = useCallback(
    (direction: 1 | -1) => {
      if (!bible) return
      ensureWakeLock()
      setPosition((current) => {
        const next = { ...current }
        const chapter = bible.books[next.book].chapters[next.chapter]

        if (direction === 1) {
          if (next.verse < chapter.verses.length - 1) next.verse += 1
          else if (next.chapter < bible.books[next.book].chapters.length - 1) {
            next.chapter += 1
            next.verse = 0
          } else if (next.book < bible.books.length - 1) {
            next.book += 1
            next.chapter = 0
            next.verse = 0
          }
        } else if (next.verse > 0) next.verse -= 1
        else if (next.chapter > 0) {
          next.chapter -= 1
          next.verse = bible.books[next.book].chapters[next.chapter].verses.length - 1
        } else if (next.book > 0) {
          next.book -= 1
          next.chapter = bible.books[next.book].chapters.length - 1
          next.verse = bible.books[next.book].chapters[next.chapter].verses.length - 1
        }
        return next
      })
    },
    [bible, ensureWakeLock],
  )

  const openNavigator = useCallback(() => {
    setDraftPosition(position)
    setReferenceQuery('')
    setPanel('navigate')
  }, [position])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return
      if (event.key === 'Escape') {
        setPanel(null)
        return
      }
      const target = event.target as HTMLElement
      if (['SELECT', 'INPUT', 'BUTTON'].includes(target.tagName) || panel) return
      if (event.key.toLowerCase() === 'g') {
        event.preventDefault()
        openNavigator()
        return
      }
      if (event.key.toLowerCase() === 'b') {
        event.preventDefault()
        setSavedPlaces((places) => {
          const existing = places.find((place) => samePosition(place.position, position))
          return existing
            ? places.filter((place) => place.id !== existing.id)
            : [{ id: crypto.randomUUID(), position: { ...position }, savedAt: Date.now() }, ...places]
        })
        return
      }
      if ([' ', 'ArrowRight', 'ArrowDown', 'PageDown', 'Enter'].includes(event.key)) {
        event.preventDefault()
        move(1)
      }
      if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(event.key)) {
        event.preventDefault()
        move(-1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [move, openNavigator, panel, position])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
      else await document.exitFullscreen()
    } catch {
      // Fullscreen is optional and unsupported in some mobile browsers.
    }
  }

  if (loadError) {
    return (
      <main className="status-screen">
        <p className="wordmark">The writing room</p>
        <h1>The Bible text could not load.</h1>
        <p>Refresh the page to try again, or return to WEB.</p><button onClick={() => setTranslation('WEB')}>Use WEB</button>
      </main>
    )
  }

  if (!bible) {
    return (
      <main className="status-screen" aria-live="polite">
        <p className="wordmark">The writing room</p>
        <div className="loading-mark" aria-hidden="true">S</div>
        <p>Preparing your place.</p>
      </main>
    )
  }

  const book = bible.books[position.book]
  const chapter = book.chapters[position.chapter]
  const currentVerse = chapter.verses[position.verse]
  const visibleStart = Math.max(0, position.verse - 1)
  const visibleEnd = Math.min(chapter.verses.length, position.verse + 2)
  const visibleVerses = chapter.verses.slice(visibleStart, visibleEnd)
  const chapterProgress = Math.round(((position.verse + 1) / chapter.verses.length) * 100)
  const controlsOnLeft = handedness === 'right'
  const atStart = position.book === 0 && position.chapter === 0 && position.verse === 0
  const finalBook = bible.books.length - 1
  const finalChapter = bible.books[finalBook].chapters.length - 1
  const finalVerse = bible.books[finalBook].chapters[finalChapter].verses.length - 1
  const atEnd = position.book === finalBook && position.chapter === finalChapter && position.verse === finalVerse
  const currentBookmark = savedPlaces.find((place) => samePosition(place.position, position))
  const parsedReference = referenceQuery ? resolveReference(referenceQuery, bible) : null
  const draftBook = bible.books[draftPosition.book]
  const draftChapter = draftBook.chapters[draftPosition.chapter]

  const goTo = (nextPosition: Position) => {
    setPosition(nextPosition)
    setDraftPosition(nextPosition)
    setReferenceQuery('')
    setPanel(null)
  }

  const toggleBookmark = () => {
    setSavedPlaces((places) => currentBookmark
      ? places.filter((place) => place.id !== currentBookmark.id)
      : [{ id: crypto.randomUUID(), position: { ...position }, savedAt: Date.now() }, ...places])
  }

  const removeSavedPlace = (id: string) => {
    setSavedPlaces((places) => places.filter((place) => place.id !== id))
  }

  return (
    <main className={`app-shell ${controlsOnLeft ? 'controls-left' : 'controls-right'} ${focusWriting ? 'focus-writing' : ''}`}>
      <aside className="control-rail" aria-label="Writing controls">
        <button type="button" className="rail-button previous-button" onClick={() => move(-1)} disabled={atStart} aria-label="Previous verse">
          <ArrowUpIcon />
          <span>Back</span>
        </button>
        <button type="button" className="rail-button next-button" onClick={() => move(1)} disabled={atEnd} aria-label="Next verse">
          <span>Next</span>
          <ArrowDownIcon />
        </button>
        <div className="rail-progress" aria-label={`${chapterProgress}% through this chapter`}>
          <span style={{ '--progress': `${chapterProgress}%` } as React.CSSProperties} />
          <strong>{position.verse + 1}/{chapter.verses.length}</strong>
        </div>
      </aside>

      <section className="reader-panel">
        <header className="topbar">
          <div className="reader-identity">
            <a className="scribe-wordmark" href={import.meta.env.BASE_URL} aria-label="Homepage">The writing room<span className="wordmark-period" aria-hidden="true">.</span></a>
            <span className="identity-rule" aria-hidden="true" />
          <button type="button" className="passage-button" onClick={openNavigator} aria-label={`Go to a passage. Current passage ${getReference(bible, position)}`}>
            <span>{book.name}</span>
            <strong>{chapter.number}:{currentVerse.number}</strong>
            <ChevronDownIcon />
          </button>
          </div>
          <div className="topbar-actions">
            <button type="button" className={`icon-button bookmark-button ${currentBookmark ? 'selected' : ''}`} onClick={toggleBookmark} aria-label={currentBookmark ? 'Remove bookmark' : 'Save this verse'}>
              <BookmarkIcon filled={Boolean(currentBookmark)} />
            </button>
            <button type="button" className="icon-button theme-button" onClick={() => setTheme(theme === 'paper' ? 'night' : 'paper')} aria-label={theme === 'paper' ? 'Use night theme' : 'Use paper theme'}>
              {theme === 'paper' ? <MoonIcon /> : <SunIcon />}
            </button>
            <button type="button" className="icon-button fullscreen-button" onClick={toggleFullscreen} aria-label="Toggle fullscreen">
              <ExpandIcon />
            </button>
            <button type="button" className="icon-button" onClick={() => setPanel('settings')} aria-label="Open settings">
              <SettingsIcon />
            </button>
          </div>
        </header>

        <div className="writing-tools">
          <select aria-label="Bible translation" value={translation} onChange={event => { setPanel(null); setTranslation(event.target.value) }}>
            <option value="WEB">WEB</option><option value="ASV1901">ASV 1901</option><option value="BSB">BSB</option>
          </select>
          <button type="button" aria-pressed={focusWriting} onClick={() => setFocusWriting(!focusWriting)}>Focus</button>
          <button type="button" aria-pressed={lineGuide} onClick={() => { setLineGuide(!lineGuide); setGuideTop(null) }}>Line guide</button>
          {positionNotice && <span role="status">{positionNotice}</span>}
          {lineGuide && <span>Click a line to mark your place.</span>}
        </div>
        <div className="scripture-wrap">
          <div className="chapter-label">
            <div className="chapter-kicker">{bible.translation.name} <span>Chapter {chapter.number}</span></div>
            <h1>{book.name}<span className="chapter-number">{String(chapter.number).padStart(2, '0')}</span></h1>
            <div className="chapter-caption"><span>Scripture, by hand.</span><span>Verse {currentVerse.number} of {chapter.verses.length}</span></div>
          </div>
          <div className="scripture" style={{ '--scripture-size': `${fontSize}px` } as React.CSSProperties}>
            {visibleVerses.map((verse) => {
              const isActive = verse.number === currentVerse.number
              return (
                <article className={isActive ? 'verse active' : 'verse'} key={verse.number} ref={isActive ? activeVerseRef : undefined} aria-current={isActive ? 'true' : undefined}>
                  <sup>{verse.number}</sup>
                  <p className={isActive && lineGuide ? 'guided-text' : undefined}
                    tabIndex={isActive && lineGuide ? 0 : undefined}
                    aria-label={isActive && lineGuide ? 'Scripture. Click a line, or use up and down arrows to move the line guide.' : undefined}
                    onClick={event => {
                      if (!isActive || !lineGuide) return
                      const height = parseFloat(getComputedStyle(event.currentTarget).lineHeight)
                      setGuideHeight(height)
                      setGuideTop(Math.floor((event.clientY - event.currentTarget.getBoundingClientRect().top) / height) * height)
                    }}
                    onKeyDown={event => {
                      if (!lineGuide || !isActive || !['ArrowUp', 'ArrowDown'].includes(event.key)) return
                      event.preventDefault(); event.stopPropagation()
                      const height = parseFloat(getComputedStyle(event.currentTarget).lineHeight)
                      setGuideHeight(height)
                      const max = event.currentTarget.offsetHeight - height
                      setGuideTop(top => Math.max(0, Math.min(max, (top ?? 0) + (event.key === 'ArrowDown' ? height : -height))))
                    }}
                    style={isActive && lineGuide && guideTop !== null ? { backgroundImage: `linear-gradient(to bottom, transparent ${guideTop}px, var(--accent-soft) ${guideTop}px, var(--accent-soft) ${guideTop + guideHeight}px, transparent ${guideTop + guideHeight}px)` } : undefined}
                  >{verse.text}</p>
                </article>
              )
            })}
          </div>
        </div>

        <footer className="reader-footer">
          <p>Space or arrow key to continue</p>
          <p className="saved-status"><span aria-hidden="true" />{saveError ? 'Not saved — device storage unavailable' : 'Place saved on this device'}</p>
        </footer>
      </section>

      {panel && (
        <div className="dialog-backdrop" onMouseDown={() => setPanel(null)}>
          {panel === 'navigate' ? (
            <section className="settings-dialog navigator-dialog" role="dialog" aria-modal="true" aria-labelledby="navigator-title" onMouseDown={(event) => event.stopPropagation()}>
              <div className="dialog-heading">
                <div>
                  <p className="eyebrow">Find your place</p>
                  <h1 id="navigator-title">Go to a passage.</h1>
                </div>
                <button type="button" className="close-button" onClick={() => setPanel(null)} aria-label="Close passage navigator">×</button>
              </div>

              <div className="reference-search">
                <SearchIcon />
                <input ref={searchInputRef} name="reference" value={referenceQuery} onChange={(event) => setReferenceQuery(event.target.value)} onKeyDown={(event) => {
                  if (event.key === 'Enter' && parsedReference) goTo(parsedReference)
                }} placeholder="Type a reference, such as John 3:16" aria-label="Bible reference" autoComplete="off" />
                {referenceQuery && <button type="button" onClick={() => setReferenceQuery('')} aria-label="Clear reference">×</button>}
              </div>

              {referenceQuery && (
                <div className="reference-result" aria-live="polite">
                  {parsedReference ? (
                    <button type="button" onClick={() => goTo(parsedReference)}>
                      <span>Go to</span>
                      <strong>{getReference(bible, parsedReference)}</strong>
                      <ArrowDownIcon />
                    </button>
                  ) : <p>Enter a complete reference with a valid book, chapter, and verse.</p>}
                </div>
              )}

              <div className="browse-heading"><span>Or browse</span></div>
              <div className="passage-selectors three-up">
                <label>
                  <span>Book</span>
                  <select name="book" value={draftPosition.book} onChange={(event) => setDraftPosition({ book: Number(event.target.value), chapter: 0, verse: 0 })}>
                    {bible.books.map((item, index) => <option value={index} key={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Chapter</span>
                  <select name="chapter" value={draftPosition.chapter} onChange={(event) => setDraftPosition({ ...draftPosition, chapter: Number(event.target.value), verse: 0 })}>
                    {draftBook.chapters.map((item, index) => <option value={index} key={item.number}>{item.number}</option>)}
                  </select>
                </label>
                <label>
                  <span>Verse</span>
                  <select name="verse" value={draftPosition.verse} onChange={(event) => setDraftPosition({ ...draftPosition, verse: Number(event.target.value) })}>
                    {draftChapter.verses.map((item, index) => <option value={index} key={item.number}>{item.number}</option>)}
                  </select>
                </label>
              </div>
              <button type="button" className="primary-button" onClick={() => goTo(draftPosition)}>Go to {getReference(bible, draftPosition)}</button>

              <section className="saved-places-section" aria-labelledby="saved-places-title">
                <div className="saved-places-heading">
                  <div>
                    <h2 id="saved-places-title">Saved places</h2>
                    <p>Your current place is always saved automatically.</p>
                  </div>
                  <span>{savedPlaces.length}</span>
                </div>
                {savedPlaces.length ? (
                  <div className="saved-places-list">
                    {savedPlaces.map((place) => {
                      const savedBook = bible.books[place.position.book]
                      const savedChapter = savedBook.chapters[place.position.chapter]
                      const savedVerse = savedChapter.verses[place.position.verse]
                      return (
                        <div className="saved-place" key={place.id}>
                          <button type="button" className="saved-place-link" onClick={() => goTo(place.position)}>
                            <strong>{getReference(bible, place.position)}</strong>
                            <span>{savedVerse.text}</span>
                          </button>
                          <button type="button" className="remove-place" onClick={() => removeSavedPlace(place.id)} aria-label={`Remove bookmark for ${getReference(bible, place.position)}`}><TrashIcon /></button>
                        </div>
                      )
                    })}
                  </div>
                ) : <p className="empty-saved-places">Use the bookmark in the reader to keep passages here.</p>}
              </section>
            </section>
          ) : (
            <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
              <div className="dialog-heading">
                <div>
                  <p className="eyebrow">Writing setup</p>
                  <h1 id="settings-title">Make it comfortable.</h1>
                </div>
                <button type="button" className="close-button" onClick={() => setPanel(null)} aria-label="Close settings">×</button>
              </div>

              <div className="settings-group">
                <div className="setting-copy">
                  <h2>Writing hand</h2>
                  <p>The main control moves to your free hand.</p>
                </div>
                <div className="segmented-control" role="group" aria-label="Writing hand">
                  <button type="button" className={handedness === 'right' ? 'selected' : ''} onClick={() => setHandedness('right')}>Right</button>
                  <button type="button" className={handedness === 'left' ? 'selected' : ''} onClick={() => setHandedness('left')}>Left</button>
                </div>
              </div>

              <div className="settings-group">
                <div className="setting-copy">
                  <h2>Scripture size</h2>
                  <p>Make the text comfortable at arm’s length.</p>
                </div>
                <div className="font-control" role="group" aria-label="Scripture size">
                  <button type="button" onClick={() => setFontSize(Math.max(26, fontSize - 2))} aria-label="Decrease Scripture size">A</button>
                  <strong>{fontSize}</strong>
                  <button type="button" onClick={() => setFontSize(Math.min(52, fontSize + 2))} aria-label="Increase Scripture size">A</button>
                </div>
              </div>

              <div className="settings-group">
                <div className="setting-copy">
                  <h2>Appearance</h2>
                  <p>Use a crisp light page or a deep-ink reading surface.</p>
                </div>
                <div className="segmented-control" role="group" aria-label="Appearance">
                  <button type="button" className={theme === 'paper' ? 'selected' : ''} onClick={() => setTheme('paper')}>Paper</button>
                  <button type="button" className={theme === 'night' ? 'selected' : ''} onClick={() => setTheme('night')}>Night</button>
                </div>
              </div>

              <div className="dialog-note">
                <p><strong>Keyboard controls</strong></p>
                <p>Space or arrows move through verses. Press G to go to a passage. Press B to bookmark.</p>
              </div>
              <button type="button" className="primary-button" onClick={() => setPanel(null)}>Return to writing</button>
              <p className="copyright-note">{bible.translation.notice} <a href={bible.translation.source} target="_blank" rel="noreferrer">Translation source</a></p>
            </section>
          )}
        </div>
      )}
    </main>
  )
}

export default App
