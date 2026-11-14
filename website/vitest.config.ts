import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins:[react()],
  resolve:{alias:{'@shared':resolve('src/shared'),'@renderer':resolve('src/renderer')}},
  test:{environment:'node',environmentMatchGlobs:[['src/renderer/**','jsdom'],['tests/**/*.test.tsx','jsdom']],setupFiles:['src/renderer/vitest.setup.ts'],
    include:['tests/**/*.test.{ts,tsx}','src/shared/**/*.test.ts','src/server/library/**/*.test.ts','src/server/db/repositories/**/*.test.ts','src/server/metadata/{cache,httpClient,rateLimit,searchService,tmdbMapper,tmdbProvider,anilistProvider}.test.ts','src/renderer/**/*.test.{ts,tsx}'],
    // The desktop's password/recovery screens are replaced by hosted sign-in.
    exclude:['src/renderer/auth/loginFlow.test.tsx','src/server/library/backfillOriginalTitles.test.ts']}
})
