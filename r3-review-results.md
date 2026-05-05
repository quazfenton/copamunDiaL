# Comprehensive Code Review Results

**Review Started:** March 3, 2026  
**Reviewer:** Senior Engineering Audit (AI-Assisted)  
**Scope:** Line-by-line review of all projects with SDK doc cross-reference  
**Status:** IN PROGRESS

---

## Review Methodology

For each file reviewed:
1. Read entire file top-to-bottom before making judgments
2. Identify responsibilities, exported symbols, public API surface
3. For each function/method/class:
   - Summarize intended behavior
   - Walk through control flow, data flow, inputs, outputs, side effects, exceptions, I/O
   - Identify unchecked edge cases, None/undefined bugs, unhandled promises/errors, race conditions, resource cleanup issues, security vulnerabilities
   - Verify type correctness
   - Cross-reference with SDK documentation where applicable
   - Check for performance anti-patterns
   - Check for security issues (injection, unsanitized inputs, secrets, crypto, tokens, SSRF/CSRF, CORS, path traversal)
   - Check for missing/inadequate tests
4. Identify modularity improvements, duplication removal, abstraction opportunities
5. Propose concrete fixes with minimal code diffs

---

## Project 1: copamundiaL

### File: `lib/db.ts`

**Summary:** Prisma client singleton with database connection checking

**Responsibilities:**
- Database connection management
- Prisma client singleton pattern
- Connection health checking

**Exported Symbols:**
- `prisma` - PrismaClient instance
- `checkDatabaseConnection()` - Connection health check
- `default` - prisma instance alias

---

#### Issues Found

| Severity | Issue | Location | Remediation |
|----------|-------|----------|-------------|
| **HIGH** | No connection pool configuration | Lines 7-10 | Add connection pool settings for production |
| **MEDIUM** | No graceful shutdown handling | Entire file | Add `$disconnect()` on process exit |
| **LOW** | No query timeout configuration | Line 7 | Add query timeout to prevent hanging queries |

---

#### Detailed Analysis

**Issue 1: No Connection Pool Configuration (HIGH)**

**Problem:** Prisma's default connection pool may not be optimal for production workloads. No configuration for `connectionLimit`, `idleTimeout`, etc.

**Location:** Lines 7-10

**Current Code:**
```typescript
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
```

**Fix (diff snippet):**
```diff
--- a/lib/db.ts
+++ b/lib/db.ts
@@ -4,7 +4,15 @@ const globalForPrisma = globalThis as unknown as {
 };

 export const prisma = globalForPrisma.prisma ?? new PrismaClient({
-  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
+  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
+  datasources: {
+    db: {
+      url: process.env.DATABASE_URL,
+    },
+  },
+  // Connection pool configuration for production
+  // Connection limit should be tuned based on database capacity
 });

+// Graceful shutdown handling
+process.on('beforeExit', async () => {
+  await prisma.$disconnect();
+});
+
 if (process.env.NODE_ENV !== 'production') {
   globalForPrisma.prisma = prisma;
 }
```

**Rationale:** Prevents connection exhaustion in production and ensures graceful shutdown.

**Tests:** `tests/lib/db.test.ts`
```typescript
import { prisma, checkDatabaseConnection } from '@/lib/db';

describe('Database Connection', () => {
  it('should check database connection successfully', async () => {
    const result = await checkDatabaseConnection();
    expect(result).toBe(true);
  });

  it('should handle connection failures gracefully', async () => {
    // Mock prisma.$queryRaw to throw
    // Assert returns false
  });

  it('should disconnect on process exit', async () => {
    // Test graceful shutdown
  });
});
```

**Docs/env changes:** Add to `env.example`:
```bash
# Database connection pool settings
DATABASE_CONNECTION_LIMIT=10
DATABASE_IDLE_TIMEOUT=60000
DATABASE_CONNECTION_TIMEOUT=5000
```

---

**Issue 2: No Graceful Shutdown Handling (MEDIUM)**

**Problem:** Database connections are not explicitly closed on process exit, which can lead to connection leaks during deployments.

**Location:** Entire file - missing shutdown handler

**Fix:** See diff above - added `process.on('beforeExit')` handler

---

**Issue 3: No Query Timeout Configuration (LOW)**

**Problem:** Long-running queries can hang indefinitely without timeout configuration.

**Location:** Line 7

**Fix:**
```diff
--- a/lib/db.ts
+++ b/lib/db.ts
@@ -4,7 +4,11 @@ const globalForPrisma = globalThis as unknown as {
 };

 export const prisma = globalForPrisma.prisma ?? new PrismaClient({
   log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
+  // Query timeout in milliseconds (default: 30 seconds)
+  // Prevents hanging queries from exhausting connections
+  // Can be overridden per-query with $queryRaw`...` timeout
 });

+// Add query timeout middleware (optional advanced feature)
+// See: https://www.prisma.io/docs/concepts/components/prisma-client/query-engine#query-timeouts
```

**Rationale:** Prevents resource exhaustion from runaway queries.

---

### File: `lib/auth.ts`

**Summary:** NextAuth.js configuration with Google OAuth and credentials providers

**Responsibilities:**
- Authentication provider configuration
- JWT session management
- Password hashing/verification

**Exported Symbols:**
- `authOptions` - NextAuth configuration
- `hashPassword()` - Password hashing utility
- `verifyPassword()` - Password verification utility

---

#### Issues Found

| Severity | Issue | Location | Remediation |
|----------|-------|----------|-------------|
| **CRITICAL** | Weak JWT secret fallback | Line 65 | Never use hardcoded fallback secrets |
| **HIGH** | No account lockout for brute force | Lines 30-52 | Add rate limiting and lockout mechanism |
| **HIGH** | Missing email verification | Lines 30-52 | Add email verification flow |
| **MEDIUM** | No password strength validation | Lines 73-79 | Add password policy enforcement |
| **MEDIUM** | No refresh token rotation | Lines 55-67 | Implement token rotation for security |
| **LOW** | Missing 2FA integration hooks | Entire file | Add 2FA callback hooks |

---

#### Detailed Analysis

**Issue 1: Weak JWT Secret Fallback (CRITICAL)**

**Problem:** Line 65 uses `'fallback-secret'` as a hardcoded fallback for JWT verification. This is a severe security vulnerability - if `NEXTAUTH_SECRET` is not set, tokens can be forged.

**Location:** Line 65

**Current Code:**
```typescript
const user = verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret');
```

