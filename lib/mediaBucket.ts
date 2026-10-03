import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type _Object,
  type CommonPrefix,
} from "@aws-sdk/client-s3"
import { s3Client } from "@/lib/minio"
import { bucketMediaUrl } from "@/lib/utils"

/**
 * The admin Media Library, backed by the MinIO/S3 bucket — the same bucket
 * every product, banner and settings upload already lands in — instead of the
 * old `public/uploads` directory, which only ever held what was uploaded on
 * this one machine.
 *
 * S3 has no real directories: a "folder" is a key prefix ending in "/". A
 * folder created empty from the UI is kept alive by a zero-byte marker object
 * whose key is the prefix itself. Paths handed in by the browser are
 * normalised the same way lib/media's resolveMediaPath does (no "." / "..",
 * no empty segments), so a request can never address a key outside the bucket
 * root it means.
 */

export const MEDIA_BUCKET = process.env.MINIO_BUCKET_NAME || "fashion-store-bucket"

/** Normalise an untrusted relative path to "a/b/c" (no leading/trailing slash). */
export function normalizeRel(relative?: string | null) {
  return String(relative || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s && s !== "." && s !== "..")
    .join("/")
}

/** "a/b" → "a/b/", "" → "" — the listing prefix for a folder. */
export function folderPrefix(rel: string) {
  return rel ? `${rel}/` : ""
}

/** Public URL for an object key, each segment encoded so spaces etc. survive. */
export function keyUrl(key: string) {
  return bucketMediaUrl(key.split("/").map(encodeURIComponent).join("/"))
}

/** Every object/prefix under `prefix`, following pagination. */
async function listAll(prefix: string, delimiter?: string) {
  const objects: _Object[] = []
  const prefixes: CommonPrefix[] = []
  let token: string | undefined
  do {
    const page = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: MEDIA_BUCKET,
        Prefix: prefix,
        Delimiter: delimiter,
        ContinuationToken: token,
      })
    )
    objects.push(...(page.Contents ?? []))
    prefixes.push(...(page.CommonPrefixes ?? []))
    token = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (token)
  return { objects, prefixes }
}

/** One level of a folder: sub-folders (as prefixes) and the files directly in it. */
export async function listLevel(rel: string) {
  const prefix = folderPrefix(rel)
  const { objects, prefixes } = await listAll(prefix, "/")
  return {
    folders: prefixes.map((p) => p.Prefix!).filter(Boolean),
    // The folder's own marker object has key === prefix; it is not a file.
    files: objects.filter((o) => o.Key && o.Key !== prefix),
  }
}

/** Every object at or below a folder (markers included), for rename/delete. */
export async function listTree(rel: string) {
  return (await listAll(folderPrefix(rel))).objects
}

/** Immediate children of a folder, for the folder card subtitle. */
export async function countLevel(prefix: string) {
  const page = await s3Client.send(
    new ListObjectsV2Command({ Bucket: MEDIA_BUCKET, Prefix: prefix, Delimiter: "/", MaxKeys: 1000 })
  )
  const files = (page.Contents ?? []).filter((o) => o.Key !== prefix).length
  return files + (page.CommonPrefixes?.length ?? 0)
}

export async function objectExists(key: string) {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: MEDIA_BUCKET, Key: key }))
    return true
  } catch (e) {
    const status = (e as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode
    if (status === 404 || (e as { name?: string })?.name === "NotFound") return false
    throw e
  }
}

/** True when anything (an object or a marker) lives under the folder prefix. */
export async function folderExists(rel: string) {
  if (!rel) return true
  const page = await s3Client.send(
    new ListObjectsV2Command({ Bucket: MEDIA_BUCKET, Prefix: folderPrefix(rel), MaxKeys: 1 })
  )
  return (page.KeyCount ?? 0) > 0
}

/**
 * A key in `parentRel` for `desired` that is not taken yet, appending -1, -2…
 * Readable names are kept rather than hashed, which matters when a whole
 * folder is uploaded at once.
 */
export async function uniqueKey(parentRel: string, desired: string, isFile = true) {
  const dot = isFile ? desired.lastIndexOf(".") : -1
  const ext = dot > 0 ? desired.slice(dot) : ""
  const base = (dot > 0 ? desired.slice(0, dot) : desired) || "untitled"
  const exists = isFile
    ? (name: string) => objectExists(`${folderPrefix(parentRel)}${name}`)
    : (name: string) => folderExists(parentRel ? `${parentRel}/${name}` : name)

  let candidate = `${base}${ext}`
  for (let counter = 1; counter < 1000; counter++) {
    if (!(await exists(candidate))) return candidate
    candidate = `${base}-${counter}${ext}`
  }
  return `${base}-${Date.now()}${ext}`
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  await s3Client.send(
    new PutObjectCommand({ Bucket: MEDIA_BUCKET, Key: key, Body: body, ContentType: contentType })
  )
}

/** Zero-byte marker so an empty folder still shows up in listings. */
export async function createFolderMarker(rel: string) {
  await putObject(folderPrefix(rel), Buffer.alloc(0), "application/x-directory")
}

export async function copyObject(fromKey: string, toKey: string) {
  await s3Client.send(
    new CopyObjectCommand({
      Bucket: MEDIA_BUCKET,
      // CopySource is "<bucket>/<key>" and must be URL-encoded per segment.
      CopySource: `${MEDIA_BUCKET}/${fromKey.split("/").map(encodeURIComponent).join("/")}`,
      Key: toKey,
    })
  )
}

/** Delete keys in batches of 1000 (the S3 per-request limit). */
export async function deleteKeys(keys: string[]) {
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000)
    if (chunk.length === 0) continue
    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: MEDIA_BUCKET,
        Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
      })
    )
  }
}
