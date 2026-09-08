export type ImportedBible = {translation:{id:string;name:string;source:string;notice:string};books:{id:string;name:string;chapters:{number:number;verses:{number:number;text:string}[]}[]}[]}
const KEY='scripture-scribe-import-v1'
export function importInfo(): {id:string;name:string}|null {try {const v=JSON.parse(localStorage.getItem(KEY)||'null');return v && /^LOCAL_[a-f0-9]{64}$/.test(v.id) && typeof v.name==='string' ? v : null} catch{return null}}
function database():Promise<IDBDatabase> {return new Promise((resolve,reject)=>{const r=indexedDB.open('scripture-scribe-private-import',1);r.onupgradeneeded=()=>r.result.createObjectStore('bibles');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export async function readImport(id:string):Promise<ImportedBible> {const db=await database();try{return await new Promise((resolve,reject)=>{const r=db.transaction('bibles').objectStore('bibles').get(id);r.onsuccess=()=>r.result?resolve(r.result):reject(new Error('Imported text is unavailable. Import the file again.'));r.onerror=()=>reject(r.error)})}finally{db.close()}}
export async function storeImport(file:File):Promise<{id:string;name:string}> {
 if(file.size>12*1024*1024)throw new Error('Choose a JSON file smaller than 12 MB.')
 const text=await file.text();let value;try{value=JSON.parse(text)}catch{throw new Error('This is not valid JSON. Use the example format below.')}
 const fail=()=>{throw new Error('Invalid Bible structure. Use unique book IDs, ordered chapter/verse numbers, and nonempty text. See the example format.')}
 const short=(s:unknown,max:number):s is string=>typeof s==='string' && s.trim().length>0 && s.length<=max
 if(!short(value?.translation?.name,100)||!Array.isArray(value.books)||!value.books.length||value.books.length>100)fail()
 const ids=new Set();let total=0
 const books=value.books.map((book:any)=>{
  if(!short(book?.id,3)||!/^([A-Z0-9]{3})$/.test(book.id)||ids.has(book.id)||!short(book.name,80)||!Array.isArray(book.chapters)||!book.chapters.length||book.chapters.length>200)fail();ids.add(book.id)
  let lastChapter=0
  return {id:book.id,name:book.name,chapters:book.chapters.map((chapter:any)=>{
   if(!Number.isInteger(chapter?.number)||chapter.number<=lastChapter||chapter.number>200||!Array.isArray(chapter.verses)||!chapter.verses.length||chapter.verses.length>200)fail();lastChapter=chapter.number
   let lastVerse=0
   return {number:chapter.number,verses:chapter.verses.map((verse:any)=>{if(!Number.isInteger(verse?.number)||verse.number<=lastVerse||verse.number>300||!short(verse.text,20000))fail();lastVerse=verse.number;if(++total>50000)fail();return {number:verse.number,text:verse.text}})}
  })}
 })
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));const id='LOCAL_'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('')
 const bible:ImportedBible={translation:{id,name:value.translation.name,source:'',notice:'Personal import. Stored only in this browser; not uploaded or shared.'},books}
 const db=await database();try {await new Promise<void>((resolve,reject)=>{const tx=db.transaction('bibles','readwrite');tx.objectStore('bibles').put(bible,id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{db.close()}
 const info={id,name:bible.translation.name};localStorage.setItem(KEY,JSON.stringify(info));return info
}
