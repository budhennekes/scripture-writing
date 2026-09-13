import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
export function BookChapters({open,id,children}:{open:boolean;id:string;children:ReactNode}) {
  const ref = useRef<HTMLDivElement>(null)
  const interruptedHeight = useRef<number | null>(null)
  const [mounted,setMounted] = useState(open)
  if (open && !mounted) setMounted(true)
  useLayoutEffect(() => {
    const node=ref.current
    if (!node) return
    if (reduced()) {
      if (!open) { const timer=setTimeout(() => setMounted(false),0); return () => clearTimeout(timer) }
      return
    }
    const fromHeight=interruptedHeight.current ?? (open ? 0 : node.getBoundingClientRect().height)
    const animation=node.animate([{height:`${fromHeight}px`,opacity:open?0:1},{height:open?`${node.scrollHeight}px`:'0px',opacity:open?1:0}], {duration:open?220:150,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'})
    animation.onfinish=()=>{ if (!open) setMounted(false); else animation.cancel() }
    return ()=>{ interruptedHeight.current=node.getBoundingClientRect().height; animation.cancel() }
  },[open,mounted])
  return mounted ? <div ref={ref} className="chapter-browser" id={id} inert={!open} aria-hidden={!open || undefined} style={{overflow:'hidden'}}>{children}</div> : null
}