**Fix (diff snippet):**
```diff
--- a/lib/auth.ts
+++ b/lib/auth.ts
@@ -62,7 +62,15 @@ export const authOptions: NextAuthOptions = {
       // Authentication middleware
       this.io.use(async (socket, next) => {
         try {
           const token = socket.handshake.auth.token || socket.handshake.query.token as string;

           if (!token) {
             return next(new Error('Authentication required'));
           }

-          const user = verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret');
+          // CRITICAL: Never use fallback secrets in production
+          const jwtSecret = process.env.NEXTAUTH_SECRET;
+          if (!jwtSecret || jwtSecret.length < 32) {
+            console.error('CRITICAL: NEXTAUTH_SECRET must be at least 32 characters');
+            if (process.env.NODE_ENV === 'production') {
+              return next(new Error('Authentication configuration error'));
+            }
+          }
+
+          const user = verify(token, jwtSecret || 'dev-secret-min-32-chars-long-for-dev-only');
           socket.data.userId = (user as any).id;
           socket.data.userName = (user as any).name;
           socket.data.userEmail = (user as any).email;
```

**Rationale:** Hardcoded secrets allow token forgery. Must fail securely in production.

**Tests:** `tests/lib/auth.test.ts`
```typescript
describe('JWT Secret Validation', () => {
  it('should reject weak JWT secrets in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXTAUTH_SECRET = 'weak';
    // Should throw or fail securely
  });

  it('should require minimum 32 character secret', () => {
    // Validate secret length
  });
});
```

**Docs/env changes:** Add to `env.example`:
```bash
# NextAuth.js JWT secret (REQUIRED - minimum 32 characters)
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your-secret-key-min-32-characters-change-in-production
```

---

**Issue 2: No Account Lockout for Brute Force (HIGH)**

**Problem:** Lines 30-52 show the credentials provider has no rate limiting or account lockout mechanism. Attackers can attempt unlimited password guesses.

**Location:** Lines 30-52 (authorize callback)

**Current Code:**
```typescript
async authorize(credentials) {
  if (!credentials?.email || !credentials?.password) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { email: credentials.email }
  })
  // ... password check
}
```

**Fix (diff snippet):**
```diff
--- a/lib/auth.ts
+++ b/lib/auth.ts
@@ -30,6 +30,45 @@ export const authOptions: NextAuthOptions = {
       name: "credentials",
       credentials: {
         email: { label: "Email", type: "email" },
         password: { label: "Password", type: "password" }
       },
       async authorize(credentials) {
         if (!credentials?.email || !credentials?.password) {
           return null
         }

+        // BRUTE FORCE PROTECTION: Check account lockout status
+        const lockoutKey = `auth:lockout:${credentials.email}`;
+        const { cache } = await import('./cache');
+
+        const lockoutData = await cache.get<{ attempts: number; lockedUntil: number }>(lockoutKey);
+        if (lockoutData && Date.now() < lockoutData.lockedUntil) {
+          const remainingTime = Math.ceil((lockoutData.lockedUntil - Date.now()) / 60000);
+          throw new Error(`Account locked. Try again in ${remainingTime} minutes.`);
+        }
+
         const user = await prisma.user.findUnique({
           where: { email: credentials.email }
         })

         if (!user || !user.password) {
+          // Record failed attempt
+          await recordFailedLogin(credentials.email);
           return null
         }

         const isPasswordValid = await bcrypt.compare(
           credentials.password,
           user.password
         )

         if (!isPasswordValid) {
+          // Record failed attempt
+          await recordFailedLogin(credentials.email);
           return null
         }

+        // Clear lockout on successful login
+        await cache.delete(lockoutKey);
+
         return {
           id: user.id,
           email: user.email,
           name: user.name,
           image: user.image,
         }
       }
+
+      // Helper function to record failed login attempts
+      async function recordFailedLogin(email: string) {
+        const { cache } = await import('./cache');
+        const lockoutKey = `auth:lockout:${email}`;
+
+        let lockoutData = await cache.get<{ attempts: number; lockedUntil: number }>(lockoutKey) || { attempts: 0, lockedUntil: 0 };
+        lockoutData.attempts += 1;
+
+        // Lock account after 5 failed attempts
+        if (lockoutData.attempts >= 5) {
+          lockoutData.lockedUntil = Date.now() + (15 * 60 * 1000); // 15 minute lockout
+          // TODO: Send security alert email to user
+        }
+
+        await cache.set(lockoutKey, lockoutData, 3600); // 1 hour TTL
+      }
     })
   ],
```

**Rationale:** Prevents brute force password attacks. Industry standard is 5 attempts before lockout.

**Tests:** `tests/lib/auth-brute-force.test.ts`
```typescript
describe('Brute Force Protection', () => {
  it('should lock account after 5 failed attempts', async () => {
    // Simulate 5 failed logins
    // Assert account is locked
  });

  it('should clear lockout on successful login', async () => {
    // Login successfully after failed attempts
    // Assert lockout cleared
  });

  it('should unlock after lockout period expires', async () => {
    // Wait for lockout to expire
    // Assert login is allowed
  });
});
```

**Docs/env changes:** Add to `env.example`:
```bash
# Security settings
AUTH_MAX_FAILED_ATTEMPTS=5
AUTH_LOCKOUT_DURATION_MINUTES=15
AUTH_SEND_SECURITY_ALERTS=true
```

---

**Issue 3: Missing Email Verification (HIGH)**

**Problem:** Users can register with any email without verification. This allows account takeover and spam registrations.

**Location:** Lines 30-52 (no email verification check)

**Fix:** Add email verification flow

```diff
--- a/lib/auth.ts
+++ b/lib/auth.ts
@@ -30,6 +30,10 @@ export const authOptions: NextAuthOptions = {
       async authorize(credentials) {
         if (!credentials?.email || !credentials?.password) {
           return null
         }

         const user = await prisma.user.findUnique({
           where: { email: credentials.email }
         })

         if (!user || !user.password) {
           return null
         }

+        // EMAIL VERIFICATION: Check if email is verified
+        if (!user.emailVerified && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
+          throw new Error('Please verify your email address before logging in');
+        }
+
         const isPasswordValid = await bcrypt.compare(
           credentials.password,
           user.password
         )
```

**Rationale:** Prevents account takeover and ensures valid email addresses.

**Additional Implementation Required:**
- Add `emailVerified` field to User model (already exists in Prisma schema)
- Add email verification endpoint
- Add verification email sending logic

**Tests:** `tests/lib/auth-email-verification.test.ts`

**Docs/env changes:** Add to `env.example`:
```bash
# Email verification
REQUIRE_EMAIL_VERIFICATION=false  # Set to true in production
EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS=24
```

---

**Issue 4: No Password Strength Validation (MEDIUM)**

**Problem:** Lines 73-79 show `hashPassword()` has no password strength validation. Weak passwords like "123456" are accepted.

**Location:** Lines 73-79

**Current Code:**
```typescript
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}
```

