/**
 * Finds (and optionally deletes) files in object storage that nothing in the
 * database references any more.
 *
 * The admin's "Remove" button only clears the field — it never deleted the
 * underlying file — so every image ever replaced is still taking up space.
 *
 * Matching is deliberately conservative: a file is treated as USED if its key
 * appears anywhere in the concatenated text of every column that can hold an
 * image, including raw HTML bodies and JSON settings blobs. A substring hit is
 * enough. That can keep a file that is genuinely dead, but it will not delete
 * one that is alive — the right way round for an irreversible operation.
 *
 *   node scripts/media-cleanup.mjs              # dry run, deletes nothing
 *   node scripts/media-cleanup.mjs --delete     # back up locally, then delete
 */
import { S3Client, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { PrismaClient } from '@prisma/client'
import { mkdirSync, createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import 'dotenv/config'

const DELETE = process.argv.includes('--delete')
const BACKUP_DIR = 'scratch/media-backup'

const prisma = new PrismaClient()
const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
})
const Bucket = process.env.MINIO_BUCKET_NAME

// ─── 1. Every object in the bucket ───────────────────────────────────────────
const objects = []
let token
do {
  const res = await s3.send(new ListObjectsV2Command({ Bucket, ContinuationToken: token }))
  for (const o of res.Contents ?? []) objects.push({ Key: o.Key, Size: o.Size ?? 0 })
  token = res.NextContinuationToken
} while (token)

// ─── 2. Every string in the DB that could name a file ────────────────────────
// Selected column-by-column from the schema rather than dumping whole rows, so
// adding a table without an image column can't silently change the result.
const sources = [
  ['Setting',        () => prisma.setting.findMany({ select: { value: true } })],
  ['Banner',         () => prisma.banner.findMany({ select: { image: true } })],
  ['Brand',          () => prisma.brand.findMany({ select: { image: true } })],
  ['Category',       () => prisma.category.findMany({ select: { image: true, bannerImage: true } })],
  ['Color',          () => prisma.color.findMany({ select: { image: true } })],
  ['JournalPost',    () => prisma.journalPost.findMany({ select: { content: true, coverImage: true } })],
  ['MenuItem',       () => prisma.menuItem.findMany({ select: { url: true, imageUrl: true } })],
  ['Page',           () => prisma.page.findMany({ select: { content: true } })],
  ['Product',        () => prisma.product.findMany({ select: { thumbnail: true } })],
  ['ProductImage',   () => prisma.productImage.findMany({ select: { url: true } })],
  ['ProductVariant', () => prisma.productVariant.findMany({ select: { image: true, images: true } })],
]

let haystack = ''
console.log('Scanning database references:')
for (const [name, load] of sources) {
  let rows = []
  try {
    rows = await load()
  } catch (e) {
    // A missing table would silently shrink the reference set and put live
    // files at risk, so refuse to continue rather than under-report.
    console.error(`  ${name}: FAILED — ${e.message.split('\n')[0]}`)
    console.error('\nAborting: cannot verify what is in use.')
    process.exit(1)
  }
  const text = rows.map(r => Object.values(r).map(v =>
    v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v)).join(' ')).join(' ')
  haystack += ' ' + text
  console.log(`  ${name.padEnd(15)} ${String(rows.length).padStart(5)} rows, ${String(text.length).padStart(8)} chars`)
}

// ─── 3. Anything not mentioned is an orphan ──────────────────────────────────
const used = []
const orphans = []
for (const o of objects) (haystack.includes(o.Key) ? used : orphans).push(o)

const mb = (n) => (n / 1048576).toFixed(1)
const orphanBytes = orphans.reduce((n, o) => n + o.Size, 0)
const totalBytes = objects.reduce((n, o) => n + o.Size, 0)

console.log(`\n${'─'.repeat(64)}`)
console.log(`bucket total : ${objects.length} files, ${mb(totalBytes)} MB`)
console.log(`still in use : ${used.length} files`)
console.log(`ORPHANED     : ${orphans.length} files, ${mb(orphanBytes)} MB`)
console.log('─'.repeat(64))

if (orphans.length) {
  console.log('\nOrphaned files:')
  orphans
    .slice()
    .sort((a, b) => b.Size - a.Size)
    .forEach(o => console.log(`  ${mb(o.Size).padStart(7)} MB  ${o.Key}`))
}

if (!DELETE) {
  console.log('\nDRY RUN — nothing deleted. Re-run with --delete to remove them.')
  await prisma.$disconnect()
  process.exit(0)
}

// ─── 4. Back up, then delete ─────────────────────────────────────────────────
// Object storage has no undo, so every file is copied to disk first. If the
// reference scan was wrong about even one file, it can be put back.
mkdirSync(BACKUP_DIR, { recursive: true })
console.log(`\nBacking up ${orphans.length} files to ${BACKUP_DIR}/ before deleting…`)

let done = 0
for (const o of orphans) {
  const safe = o.Key.replace(/[\\/:*?"<>|]/g, '_')
  const res = await s3.send(new GetObjectCommand({ Bucket, Key: o.Key }))
  await pipeline(res.Body, createWriteStream(`${BACKUP_DIR}/${safe}`))
  await s3.send(new DeleteObjectCommand({ Bucket, Key: o.Key }))
  done++
  if (done % 20 === 0) console.log(`  ${done}/${orphans.length}`)
}

console.log(`\nDeleted ${done} files, freed ${mb(orphanBytes)} MB.`)
console.log(`Backups kept in ${BACKUP_DIR}/ — delete that folder once you're happy.`)
await prisma.$disconnect()
