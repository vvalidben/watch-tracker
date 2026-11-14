import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// @testing-library/react's auto-cleanup relies on detecting a global
// `afterEach` (e.g. Jest's globals); this project deliberately doesn't
// enable vitest's `globals: true` (every test file imports from 'vitest'
// explicitly), so cleanup has to be wired up here instead — otherwise each
// test's rendered DOM leaks into the next one.
afterEach(() => {
  cleanup()
})