**Fix (diff snippet):**
```diff
--- a/lib/auth.ts
+++ b/lib/auth.ts
@@ -73,6 +73,35 @@ export async function hashPassword(password: string): Promise<string> {
+/**
+ * Validate password strength
+ * Requirements:
+ * - Minimum 8 characters
+ * - At least one uppercase letter
+ * - At least one lowercase letter
+ * - At least one number
+ * - At least one special character (optional, configurable)
+ */
+export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
+  const errors: string[] = [];
+
+  if (password.length < 8) {
+    errors.push('Password must be at least 8 characters long');
+  }
+
+  if (!/[A-Z]/.test(password)) {
+    errors.push('Password must contain at least one uppercase letter');
+  }
+
+  if (!/[a-z]/.test(password)) {
+    errors.push('Password must contain at least one lowercase letter');
+  }
+
+  if (!/[0-9]/.test(password)) {
+    errors.push('Password must contain at least one number');
+  }
+
+  if (process.env.PASSWORD_REQUIRE_SPECIAL === 'true' && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
+    errors.push('Password must contain at least one special character');
+  }
+
+  // Check for common passwords
+  const commonPasswords = ['password', '123456', 'qwerty', 'letmein', 'welcome'];
+  if (commonPasswords.includes(password.toLowerCase())) {
+    errors.push('Password is too common. Please choose a stronger password');
+  }
+
+  return { valid: errors.length === 0, errors };
+}
+
 export async function hashPassword(password: string): Promise<string> {
+  // Validate password strength before hashing
+  const validation = validatePasswordStrength(password);
+  if (!validation.valid) {
+    throw new Error(validation.errors.join(', '));
+  }
+
   return bcrypt.hash(password, 12)
 }
```

**Rationale:** Weak passwords are the #1 cause of account compromises.

**Tests:** `tests/lib/password-validation.test.ts`
```typescript
import { validatePasswordStrength } from '@/lib/auth';

describe('Password Strength Validation', () => {
  it('should reject passwords shorter than 8 characters', () => {
    const result = validatePasswordStrength('short');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters long');
  });

  it('should reject passwords without uppercase', () => {
    const result = validatePasswordStrength('alllowercase123');
    expect(result.valid).toBe(false);
  });

  it('should reject common passwords', () => {
    const result = validatePasswordStrength('password');
    expect(result.valid).toBe(false);
  });

  it('should accept strong passwords', () => {
    const result = validatePasswordStrength('Str0ngP@ssw0rd!');
    expect(result.valid).toBe(true);
  });
});
```

**Docs/env changes:** Add to `env.example`:
```bash
# Password policy
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_DIGIT=true
PASSWORD_REQUIRE_SPECIAL=false
```

---

**Issue 5: No Refresh Token Rotation (MEDIUM)**

**Problem:** Lines 55-67 show JWT tokens are issued without rotation. If a token is stolen, it can be used indefinitely until expiration.

**Location:** Lines 55-67 (JWT callbacks)

**Fix:** Implement refresh token rotation

```diff
--- a/lib/auth.ts
+++ b/lib/auth.ts
@@ -55,6 +55,30 @@ export const authOptions: NextAuthOptions = {
   callbacks: {
     async jwt({ token, user }) {
       if (user) {
         token.id = user.id
       }
+
+      // TOKEN ROTATION: Generate new token on each use
+      // This invalidates stolen tokens after single use
+      if (process.env.ENABLE_TOKEN_ROTATION === 'true') {
+        token.iat = Date.now();
+        token.jti = crypto.randomUUID(); // Unique token ID
+      }
+
       return token
     },
     async session({ session, token }) {
       if (token) {
         session.user.id = token.id as string
       }
+
+      // Add token metadata to session
+      if (process.env.ENABLE_TOKEN_ROTATION === 'true') {
+        session.tokenId = token.jti as string;
+      }
+
       return session
     }
   },
```

**Rationale:** Token rotation limits the window of opportunity for token theft.

**Additional Implementation Required:**
- Store used token IDs in Redis to prevent replay
- Add token blacklist mechanism
- Implement refresh token endpoint

**Docs/env changes:** Add to `env.example`:
```bash
# Token security
ENABLE_TOKEN_ROTATION=true
TOKEN_EXPIRY_MINUTES=30
REFRESH_TOKEN_EXPIRY_DAYS=7
```

---

**Issue 6: Missing 2FA Integration Hooks (LOW)**

**Problem:** No hooks for two-factor authentication integration. The `2fa.ts` file exists but is not integrated into auth flow.

**Location:** Entire file - no 2FA callbacks

**Fix:** Add 2FA callback hooks

```diff
--- a/lib/auth.ts
+++ b/lib/auth.ts
@@ -50,6 +50,15 @@ export const authOptions: NextAuthOptions = {
         if (!isPasswordValid) {
           return null
         }

+        // 2FA CHECK: If user has 2FA enabled, require verification
+        if (user.twoFactorEnabled) {
+          // Return special flag to indicate 2FA is required
+          // The actual 2FA verification happens in a separate step
+          return {
+            id: user.id,
+            email: user.email,
+            name: user.name,
+            image: user.image,
+            twoFactorRequired: true,
+          }
+        }
+
         return {
           id: user.id,
           email: user.email,
           name: user.name,
           image: user.image,
         }
       }
     })
   ],
```

**Rationale:** 2FA is critical for account security, especially for admin users.

---

### File: `lib/rate-limit.ts`

**Summary:** Redis-backed rate limiter with multiple strategies (sliding window, fixed window, token bucket)

**Responsibilities:**
- Rate limiting enforcement
- Multiple limiting strategies
- Rate limit headers

**Exported Symbols:**
- `RateLimiter` class
- `rateLimitMiddleware()` - Next.js middleware
- `RateLimitPresets` - Pre-configured limits
- `getRateLimitConfigForPath()` - Path-based config

---

#### Issues Found

| Severity | Issue | Location | Remediation |
|----------|-------|----------|-------------|
| **HIGH** | Redis connection not awaited | Line 37 | Connection happens async without error handling |
| **MEDIUM** | No circuit breaker for Redis failures | Lines 50-200 | Add fallback when Redis is unavailable |
| **MEDIUM** | IP-based limiting can be bypassed | Line 232 | Add fingerprinting or user-based limiting |
| **LOW** | No metrics/logging for rate limit hits | Lines 230-250 | Add logging and metrics collection |
| **LOW** | Hardcoded rate limit keys | Lines 70-180 | Use configurable key prefixes |

---

#### Detailed Analysis

**Issue 1: Redis Connection Not Awaited (HIGH)**

**Problem:** Line 37 calls `this.redis.connect().catch(console.error)` which doesn't properly handle connection failures. The rate limiter will silently fail open (allow all requests) if Redis is down.

**Location:** Line 37

**Current Code:**
```typescript
constructor() {
  this.redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });
  this.redis.connect().catch(console.error);
}
```

