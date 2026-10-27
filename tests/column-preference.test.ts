import test from 'node:test'
import assert from 'node:assert/strict'
import { isValidColumnPreference, readColumnPreference, serializeColumnPreference } from '../src/utils/columnPreference.ts'

test('column preference isolates supported columns and preserves required columns', () => {
  const defaults = ['user', 'phone']
  assert.deepEqual(readColumnPreference('{"version":1,"visible":["phone","removed","phone"]}', ['user', 'phone'], ['user'], defaults), ['phone', 'user'])
  assert.deepEqual(readColumnPreference('{bad', ['user', 'phone'], ['user'], defaults), defaults)
  assert.equal(serializeColumnPreference(['user']), '{"version":1,"visible":["user"]}')
})

test('column preference recovers corrupt values and adds only new default columns', () => {
  const allowed = ['user', 'phone', 'status']
  const defaults = ['user', 'phone', 'status']
  assert.equal(isValidColumnPreference('{bad'), false)
  assert.equal(isValidColumnPreference('{"version":1,"visible":["user"]}'), true)
  assert.deepEqual(
    readColumnPreference('{"version":1,"visible":["user"],"known":["user","phone"]}', allowed, ['user'], defaults),
    ['user', 'status'],
  )
})
