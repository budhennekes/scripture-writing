import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import './redesign.css'
import './writing-page.css'
import './landscape.css'
import './handwriting.css'
import './chapel.css'

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
type Theme = 'paper' | 'gray' | 'sage' | 'night'
const BACKGROUNDS: { value: Theme; label: string }[] = [
  { value: 'paper', label: 'White' }, { value: 'gray', label: 'Soft gray' },
  { value: 'sage', label: 'Pale sage' }, { value: 'night', label: 'Night' },
]
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
        versesPerView?: number
        shortcutHintDismissed?: boolean
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
  const writingFullscreen = useRef(false)
  const previousButtonRef = useRef<HTMLButtonElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const bookmarkButtonRef = useRef<HTMLButtonElement>(null)
  const bookmarkPending = useRef(false)
  const [previousHeight, setPreviousHeight] = useState(0)
  const [lineGuide, setLineGuide] = useState(false)
  const [guideHeight, setGuideHeight] = useState(54)
  const [guideTop, setGuideTop] = useState<number | null>(null)
  const [bible, setBible] = useState<Bible | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [position, setPosition] = useState<Position>(saved.position ?? DEFAULT_POSITION)
  const [randomReturn, setRandomReturn] = useState<Position | null>(null)
  const [draftPosition, setDraftPosition] = useState<Position>(saved.position ?? DEFAULT_POSITION)
  const [handedness, setHandedness] = useState<Handedness>(saved.handedness ?? 'right')
  const [versesPerView, setVersesPerView] = useState<1 | 2>(saved.versesPerView === 2 ? 2 : 1)
  const [shortcutHintDismissed, setShortcutHintDismissed] = useState(Boolean(saved.shortcutHintDismissed))
  const [fontSize, setFontSize] = useState(saved.fontSize ?? 36)
  const [theme, setTheme] = useState<Theme>(BACKGROUNDS.some(option => option.value === saved.theme) ? saved.theme : 'paper')
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
        setRandomReturn(null)
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
    const savedPosition = randomReturn ?? position
    carryPosition.current = canonical(bible, savedPosition)
    library.current = { translation, translations: { ...library.current.translations, [translation]: {
      position: canonical(bible, savedPosition), savedPlaces: savedPlaces.map(place => ({ ...place, position: canonical(bible, place.position) })),
    } } }
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(library.current))
      // Keep old WEB data intact and old global settings compatible.
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadSavedState(), handedness, fontSize, theme, versesPerView, shortcutHintDismissed,
        ...(translation === 'WEB' ? { position: savedPosition, savedPlaces } : {}),
      }))
      setSaveError(false)
      if (bookmarkPending.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        bookmarkButtonRef.current?.querySelector('svg')?.animate([
          { transform: 'translateY(-3px)' }, { transform: 'translateY(1px)', offset: 0.7 }, { transform: 'none' },
        ], { duration: 200, easing: 'ease-out' })
      }
    } catch { setSaveError(true) }
    bookmarkPending.current = false
  }, [bible, translation, position, handedness, fontSize, theme, savedPlaces, saved, versesPerView, shortcutHintDismissed, randomReturn])

  useEffect(() => { setGuideTop(null) }, [position, fontSize, translation])
  useEffect(() => {
    const clear = () => setGuideTop(null)
    window.addEventListener('resize', clear)
    return () => window.removeEventListener('resize', clear)
  }, [])

  useEffect(() => {
    activeVerseRef.current?.scrollIntoView({ behavior: 'instant', block: 'nearest' })
  }, [position])

  const restoreReaderFocus = useCallback(() => activeVerseRef.current?.focus({ preventScroll: true }), [])

  useEffect(() => {
    if (panel) {
      const timer = window.setTimeout(() => {
        if (panel === 'navigate') searchInputRef.current?.focus()
        else document.querySelector<HTMLButtonElement>('[aria-label="Close settings"]')?.focus()
      }, 80)
      return () => { window.clearTimeout(timer); requestAnimationFrame(restoreReaderFocus) }
    }
  }, [panel, restoreReaderFocus])

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
        const currentChapter = bible.books[current.book].chapters[current.chapter]
        const previousChapter = current.chapter > 0 ? bible.books[current.book].chapters[current.chapter - 1] : current.book > 0 ? bible.books[current.book - 1].chapters.at(-1) : undefined
        const steps = direction === 1 ? Math.min(versesPerView, currentChapter.verses.length - current.verse) : current.verse > 0 ? Math.min(versesPerView, current.verse) : previousChapter ? (previousChapter.verses.length % versesPerView || versesPerView) : 1
        for (let step = 0; step < steps; step++) {
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
        }
        return next
      })
    },
    [bible, ensureWakeLock, versesPerView],
  )

  const openNavigator = useCallback(() => {
    setDraftPosition(position)
    setReferenceQuery('')
    setPanel('navigate')
  }, [position])

  const toggleBookmark = useCallback(() => {
    const existing = savedPlaces.find(place => samePosition(place.position, position))
    bookmarkPending.current = !existing
    setSavedPlaces(places => existing
      ? places.filter(place => place.id !== existing.id)
      : [{ id: crypto.randomUUID(), position: { ...position }, savedAt: Date.now() }, ...places])
  }, [savedPlaces, position])

  const keyboardMove = useCallback((direction: 1 | -1) => {
    const button = direction === 1 ? nextButtonRef.current : previousButtonRef.current
    if (button?.disabled) return
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      button?.getAnimations().forEach(animation => animation.cancel())
      button?.animate([{ transform: 'translateY(2px) scale(.98)' }, { transform: 'none' }], { duration: 160, easing: 'ease-out' })
    }
    move(direction)
  }, [move])

  const exitWriting = useCallback(() => {
    setFocusWriting(false)
    if (writingFullscreen.current && document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    writingFullscreen.current = false
    activeVerseRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const changed = () => {
      if (writingFullscreen.current && !document.fullscreenElement) {
        writingFullscreen.current = false
        setFocusWriting(false)
        activeVerseRef.current?.focus({ preventScroll: true })
      }
    }
    document.addEventListener('fullscreenchange', changed)
    return () => document.removeEventListener('fullscreenchange', changed)
  }, [])

  const enterWriting = () => {
    setPreviousHeight(activeVerseRef.current?.previousElementSibling?.getBoundingClientRect().height ?? 0)
    setFocusWriting(true)
    setPanel(null)
    void ensureWakeLock()
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      writingFullscreen.current = true
      void document.documentElement.requestFullscreen().catch(() => {
        writingFullscreen.current = false // Keep the full-viewport fallback usable.
      })
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || (event.shiftKey && event.key !== 'Tab') || event.repeat) return
      if (event.key === 'Escape') {
        setPanel(null)
        if (!panel) exitWriting()
        return
      }
      if (panel && event.key === 'Tab') {
        const controls = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] button, [role="dialog"] input, [role="dialog"] select, [role="dialog"] a')).filter(e => !e.hasAttribute('disabled') && e.offsetParent !== null)
        const first = controls[0], last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
        return
      }
      const target = event.target as HTMLElement
      if (target.closest('select, input, textarea') || target.isContentEditable || panel) return
      // Native keyboard activation stays intact; arrows work on toolbar buttons.
      if (target.closest('button, a') && [' ', 'Enter'].includes(event.key)) return
      if (event.key.toLowerCase() === 'g') {
        event.preventDefault()
        openNavigator()
        return
      }
      if (event.key.toLowerCase() === 'b') {
        event.preventDefault()
        toggleBookmark()
        return
      }
      if (event.key.toLowerCase() === 'd' || [' ', 'ArrowRight', 'ArrowDown', 'PageDown', 'Enter'].includes(event.key)) {
        event.preventDefault()
        keyboardMove(1)
      }
      if (event.key.toLowerCase() === 'a' || ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(event.key)) {
        event.preventDefault()
        keyboardMove(-1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [keyboardMove, openNavigator, panel, toggleBookmark, exitWriting])

  if (loadError) {
    return (
      <main className="status-screen">
        <p className="wordmark">Scripture, by hand</p>
        <h1>The Bible text could not load.</h1>
        <p>Refresh the page to try again, or return to WEB.</p><button onClick={() => setTranslation('WEB')}>Use WEB</button>
      </main>
    )
  }

  if (!bible) {
    return (
      <main className="status-screen" aria-live="polite">
        <p className="wordmark">Scripture, by hand</p>
        <div className="loading-mark" aria-hidden="true">S</div>
        <p>Preparing your place.</p>
      </main>
    )
  }

  const book = bible.books[position.book]
  const chapter = book.chapters[position.chapter]
  const currentVerse = chapter.verses[position.verse]
  const visibleVerses = chapter.verses.slice(position.verse, position.verse + versesPerView)
  const lastVerseNumber = chapter.verses[chapter.verses.length - 1].number
  const chapterProgress = (currentVerse.number / lastVerseNumber) * 100
  const controlsOnLeft = handedness === 'right'
  const atStart = position.book === 0 && position.chapter === 0 && position.verse === 0
  const finalBook = bible.books.length - 1
  const finalChapter = bible.books[finalBook].chapters.length - 1
  const finalVerse = bible.books[finalBook].chapters[finalChapter].verses.length - 1
  const atEnd = position.book === finalBook && position.chapter === finalChapter && position.verse + visibleVerses.length - 1 === finalVerse
  const currentBookmark = savedPlaces.find((place) => samePosition(place.position, position))
  const parsedReference = referenceQuery ? resolveReference(referenceQuery, bible) : null
  const draftBook = bible.books[draftPosition.book]
  const draftChapter = draftBook.chapters[draftPosition.chapter]

  const goTo = (nextPosition: Position) => {
    setRandomReturn(null)
    setPosition(nextPosition)
    setDraftPosition(nextPosition)
    setReferenceQuery('')
    setPanel(null)
  }

  const randomVerse = () => {
    const choices: Position[] = []
    bible.books.forEach((book, bi) => book.chapters.forEach((chapter, ci) => chapter.verses.forEach((_, vi) => {
      const candidate = { book: bi, chapter: ci, verse: vi }
      if (!samePosition(candidate, position)) choices.push(candidate)
    })))
    const next = choices[Math.floor(Math.random() * choices.length)]
    if (!next) return
    setRandomReturn(randomReturn ?? position)
    setPosition(next)
    setDraftPosition(next)
    setPanel(null)
  }

  const removeSavedPlace = (id: string) => {
    setSavedPlaces((places) => places.filter((place) => place.id !== id))
  }

  return (
    <main onClick={event => {
      // Pointer toolbar actions hand Space back to reading; Tab/Space remain native.
      if (event.detail > 0 && (event.target as HTMLElement).closest('.writing-tools button, .topbar button, .rail-button, .page-ribbon')) {
        activeVerseRef.current?.focus({ preventScroll: true })
      }
    }} className={`app-shell ${controlsOnLeft ? 'controls-left' : 'controls-right'} ${focusWriting ? 'focus-writing' : ''}`}>
      <div className="landscape-scene" aria-hidden="true"><img src={`${import.meta.env.BASE_URL}images/chapel-light.webp`} alt="" width="1672" height="941" /></div>
      <div className="room-identity" aria-hidden={focusWriting}><p>Scripture, by hand.</p></div>
      <aside className="control-rail" inert={Boolean(panel)} aria-label="Writing controls">
        <button ref={previousButtonRef} type="button" className="rail-button previous-button" onClick={() => move(-1)} disabled={atStart} aria-label={versesPerView === 2 ? 'Previous verses' : 'Previous verse'}>
          <ArrowUpIcon />
          <span>Back</span>
        </button>
        <button ref={nextButtonRef} type="button" className="rail-button next-button" onClick={() => move(1)} disabled={atEnd} aria-label={versesPerView === 2 ? 'Next verses' : 'Next verse'}>
          <span>Next</span>
          <ArrowDownIcon />
        </button>
      </aside>

      <section className="reader-panel" inert={Boolean(panel)}>
        <button ref={bookmarkButtonRef} type="button" className={`icon-button bookmark-button page-ribbon ${currentBookmark && !saveError ? 'selected' : ''}`} onClick={toggleBookmark} aria-label={currentBookmark ? 'Remove bookmark' : 'Save this verse'}>
          <BookmarkIcon filled={Boolean(currentBookmark && !saveError)} />
        </button>
        <div className="writing-tools">
          <span className="writing-reference"><button className="reference-picker" type="button" onClick={openNavigator} aria-haspopup="dialog" aria-label="Choose passage or translation">{getReference(bible, position)} · {translation === 'ASV1901' ? 'ASV' : translation}{randomReturn ? ' · Random' : ''}<ChevronDownIcon /></button></span>
          <button type="button" className="writing-mode-button" aria-pressed={focusWriting} onClick={focusWriting ? exitWriting : enterWriting}>{focusWriting ? 'Exit writing mode' : 'Enter writing mode'}</button>
          <button type="button" className="icon-button setup-button" onClick={() => setPanel('settings')} aria-label="Open settings"><SettingsIcon /></button>
          {positionNotice && <span role="status">{positionNotice}</span>}

        </div>
        <div className="scripture-wrap">
          <div className="chapter-label">
            <div className="chapter-kicker">{bible.translation.name} <span>Chapter {chapter.number}</span></div>
            <h1>{book.name}<span className="chapter-number">{String(chapter.number).padStart(2, '0')}</span></h1>
            <div className="chapter-caption"><span>Scripture, by hand.</span><span>Verse {currentVerse.number} of {lastVerseNumber}</span></div>
          </div>
          <div className="scripture" style={{ '--scripture-size': `${fontSize}px`, '--previous-height': `${previousHeight}px` } as React.CSSProperties}>

            {visibleVerses.map((verse) => {
              const isActive = verse.number === currentVerse.number
              return (
                <article tabIndex={isActive ? -1 : undefined} className={isActive ? 'verse active' : verse.number < currentVerse.number ? 'verse previous-context' : 'verse companion'} key={verse.number} ref={isActive ? activeVerseRef : undefined} aria-current={isActive ? 'true' : undefined}>
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
                      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.repeat || !lineGuide || !isActive || !['ArrowUp', 'ArrowDown'].includes(event.key)) return
                      event.preventDefault(); event.stopPropagation()
                      const height = parseFloat(getComputedStyle(event.currentTarget).lineHeight)
                      setGuideHeight(height)
                      const max = event.currentTarget.offsetHeight - height
                      setGuideTop(top => Math.max(0, Math.min(max, (top ?? 0) + (event.key === 'ArrowDown' ? height : -height))))
                    }}
                    data-line-marked={isActive && lineGuide && guideTop !== null ? true : undefined}
                    style={isActive && lineGuide && guideTop !== null ? { '--guide-top': `${guideTop}px`, '--guide-height': `${guideHeight}px` } as React.CSSProperties : undefined}
                  >{verse.text}</p>
                </article>
              )
            })}
          </div>
        </div>

        <footer className="reader-footer">
          <div className="chapter-position" role="progressbar" aria-label="Chapter position" aria-valuemin={1} aria-valuemax={lastVerseNumber} aria-valuenow={currentVerse.number} aria-valuetext={`${book.name} ${chapter.number} · Verse ${currentVerse.number} of ${lastVerseNumber}`}>
            <div className="chapter-position-line" aria-hidden="true"><span style={{ '--progress': `${chapterProgress}%` } as React.CSSProperties} /></div>
            <p>{book.name} {chapter.number} · Verse {currentVerse.number} of {lastVerseNumber}</p>
          </div>
          <p className="keyboard-hint">Space or arrow key to continue</p>
          <p className="saved-status" role={saveError ? 'alert' : undefined}><span aria-hidden="true" />{saveError ? 'Not saved — device storage unavailable' : 'Place saved on this device'}</p>
        </footer>
      </section>

      {!shortcutHintDismissed && !panel && <aside className="shortcut-coach" aria-label="Keyboard tip">
        <button type="button" aria-label="Dismiss keyboard tip" onClick={() => { setShortcutHintDismissed(true); requestAnimationFrame(restoreReaderFocus) }}>×</button>
        <p>Keep your writing hand on the page.</p>
        <div><kbd>{handedness === 'right' ? 'A' : '←'}</kbd> Back <kbd>{handedness === 'right' ? 'D' : '→'}</kbd> Next <span>Space works too.</span></div>
      </aside>}
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

              <label className="navigator-translation">Bible translation
                <select name="navigator-translation" value={translation} onChange={event => { setPanel(null); setTranslation(event.target.value) }}>
                  <option value="WEB">World English Bible</option>
                  <option value="BSB">Berean Standard Bible</option>
                  <option value="ASV1901">American Standard Version (1901)</option>
                </select>
              </label>
              <button type="button" className="restore-hint random-verse" onClick={randomVerse}>Write a random verse</button>
              {randomReturn ? <button type="button" className="restore-hint return-place" onClick={() => goTo(randomReturn)}>Return to saved place · {getReference(bible, randomReturn)}</button> : null}
              <p className="random-note">Random verses won’t replace your saved place. Reloading returns you to it.</p>
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
                    <p>Your place is saved automatically, except during random exploration.</p>
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
                  <h2>Background</h2>
                  <p>A comfortable reading surface, saved on this device.</p>
                </div>
                <div className="segmented-control background-options" role="group" aria-label="Background">
                  {BACKGROUNDS.map(option => <button key={option.value} type="button" aria-pressed={theme === option.value} className={theme === option.value ? 'selected' : ''} onClick={() => setTheme(option.value)}>{option.label}</button>)}
                </div>
              </div>

              <div className="settings-group"><div className="setting-copy"><h2>Line guide</h2><p>Mark the line you are copying.</p></div><button className="line-guide-button" type="button" aria-pressed={lineGuide} onClick={() => { setLineGuide(!lineGuide); setGuideTop(null) }}>Line guide</button></div>
              <div className="settings-group"><div className="setting-copy"><h2>Verses in view</h2><p>Next advances past the displayed verses.</p></div><div className="segmented-control" role="group" aria-label="Verses in view"><button type="button" className={versesPerView === 1 ? 'selected' : ''} aria-pressed={versesPerView === 1} onClick={() => setVersesPerView(1)}>One</button><button type="button" className={versesPerView === 2 ? 'selected' : ''} aria-pressed={versesPerView === 2} onClick={() => setVersesPerView(2)}>Two</button></div></div>
              <div className="dialog-note">
                <p><strong>Keyboard controls</strong></p>
                <p>A / D, Space, or arrows move through verses. Press G to go to a passage. Press B to bookmark.</p>
              </div>
              {shortcutHintDismissed && <button type="button" className="restore-hint" onClick={() => setShortcutHintDismissed(false)}>Show keyboard tip again</button>}
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