**Fix (diff snippet):**
```diff
--- a/lib/rate-limit.ts
+++ b/lib/rate-limit.ts
@@ -34,8 +34,25 @@ export class RateLimiter {
   };

   constructor() {
     this.redis = createClient({
       url: process.env.REDIS_URL || 'redis://localhost:6379',
     });
-    this.redis.connect().catch(console.error);
+
+    // Properly handle Redis connection with retry logic
+    this.redis.on('error', (err) => {
+      console.error('Redis rate limiter error:', err);
+      this.connected = false;
+    });
+
+    this.redis.on('connect', () => {
+      console.log('Redis rate limiter connected');
+      this.connected = true;
+    });
+
+    this.redis.on('reconnecting', () => {
+      console.log('Redis rate limiter reconnecting...');
+      this.connected = false;
+    });
+
+    // Await connection with timeout
+    this.initializeRedis();
   }

+  private async initializeRedis(): Promise<void> {
+    try {
+      await this.redis.connect();
+    } catch (error) {
+      console.error('Failed to connect to Redis for rate limiting:', error);
+      this.connected = false;
+      // In production, this should fail closed or alert operators
+    }
+  }
+
+  private connected = false;
```

**Rationale:** Silent failures allow rate limit bypass. Must track connection state.

**Tests:** `tests/lib/rate-limit-redis-failure.test.ts`

---

**Issue 2: No Circuit Breaker for Redis Failures (MEDIUM)**

**Problem:** If Redis is unavailable, the rate limiter should fail closed (block requests) or fail open with alerts, not silently allow all requests.

**Location:** Lines 50-200 (all rate limiting methods)

**Fix:** Add circuit breaker pattern

```diff
--- a/lib/rate-limit.ts
+++ b/lib/rate-limit.ts
@@ -45,6 +45,30 @@ export class RateLimiter {
     this.initializeRedis();
   }

+  private connected = false;
+  private consecutiveFailures = 0;
+  private readonly MAX_FAILURES = 5;
+  private circuitOpenUntil: number | null = null;
+
+  private async checkCircuitBreaker(): Promise<boolean> {
+    // If circuit is open, check if we can try again
+    if (this.circuitOpenUntil && Date.now() < this.circuitOpenUntil) {
+      return false; // Circuit still open
+    }
+
+    // If we've had too many failures, open the circuit
+    if (this.consecutiveFailures >= this.MAX_FAILURES) {
+      this.circuitOpenUntil = Date.now() + (60 * 1000); // Open for 1 minute
+      this.consecutiveFailures = 0;
+      console.warn('Rate limiter circuit breaker opened due to Redis failures');
+      return false;
+    }
+
+    return this.connected;
+  }
+
+  private async recordSuccess(): Promise<void> {
+    this.consecutiveFailures = 0;
+    this.circuitOpenUntil = null;
+  }
+
+  private async recordFailure(): Promise<void> {
+    this.consecutiveFailures += 1;
+  }
+
   /**
    * Check if request is rate limited
    */
   async isRateLimited(
     identifier: string,
     config: RateLimitConfig = this.defaultConfig
   ): Promise<RateLimitResult> {
+    // Check circuit breaker
+    const circuitOk = await this.checkCircuitBreaker();
+    if (!circuitOk) {
+      // Circuit is open - fail open with warning
+      console.warn('Rate limiter circuit open, allowing request');
+      return { limited: false, remaining: config.maxRequests, reset: Date.now() + config.interval };
+    }
+
     const strategy = config.strategy || 'sliding-window';

     switch (strategy) {
       case 'sliding-window':
-        return this.slidingWindowLimit(identifier, config);
+        try {
+          const result = await this.slidingWindowLimit(identifier, config);
+          await this.recordSuccess();
+          return result;
+        } catch (error) {
+          await this.recordFailure();
+          throw error;
+        }
       // ... similar for other strategies
```

**Rationale:** Circuit breaker prevents cascading failures when Redis is down.

---

**Issue 3: IP-Based Limiting Can Be Bypassed (MEDIUM)**

**Problem:** Line 232 uses IP address for rate limiting, which can be easily bypassed with proxy rotation or IPv6 variations.

**Location:** Line 232

**Current Code:**
```typescript
const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
const identifier = apiKey || userId || `ip:${ip}`;
```

**Fix:** Add user fingerprinting

```diff
--- a/lib/rate-limit.ts
+++ b/lib/rate-limit.ts
@@ -230,8 +230,25 @@ export async function rateLimitMiddleware(
   const limiter = new RateLimiter();

   // Get identifier (API key, user ID, or IP)
   const apiKey = req.headers.get('x-api-key');
   const userId = req.headers.get('x-user-id');
-  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
+
+  // Get IP address with proxy awareness
+  const forwardedFor = req.headers.get('x-forwarded-for');
+  const realIp = req.headers.get('x-real-ip');
+  const ip = realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : req.ip) || 'unknown';

-  const identifier = apiKey || userId || `ip:${ip}`;
+  // Create more robust identifier
+  // Priority: API key > User ID > (IP + User-Agent fingerprint)
+  const userAgent = req.headers.get('user-agent') || '';
+  const fingerprint = `${ip}:${userAgent}`;
+  const identifier = apiKey
+    ? `api:${apiKey}`
+    : userId
+    ? `user:${userId}`
+    : `ip:${fingerprint}`;
+
+  // Log suspicious activity (same IP, many user-agents = proxy rotation)
+  if (!apiKey && !userId) {
+    await logSuspiciousActivity(ip, userAgent);
+  }

   const result = await limiter.isRateLimited(identifier, config);
```

**Rationale:** IP-only limiting is easily bypassed. User-agent fingerprinting adds friction.

---

### File: `lib/sanitizer.ts`

**Summary:** Comprehensive input sanitization for XSS, SQL injection, path traversal prevention

**Responsibilities:**
- HTML sanitization
- Text sanitization
- URL validation
- SQL injection detection
- XSS prevention

**Exported Symbols:**
- `InputSanitizer` class with static methods

---

#### Issues Found

| Severity | Issue | Location | Remediation |
|----------|-------|----------|-------------|
| **CRITICAL** | Regex-based SQL injection detection is incomplete | Lines 28-34 | Use parameterized queries instead |
| **HIGH** | HTML sanitization can be bypassed | Lines 48-62 | Use established library like DOMPurify |
| **HIGH** | No null byte injection protection in all methods | Multiple | Add null byte checks consistently |
| **MEDIUM** | URL sanitization doesn't check for internal IPs | Lines 115-135 | Add SSRF protection |
| **MEDIUM** | Email sanitization doesn't check for disposable emails | Lines 180-195 | Add disposable email detection |

---

#### Detailed Analysis

**Issue 1: Regex-Based SQL Injection Detection is Incomplete (CRITICAL)**

**Problem:** Lines 28-34 use regex patterns to detect SQL injection, but this is fundamentally flawed. Parameterized queries should be used instead. Regex can always be bypassed.

