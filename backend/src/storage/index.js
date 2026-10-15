/*
 * Where uploaded files live.
 *   STORAGE_DRIVER=s3     AWS S3 bucket (S3_BUCKET, default "trust-space"). The bucket can stay private:
 *                         files are read through short-lived signed URLs.
 *   STORAGE_DRIVER=local  backend/uploads on disk (development / tests).
 *
 * Every driver has: kind, label, put({ key, body, type, name }), readUrl(key), localPath(key), remove(key), check().
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { ApiError } from '../utils/ApiError.js'
import { env } from '../config/env.js'

/** AWS errors → messages a person can act on. */
function s3Error(e, bucket, action) {
  const name = e?.name || e?.Code || ''
  if (name === 'NoSuchBucket' || (e?.$metadata?.httpStatusCode === 404 && action === 'check'))
    return new ApiError(502, `The S3 bucket “${bucket}” was not found. Check S3_BUCKET and AWS_REGION in the backend settings.`, { code: 'storage_unavailable' })
  if (name === 'AccessDenied' || name === 'Forbidden' || e?.$metadata?.httpStatusCode === 403)
    return new ApiError(502, `TruSpace is not allowed to ${action} files in the S3 bucket “${bucket}”. Check the AWS access keys and the bucket permissions.`, { code: 'storage_unavailable' })
  if (name === 'CredentialsProviderError' || /credential/i.test(e?.message || ''))
    return new ApiError(502, 'AWS credentials are missing or invalid, so files cannot be stored in S3. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in the backend settings.', { code: 'storage_unavailable' })
  return new ApiError(502, `File storage (S3) could not ${action} the file right now. Please try again in a moment.`, { code: 'storage_unavailable' })
}

export function createS3Storage({ bucket = env.s3.bucket, region = env.s3.region, urlExpires = env.s3.urlExpires, client } = {}) {
  const s3 = client || new S3Client({
    region,
    ...(env.s3.endpoint ? { endpoint: env.s3.endpoint, forcePathStyle: true } : {}),
    ...(env.s3.accessKeyId ? { credentials: { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey } } : {}),
  })
  return {
    kind: 's3', label: `S3 bucket “${bucket}”`, bucket,
    async put({ key, body, type, name }) {
      try {
        await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: type, ContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(name)}` }))
      } catch (e) { throw s3Error(e, bucket, 'save') }
    },
    async readUrl(key) {
      try { return await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: urlExpires }) }
      catch (e) { throw s3Error(e, bucket, 'read') }
    },
    localPath: () => null,
    async remove(key) {
      try { await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })) }
      catch (e) { throw s3Error(e, bucket, 'delete') }
    },
    async check() {
      try { await s3.send(new HeadBucketCommand({ Bucket: bucket })); return { ok: true } }
      catch (e) { return { ok: false, message: s3Error(e, bucket, 'check').message } }
    },
  }
}

export function createLocalStorage({ dir = env.uploadDir } = {}) {
  const full = key => path.join(dir, ...key.split('/'))
  return {
    kind: 'local', label: 'local disk',
    async put({ key, body }) { await fs.mkdir(path.dirname(full(key)), { recursive: true }); await fs.writeFile(full(key), body) },
    readUrl: async () => null,
    localPath: key => full(key),
    async remove(key) { await fs.rm(full(key), { force: true }) },
    async check() { return { ok: true } },
  }
}

let current = null
/** The active storage (chosen by STORAGE_DRIVER). */
export function storage() {
  if (!current) current = env.storageDriver === 's3' ? createS3Storage() : createLocalStorage()
  return current
}
/** Swap the storage (tests). */
export function setStorage(s) { current = s }
