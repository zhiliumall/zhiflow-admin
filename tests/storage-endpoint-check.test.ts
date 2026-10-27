import test from 'node:test'
import assert from 'node:assert/strict'
import { checkStorageEndpoint } from '../src/views/upms/configstorage/endpointCheck.ts'

test('非 MinIO（本地存储）不校验 Endpoint 格式', () => {
  assert.deepEqual(checkStorageEndpoint('1', 'files.example.com'), {})
  assert.deepEqual(checkStorageEndpoint('2', 'http://s3:9000'), {})
})

test('MinIO：容器名 / 内网地址 / 缺协议 → 阻断', () => {
  for (const ep of ['http://s3:9000/', 'http://minio:9000', 'http://localhost:9000', 'http://127.0.0.1:9000',
    'http://10.0.0.5:9000', 'http://172.20.1.2:9000', 'http://192.168.1.10:9000', 's3.example.com']) {
    assert.ok(checkStorageEndpoint('3', ep).error, ep)
  }
})

test('MinIO：公网 https 通过；公网 http 只提示不阻断', () => {
  assert.deepEqual(checkStorageEndpoint('3', 'https://s3.example.com/'), {})
  assert.deepEqual(checkStorageEndpoint(3, 'https://s3.example.com:9000'), {})
  const r = checkStorageEndpoint('3', 'http://s3.example.com')
  assert.equal(r.error, undefined)
  assert.ok(r.warn)
  assert.ok(checkStorageEndpoint('3', 'http://172.32.0.1:9000').warn, '172.32 不在私网段')
})