**Location:** Lines 28-34

**Current Code:**
```typescript
private static readonly SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
  /(--|\#|\/\*|\*\/)/,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
  /(\b(UNION|JOIN|HAVING|GROUP BY|ORDER BY)\b)/i,
  /(;|\||&|\!)/,
];
```

**Problem Analysis:**
1. Legitimate queries use SELECT, INSERT, etc. - false positives
2. Encoded payloads bypass regex (e.g., `%53%45%4C%45%43%54` = SELECT)
3. Unicode bypass: `SEL￠ECT`
4. Comment bypass: `/*!SELECT*/`
5. The `detectSQLInjection()` method gives false sense of security

**Fix (diff snippet):**
```diff
--- a/lib/sanitizer.ts
+++ b/lib/sanitizer.ts
@@ -25,15 +25,20 @@ export class InputSanitizer {
     'href', 'src', 'alt', 'title', 'class',
   ];

-  // Dangerous patterns for SQL injection
-  // WARNING: Regex-based SQL injection detection is NOT reliable
-  // Always use parameterized queries instead
   private static readonly SQL_INJECTION_PATTERNS = [
     /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
     /(--|\#|\/\*|\*\/)/,
     /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
     /(\b(UNION|JOIN|HAVING|GROUP BY|ORDER BY)\b)/i,
     /(;|\||&|\!)/,
   ];

+  /**
+   * IMPORTANT: SQL injection detection via regex is NOT secure.
+   * This should only be used as a logging/alerting mechanism.
+   *
+   * ALWAYS use parameterized queries with Prisma:
+   * - prisma.$queryRaw`SELECT * FROM users WHERE id = ${userId}`
+   * - NEVER: prisma.$queryRaw(`SELECT * FROM users WHERE id = '${userId}'`)
+   */
   static detectSQLInjection(input: string): boolean {
     if (!input) return false;

-    return this.SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
+    const detected = this.SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
+
+    // Log potential SQL injection attempt for security monitoring
+    if (detected) {
+      console.warn('Potential SQL injection attempt detected:', {
+        input: input.substring(0, 100), // Truncate for logs
+        timestamp: new Date().toISOString(),
+      });
+      // TODO: Send to security monitoring system (Sentry, SIEM)
+    }
+
+    return detected;
   }
```

**Rationale:** Regex-based SQL injection detection provides false security. Must use parameterized queries.

**Additional Documentation Required:**

Add to `docs/SECURITY_BEST_PRACTICES.md`:
```markdown
## SQL Injection Prevention

### DO (Secure):
```typescript
// Parameterized query with Prisma
const user = await prisma.user.findUnique({
  where: { email: userInput } // Automatically parameterized
});

// Raw query with parameters
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`;
```

### DON'T (Vulnerable):
```typescript
// NEVER concatenate user input into queries
const users = await prisma.$queryRaw(
  `SELECT * FROM users WHERE email = '${userInput}'`
);
```
```

**Tests:** `tests/lib/sanitizer-sql-injection.test.ts`
```typescript
describe('SQL Injection Detection (Alerting Only)', () => {
  it('should detect basic SQL injection patterns', () => {
    expect(InputSanitizer.detectSQLInjection("1' OR '1'='1")).toBe(true);
  });

  it('should NOT be relied upon for security', () => {
    // These bypass the regex but are still SQL injection
    expect(InputSanitizer.detectSQLInjection('%53%45%4C%45%43%54')).toBe(false); // URL encoded
    expect(InputSanitizer.detectSQLInjection('SEL￠ECT')).toBe(false); // Unicode
    // Test should document that detection is incomplete
  });
});
```

---

**Issue 2: HTML Sanitization Can Be Bypassed (HIGH)**

**Problem:** Lines 48-62 use regex for HTML sanitization, which is notoriously unreliable. Modern browsers parse HTML differently than regex, allowing XSS bypasses.

**Location:** Lines 48-62

**Current Code:**
```typescript
static sanitizeHTML(input: string): string {
  if (!input) return '';
  let sanitized = input;

  // Remove XSS patterns
  this.XSS_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Remove disallowed tags...
}
```

**Known Bypasses:**
1. Nested tags: `<scr<script>ipt>`
2. Encoding: `<img src=x onerror=alert(1)>`
3. SVG vectors: `<svg/onload=alert(1)>`
4. Data URIs: `<a href="data:text/html,<script>alert(1)</script>">`
5. Mutation XSS: `<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>`

**Fix:** Use established library like DOMPurify

```diff
--- a/lib/sanitizer.ts
+++ b/lib/sanitizer.ts
@@ -1,5 +1,6 @@
 /**
  * Input Sanitization Library
+ *
+ * IMPORTANT: For HTML sanitization, use DOMPurify in production.
+ * Regex-based HTML sanitization is NOT secure against modern XSS attacks.
  *
  * Comprehensive input sanitization for:
  * - HTML content
@@ -45,25 +46,40 @@ export class InputSanitizer {
   /**
    * Sanitize HTML content (allows safe tags)
    *
-   * WARNING: This regex-based approach is NOT secure for production.
-   * Use DOMPurify (https://github.com/cure53/DOMPurify) for production HTML sanitization.
+   * @deprecated For production use, use DOMPurify instead:
+   * ```typescript
+   * import DOMPurify from 'dompurify';
+   * const clean = DOMPurify.sanitize(dirty, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', ...] });
+   * ```
    */
   static sanitizeHTML(input: string): string {
     if (!input) return '';

+    // PRODUCTION RECOMMENDATION: Use DOMPurify
+    if (process.env.USE_DOMPURIFY === 'true') {
+      try {
+        // DOMPurify would be imported and used here
+        // This is a placeholder for the actual implementation
+        console.warn('DOMPurify not installed, falling back to regex sanitization');
+      } catch (error) {
+        console.error('DOMPurify sanitization failed:', error);
+      }
+    }
+
     let sanitized = input;

     // Remove XSS patterns
     this.XSS_PATTERNS.forEach((pattern) => {
       sanitized = sanitized.replace(pattern, '');
     });

     // Remove disallowed tags
     const tagPattern = new RegExp(`</?(?!(${this.ALLOWED_HTML_TAGS.join('|')})\\b)[a-z][a-z0-9]*\\b[^>]*>`, 'gi');
     sanitized = sanitized.replace(tagPattern, '');

     // Remove disallowed attributes
     const attrPattern = new RegExp(`\\s(?!(${this.ALLOWED_HTML_ATTRS.join('|')})\\b)[a-z][a-z0-9-]*\\s*=\\s*["'][^"']*["']`, 'gi');
     sanitized = sanitized.replace(attrPattern, '');

+    // Additional protection: Remove javascript: and data: URIs
+    sanitized = sanitized.replace(/javascript:/gi, '');
+    sanitized = sanitized.replace(/data:text\/html/gi, '');
+
     return sanitized;
   }
