import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma client with connection pool configuration
 * 
 * Pool settings via DATABASE_URL connection string:
 * - connection_limit: Max connections (default: 10)
 * - pool_timeout: Connection acquire timeout in seconds (default: 30)
 * - idle_timeout: Idle connection timeout in seconds (default: 60)
 * 
 * Example: postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=30&idle_timeout=60
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Check database connection health
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

/**
 * Initialize database connection pool with warmup
 * Call this on application startup in production
 */
export async function initializeDatabasePool(): Promise<void> {
  try {
    // Warm up connection pool with a simple query
    await prisma.$connect();
    
    // Verify connection
    await prisma.$queryRaw`SELECT 1`;
    
    console.log('✅ Database connection pool initialized and warmed up');
  } catch (error) {
    console.error('❌ Database pool initialization failed:', error);
    throw new Error(`Failed to initialize database pool: ${error}`);
  }
}

/**
 * Gracefully shutdown database connections
 * Call this on application termination
 */
export async function shutdownDatabasePool(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('✅ Database connections closed gracefully');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
}

/**
 * Execute a function with a dedicated transaction
 * Automatically handles commit/rollback
 */
export async function withTransaction<T>(
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn);
}

export default prisma;
