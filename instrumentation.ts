/**
 * Next.js Instrumentation
 * Runs on server startup - perfect for database pool initialization
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { initializeDatabasePool, shutdownDatabasePool } from '@/lib/db'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize database connection pool on server startup
    await initializeDatabasePool()
    
    // Graceful shutdown on process termination
    process.on('beforeExit', async () => {
      await shutdownDatabasePool()
    })
    
    process.on('SIGTERM', async () => {
      await shutdownDatabasePool()
      process.exit(0)
    })
    
    process.on('SIGINT', async () => {
      await shutdownDatabasePool()
      process.exit(0)
    })
  }
}