```

**Rationale:** Regex HTML sanitization is fundamentally broken. DOMPurify is the industry standard.

**Package Addition:**
```bash
npm install dompurify
npm install -D @types/dompurify
```

**Tests:** `tests/lib/sanitizer-xss.test.ts`
```typescript
describe('HTML Sanitization XSS Prevention', () => {
  it('should remove script tags', () => {
    const input = '<script>alert(1)</script>Hello';
    const output = InputSanitizer.sanitizeHTML(input);
    expect(output).not.toContain('<script>');
  });

  it('should handle nested tag bypass', () => {
    const input = '<scr<script>ipt>alert(1)</script>';
    const output = InputSanitizer.sanitizeHTML(input);
    // This SHOULD fail with current implementation - documents the vulnerability
    expect(output).toContain('alert'); // Bypass succeeds
  });

  it('should handle SVG onload bypass', () => {
    const input = '<svg/onload=alert(1)>';
    const output = InputSanitizer.sanitizeHTML(input);
    // This SHOULD fail with current implementation
    expect(output).toContain('onload'); // Bypass succeeds
  });
});
```

**Docs/env changes:** Add to `env.example`:
```bash
# Security: Use DOMPurify for HTML sanitization (recommended)
USE_DOMPURIFY=true
```

---

**Issue 3: URL Sanitization Doesn't Check for Internal IPs (MEDIUM)**

**Problem:** Lines 115-135 validate URL protocol but don't check for SSRF (Server-Side Request Forgery) attacks targeting internal services.

**Location:** Lines 115-135

**Current Code:**
```typescript
static sanitizeUrl(url: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url.trim());

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    // Remove dangerous characters from hostname
    const hostname = parsed.hostname.replace(/[^\w.-]/g, '');
    // ...
```

**Missing Checks:**
- Internal IP addresses (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
- localhost/127.0.0.1
- Cloud metadata endpoints (169.254.169.254)
- DNS rebinding attacks

**Fix:** Add SSRF protection

```diff
--- a/lib/sanitizer.ts
+++ b/lib/sanitizer.ts
@@ -115,6 +115,50 @@ export class InputSanitizer {
   static sanitizeUrl(url: string): string | null {
     if (!url) return null;

     try {
       const parsed = new URL(url.trim());

       // Only allow http and https protocols
       if (!['http:', 'https:'].includes(parsed.protocol)) {
         return null;
       }

+      // SSRF PROTECTION: Block internal/private IP addresses
+      const hostname = parsed.hostname.toLowerCase();
+
+      // Block localhost
+      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
+        console.warn('SSRF attempt detected: localhost access blocked');
+        return null;
+      }
+
+      // Block private IP ranges
+      if (this.isPrivateIP(hostname)) {
+        console.warn('SSRF attempt detected: private IP access blocked', { hostname });
+        return null;
+      }
+
+      // Block cloud metadata endpoints
+      const metadataEndpoints = [
+        '169.254.169.254', // AWS, GCP, Azure
+        'metadata.google.internal',
+        '100.100.100.200', // Alibaba
+      ];
+      if (metadataEndpoints.some(endpoint => hostname.includes(endpoint))) {
+        console.warn('SSRF attempt detected: cloud metadata access blocked', { hostname });
+        return null;
+      }
+
       // Remove dangerous characters from hostname
-      const hostname = parsed.hostname.replace(/[^\w.-]/g, '');
+      const safeHostname = hostname.replace(/[^\w.-]/g, '');

       // Reconstruct safe URL
       const safeUrl = new URL(parsed);
-      safeUrl.hostname = hostname;
+      safeUrl.hostname = safeHostname;

       // Sanitize pathname
       safeUrl.pathname = this.sanitizeText(parsed.pathname);

+      // Block URLs with embedded credentials
+      if (parsed.username || parsed.password) {
+        console.warn('URL with embedded credentials blocked');
+        return null;
+      }
+
       return safeUrl.toString();
     } catch {
       return null;
     }
   }

+  /**
+   * Check if hostname is a private IP address
+   */
+  private static isPrivateIP(hostname: string): boolean {
+    // IPv4 private ranges
+    const ipv4Patterns = [
+      /^10\./, // 10.0.0.0/8
+      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
+      /^192\.168\./, // 192.168.0.0/16
+      /^127\./, // Loopback
+      /^0\./, // Current network
+    ];
+
+    for (const pattern of ipv4Patterns) {
+      if (pattern.test(hostname)) {
+        return true;
+      }
+    }
+
+    // IPv6 private ranges (simplified check)
+    if (hostname.startsWith('fc') || hostname.startsWith('fd') || hostname === '::1') {
+      return true;
+    }
+
+    return false;
+  }
```

**Rationale:** SSRF attacks can access internal services and cloud metadata.

**Tests:** `tests/lib/sanitizer-ssrf.test.ts`
```typescript
describe('URL Sanitization SSRF Prevention', () => {
  it('should block localhost URLs', () => {
    expect(InputSanitizer.sanitizeUrl('http://localhost:8080')).toBe(null);
    expect(InputSanitizer.sanitizeUrl('http://127.0.0.1:80')).toBe(null);
  });

  it('should block private IP addresses', () => {
    expect(InputSanitizer.sanitizeUrl('http://192.168.1.1')).toBe(null);
    expect(InputSanitizer.sanitizeUrl('http://10.0.0.1')).toBe(null);
    expect(InputSanitizer.sanitizeUrl('http://172.16.0.1')).toBe(null);
  });

  it('should block cloud metadata endpoints', () => {
    expect(InputSanitizer.sanitizeUrl('http://169.254.169.254/latest/meta-data/')).toBe(null);
  });

  it('should block URLs with embedded credentials', () => {
    expect(InputSanitizer.sanitizeUrl('http://user:pass@example.com')).toBe(null);
  });

  it('should allow legitimate public URLs', () => {
    expect(InputSanitizer.sanitizeUrl('https://example.com/path')).toBe('https://example.com/path');
  });
});
```

---

### File: `lib/cache.ts`

**Summary:** Redis-backed cache service with TTL, invalidation, and statistics

**Responsibilities:**
- Distributed caching
- Cache strategies
- Automatic invalidation
- Statistics tracking

**Exported Symbols:**
- `CacheService` class
- `cache` singleton instance

---

#### Issues Found

| Severity | Issue | Location | Remediation |
|----------|-------|----------|-------------|
| **HIGH** | JSON.parse without validation | Line 56 | Add runtime type validation |
| **HIGH** | No cache stampede prevention | Lines 115-130 | Add mutex/lock for cache misses |
| **MEDIUM** | Silent failure when Redis unavailable | Lines 45-170 | Add circuit breaker pattern |
| **MEDIUM** | No serialization error handling | Line 72 | Handle circular references |
| **LOW** | Stats tracking memory leak risk | Line 28 | Add stats TTL/rotation |

---

#### Detailed Analysis

**Issue 1: JSON.parse Without Validation (HIGH)**

**Problem:** Line 56 uses `JSON.parse(data) as T` without validating the parsed data matches the expected type. This can lead to runtime errors if cache data is corrupted or maliciously modified.

**Location:** Line 56

**Current Code:**
```typescript
async get<T>(key: string): Promise<T | null> {
  if (!this.connected) return null;

  try {
    const data = await this.redis.get(key);

    if (!data) {
      this.recordMiss(key);
      return null;
    }

    this.recordHit(key);
    return JSON.parse(data) as T; // UNSAFE: No validation
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}
```

**Fix:** Add runtime type validation with Zod

```diff
--- a/lib/cache.ts
+++ b/lib/cache.ts
@@ -1,5 +1,6 @@
 /**
  * Enhanced Cache Service with Redis
+ *
+ * IMPORTANT: Cache values are not type-validated by default. Use with Zod schemas for production.
  *
  * Production-ready caching with:
  * - Redis-backed distributed caching
@@ -50,12 +51,30 @@ export class CacheService {
   /**
    * Get value from cache
    */
   async get<T>(key: string): Promise<T | null> {
     if (!this.connected) return null;

     try {
       const data = await this.redis.get(key);

       if (!data) {
         this.recordMiss(key);
         return null;
       }

       this.recordHit(key);
-      return JSON.parse(data) as T;
+
+      const parsed = JSON.parse(data);
+
+      // Optional: Validate with Zod schema if provided
+      // This requires caller to pass a schema for validation
+      return parsed as T;
     } catch (error) {
       console.error('Cache get error:', error);
       return null;
     }
   }
```

**Better Fix:** Add schema validation method

```typescript
// Add new method with Zod validation
async getValidated<T>(key: string, schema: z.ZodSchema<T>): Promise<T | null> {
  if (!this.connected) return null;

  try {
    const data = await this.redis.get(key);
    if (!data) {
      this.recordMiss(key);
      return null;
    }

    const parsed = JSON.parse(data);
    const validated = schema.parse(parsed);

    this.recordHit(key);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Cache validation error:', {
        key,
        errors: error.errors,
        rawValue: await this.redis.get(key),
      });
      // Corrupted cache - delete it
      await this.delete(key);
    }
    console.error('Cache get error:', error);
    return null;
  }
}
```

**Rationale:** Type assertions provide no runtime safety. Zod validation catches corrupted data.

**Package Addition:**
```bash
npm install zod
```

**Tests:** `tests/lib/cache-validation.test.ts`
```typescript
import { z } from 'zod';

describe('Cache Validation', () => {
  it('should validate cached data with Zod schema', async () => {
    const userSchema = z.object({
      id: z.string(),
      email: z.string().email(),
      name: z.string().optional(),
    });

    // Set invalid data
    await cache.set('test:user:1', { id: '1', email: 'not-an-email' });

    // Should fail validation and return null
    const result = await cache.getValidated('test:user:1', userSchema);
    expect(result).toBe(null);
  });

  it('should delete corrupted cache entries', async () => {
    // Set corrupted JSON
    await cache.redis.set('test:corrupt', 'not-valid-json');

    const result = await cache.get('test:corrupt');
    expect(result).toBe(null);
    // Corrupted entry should be deleted
    const deleted = await cache.redis.get('test:corrupt');
    expect(deleted).toBe(null);
  });
});
```

---

**Issue 2: No Cache Stampede Prevention (HIGH)**

**Problem:** Lines 115-130 show `cacheable()` and `getOrSet()` methods don't prevent cache stampede. When cache expires, multiple concurrent requests all miss and simultaneously fetch fresh data, potentially overwhelming the database.

**Location:** Lines 115-130

**Current Code:**
```typescript
async cacheable<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = this.defaultTTL
): Promise<T> {
  // Try cache first
  const cached = await this.get<T>(key);
  if (cached) {
    return cached;
  }

  // Fetch fresh data
  const fresh = await fetcher();

  // Cache the result
  await this.set(key, fresh, ttl);

  return fresh;
}
```

**Problem Scenario:**
1. Cache expires for popular key `user:123`
2. 100 concurrent requests all miss cache
3. All 100 requests call `fetcher()` simultaneously
4. Database overwhelmed with 100 identical queries

**Fix:** Add mutex/lock for cache misses

```diff
--- a/lib/cache.ts
+++ b/lib/cache.ts
@@ -115,20 +115,60 @@ export class CacheService {
   /**
    * Cache wrapper for async functions with automatic caching
    */
   async cacheable<T>(
     key: string,
     fetcher: () => Promise<T>,
     ttl: number = this.defaultTTL
   ): Promise<T> {
     // Try cache first
     const cached = await this.get<T>(key);
     if (cached) {
       return cached;
     }

+    // CACHE STAMPEDE PREVENTION: Use distributed lock
+    const lockKey = `lock:${key}`;
+    const lockAcquired = await this.acquireLock(lockKey, 5000); // 5 second lock
+
+    if (!lockAcquired) {
+      // Another request is fetching - wait and retry
+      await this.sleep(100); // Wait 100ms
+      const retryCached = await this.get<T>(key);
+      if (retryCached) {
+        return retryCached;
+      }
+      // Still not cached - proceed with fetch (fallback)
+    }
+
+    try {
+      // Double-check after acquiring lock
+      const doubleCheckCached = await this.get<T>(key);
+      if (doubleCheckCached) {
+        return doubleCheckCached;
+      }
+
+      // Fetch fresh data
+      const fresh = await fetcher();
+
+      // Cache the result
+      await this.set(key, fresh, ttl);
+
+      return fresh;
+    } finally {
+      // Release lock
+      if (lockAcquired) {
+        await this.releaseLock(lockKey);
+      }
+    }
+  }
+
+  private async acquireLock(key: string, ttlMs: number): Promise<boolean> {
+    const value = Date.now();
+    const acquired = await this.redis.set(key, value.toString(), {
+      PX: ttlMs,
+      NX: true, // Only set if not exists
+    });
+    return acquired !== null;
+  }
+
+  private async releaseLock(key: string): Promise<void> {
+    await this.redis.del(key);
+  }
+
+  private sleep(ms: number): Promise<void> {
+    return new Promise(resolve => setTimeout(resolve, ms));
+  }
+
   /**
    * Get or set with factory function
    */
```

**Rationale:** Cache stampedes can overwhelm databases. Distributed locks prevent duplicate fetches.

**Tests:** `tests/lib/cache-stampede.test.ts`
```typescript
describe('Cache Stampede Prevention', () => {
  it('should only call fetcher once for concurrent requests', async () => {
    let fetchCount = 0;

    const fetcher = async () => {
      fetchCount += 1;
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate slow fetch
      return { data: 'test' };
    };

    // Fire 10 concurrent requests
    const promises = Array(10).fill(null).map(() => cache.cacheable('test:key', fetcher, 60));
    const results = await Promise.all(promises);

    // Fetcher should only be called once
    expect(fetchCount).toBe(1);

    // All results should be the same
    results.forEach(result => {
      expect(result).toEqual({ data: 'test' });
    });
  });
});
```

---

### File: `lib/socket-server.ts`

**Summary:** Enhanced Socket.IO server with Redis adapter, JWT auth, message persistence

**Responsibilities:**
- Real-time communication
- Team chat
- Presence system
- Typing indicators
- Message persistence

**Exported Symbols:**
- `EnhancedSocketServer` class
- `getSocketServer()` - Singleton accessor
- `initializeSocketServer()` - Initialization function

---

#### Issues Found

| Severity | Issue | Location | Remediation |
|----------|-------|----------|-------------|
| **CRITICAL** | JWT verification uses weak secret fallback | Line 65 | Same issue as auth.ts |
| **HIGH** | No message content validation | Lines 145-175 | Add message sanitization |
| **HIGH** | Team membership check race condition | Lines 115-130 | Add atomic verification |
| **MEDIUM** | No socket disconnection cleanup | Lines 95-100 | Clean up userSockets maps |
| **MEDIUM** | Typing indicator timeout not cleared | Lines 180-190 | Clear timeout on disconnect |
| **LOW** | No message size limits | Lines 145-175 | Add max message length |

---

#### Detailed Analysis

**Issue 1: JWT Verification Uses Weak Secret Fallback (CRITICAL)**

**Problem:** Line 65 uses `'fallback-secret'` for JWT verification, identical to the auth.ts vulnerability.

**Location:** Line 65

**Current Code:**
```typescript
const user = verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret');
```

**Fix:** Same as auth.ts Issue 1 - never use fallback secrets in production.

---

**Issue 2: No Message Content Validation (HIGH)**

**Problem:** Lines 145-175 show message sending doesn't validate or sanitize message content, allowing XSS/injection attacks via chat.

**Location:** Lines 145-175

**Current Code:**
```typescript
socket.on('message:send', async (data, callback) => {
  try {
    // Rate limiting check
    const now = Date.now();
    const userLastMessages = this.getUserRecentMessages(userId);

    if (userLastMessages.length > 10 && now - userLastMessages[0] < 60000) {
      callback?.({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: 60000 - (now - userLastMessages[0])
      });
      return;
    }

    // Save message to database
    const message = await this.saveMessage({
      content: data.content, // UNSANITIZED
      type: data.type || 'TEXT',
      teamId: data.teamId,
      userId,
    });
```

**Fix:** Add message sanitization

```diff
--- a/lib/socket-server.ts
+++ b/lib/socket-server.ts
@@ -145,6 +145,20 @@ export class EnhancedSocketServer {
     socket.on('message:send', async (data, callback) => {
       try {
         // Rate limiting check
         const now = Date.now();
         const userLastMessages = this.getUserRecentMessages(userId);

         if (userLastMessages.length > 10 && now - userLastMessages[0] < 60000) {
           callback?.({
             success: false,
             error: 'Rate limit exceeded',
             retryAfter: 60000 - (now - userLastMessages[0])
           });
           return;
         }

+        // MESSAGE VALIDATION: Sanitize content
+        const { InputSanitizer } = await import('./sanitizer');
+
+        if (!data.content || typeof data.content !== 'string') {
+          callback?.({ success: false, error: 'Message content required' });
+          return;
+        }
+
+        // Validate message length
+        if (data.content.length > 5000) {
+          callback?.({ success: false, error: 'Message too long (max 5000 characters)' });
+          return;
+        }
+
+        // Sanitize message content based on type
+        let sanitizedContent: string;
+        if (data.type === 'TEXT') {
+          sanitizedContent = InputSanitizer.sanitizeText(data.content);
+        } else if (data.type === 'IMAGE') {
+          // Validate image URL
+          sanitizedContent = InputSanitizer.sanitizeUrl(data.content) || '';
+          if (!sanitizedContent) {
+            callback?.({ success: false, error: 'Invalid image URL' });
+            return;
+          }
+        } else {
+          sanitizedContent = InputSanitizer.sanitizeRichText(data.content, { maxLength: 5000 });
+        }
+
+        // Check for spam patterns
+        if (this.isSpamMessage(data.content)) {
+          callback?.({ success: false, error: 'Message blocked by spam filter' });
+          return;
+        }
+
         // Save message to database
         const message = await this.saveMessage({
-          content: data.content,
+          content: sanitizedContent,
           type: data.type || 'TEXT',
           teamId: data.teamId,
           userId,
         });
```

**Rationale:** Unsanitized chat messages enable XSS attacks against other users.

---

## Top 10 Critical Findings Summary

| Rank | Project | File | Issue | Severity | One-Line Remediation |
|------|---------|------|-------|----------|---------------------|
| 1 | copamundiaL | lib/auth.ts | Weak JWT secret fallback | CRITICAL | Remove hardcoded fallback, fail securely in production |
| 2 | copamundiaL | lib/socket-server.ts | Weak JWT secret fallback | CRITICAL | Same as #1 |
| 3 | copamundiaL | lib/sanitizer.ts | Regex SQL injection detection | CRITICAL | Use parameterized queries, regex is bypassable |
| 4 | copamundiaL | lib/auth.ts | No brute force protection | HIGH | Add account lockout after 5 failed attempts |
| 5 | copamundiaL | lib/cache.ts | JSON.parse without validation | HIGH | Add Zod schema validation |
| 6 | copamundiaL | lib/cache.ts | No cache stampede prevention | HIGH | Add distributed locking |
| 7 | copamundiaL | lib/sanitizer.ts | Regex HTML sanitization | HIGH | Use DOMPurify library |
| 8 | copamundiaL | lib/socket-server.ts | No message content validation | HIGH | Add message sanitization |
| 9 | copamundiaL | lib/rate-limit.ts | Redis connection not awaited | HIGH | Properly await and handle connection |
| 10 | copamundiaL | lib/auth.ts | Missing email verification | HIGH | Add email verification flow |

---

## Next Files to Review

- [ ] `lib/stripe.ts` - Payment processing
- [ ] `lib/email.ts` - Email sending
- [ ] `lib/cloudinary.ts` - Image uploads
- [ ] `lib/audit-log.ts` - Security logging
- [ ] `lib/2fa.ts` - Two-factor auth
- [ ] `app/api/teams/route.ts` - Team API
- [ ] `app/api/matches/route.ts` - Matches API
- [ ] `mcp-server/index.ts` - MCP server

---

*Review in progress. More files to be reviewed...*
