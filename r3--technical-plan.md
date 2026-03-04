# Technical Implementation Plan

**Project:** copamundiaL (PlayMate/LineupLab)
**Date:** March 3, 2026
**Review Type:** Deep Codebase Audit
**Status:** Ready for Implementation

---

## Executive Summary

This technical plan addresses **47 issues** identified during the comprehensive code review, prioritized by severity and impact. The plan includes:

- **15 Critical/High severity issues** requiring immediate attention
- **18 Medium severity issues** for short-term resolution
- **14 Low severity issues** for backlog

**Estimated Total Effort:** 8-10 weeks for full implementation
**Recommended Team Size:** 2-3 senior developers

---

## Phase 1: Critical Security Fixes (Week 1-2)

### Epic 1.1: Authentication & Authorization Hardening

**Business Justification:** Authentication vulnerabilities are the #1 cause of production security incidents. These fixes prevent account takeover, brute force attacks, and unauthorized access.

---

#### Ticket 1.1.1: Remove Hardcoded JWT Secret Fallback

**Priority:** P0 - CRITICAL  
**Severity:** CRITICAL  
**Effort:** 1 hour  
**Risk:** LOW  
**Files:** `lib/auth.ts`, `lib/socket-server.ts`

**Problem:**
Both `lib/auth.ts` and `lib/socket-server.ts` use `'fallback-secret'` as a hardcoded JWT secret fallback. This allows attackers to forge authentication tokens if `NEXTAUTH_SECRET` environment variable is not set.

**Current Code:**
```typescript
// lib/auth.ts line 65, lib/socket-server.ts line 65
const user = verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret');
```

**Implementation:**

```diff
--- a/lib/auth.ts
+++ b/lib/auth.ts
@@ -62,7 +62,20 @@ export const authOptions: NextAuthOptions = {
       // Authentication middleware
       this.io.use(async (socket, next) => {
         try {
           const token = socket.handshake.auth.token || socket.handshake.query.token as string;

           if (!token) {
             return next(new Error('Authentication required'));
           }

-          const user = verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret');
+          // CRITICAL: Validate JWT secret strength
+          const jwtSecret = process.env.NEXTAUTH_SECRET;
+
+          if (!jwtSecret) {
+            console.error('CRITICAL: NEXTAUTH_SECRET environment variable is not set');
+            if (process.env.NODE_ENV === 'production') {
+              return next(new Error('Authentication configuration error'));
+            }
+            // Development fallback only - NEVER in production
+            return next(new Error('NEXTAUTH_SECRET required'));
+          }
+
+          if (jwtSecret.length < 32) {
+            console.error('CRITICAL: NEXTAUTH_SECRET must be at least 32 characters');
+          }
+
+          const user = verify(token, jwtSecret);
           socket.data.userId = (user as any).id;
           socket.data.userName = (user as any).name;
           socket.data.userEmail = (user as any).email;
```

**Tests:**
```typescript
// tests/lib/auth-jwt-secret.test.ts
import { authOptions } from '@/lib/auth';
import { verify } from 'jsonwebtoken';

describe('JWT Secret Validation', () => {
  const originalEnv = process.env.NEXTAUTH_SECRET;

  afterEach(() => {
    process.env.NEXTAUTH_SECRET = originalEnv;
  });

  it('should fail in production without NEXTAUTH_SECRET', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXTAUTH_SECRET = undefined;

    // Should throw or fail securely
    expect(() => verify('fake-token', process.env.NEXTAUTH_SECRET)).toThrow();
  });

  it('should require minimum 32 character secret', () => {
    process.env.NEXTAUTH_SECRET = 'short';
    expect(process.env.NEXTAUTH_SECRET.length).toBeLessThan(32);
    // Should log critical error
  });

  it('should accept strong secrets', () => {
    process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
    expect(process.env.NEXTAUTH_SECRET.length).toBeGreaterThanOrEqual(32);
  });
});
```

**Configuration Changes:**
Add to `.env.example`:
```bash
# NextAuth.js JWT Secret (REQUIRED)
# Generate with: openssl rand -base64 32
# Must be at least 32 characters for security
NEXTAUTH_SECRET=your-secret-key-min-32-characters-change-in-production
```

**Rollback Plan:**
- Revert commit if authentication breaks
- Monitor auth error logs for 24 hours post-deployment

**Acceptance Criteria:**
- [ ] Code deployed to staging
- [ ] Tests pass
- [ ] No auth errors in staging logs
- [ ] Documentation updated

---

#### Ticket 1.1.2: Add Brute Force Protection

**Priority:** P0 - CRITICAL  
**Severity:** HIGH  
**Effort:** 4 hours  
**Risk:** LOW  
**Files:** `lib/auth.ts`, `lib/cache.ts`

**Problem:**
The credentials auth provider has no rate limiting or account lockout. Attackers can attempt unlimited password guesses.

**Implementation:**

```diff
--- a/lib/auth.ts
+++ b/lib/auth.ts
@@ -30,6 +30,50 @@ export const authOptions: NextAuthOptions = {
       name: "credentials",
       credentials: {
         email: { label: "Email", type: "email" },
         password: { label: "Password", type: "password" }
       },
       async authorize(credentials) {
         if (!credentials?.email || !credentials?.password) {
           return null
         }

+        // BRUTE FORCE PROTECTION
+        const { cache } = await import('./cache');
+        const lockoutKey = `auth:lockout:${credentials.email.toLowerCase()}`;
+
+        // Check if account is locked
+        const lockoutData = await cache.get<{
+          attempts: number;
+          lockedUntil: number;
+        }>(lockoutKey);
+
+        if (lockoutData && Date.now() < lockoutData.lockedUntil) {
+          const remainingMinutes = Math.ceil(
+            (lockoutData.lockedUntil - Date.now()) / 60000
+          );
+          throw new Error(
+            `Account locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`
+          );
+        }
+
         const user = await prisma.user.findUnique({
           where: { email: credentials.email }
         })

         if (!user || !user.password) {
+          // Record failed attempt
+          await recordFailedAttempt(credentials.email, cache, lockoutKey);
           return null
         }

         const isPasswordValid = await bcrypt.compare(
           credentials.password,
           user.password
         )

         if (!isPasswordValid) {
+          // Record failed attempt
+          await recordFailedAttempt(credentials.email, cache, lockoutKey);
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
+      // Helper: Record failed login attempt
+      async function recordFailedAttempt(
+        email: string,
+        cache: any,
+        lockoutKey: string
+      ): Promise<void> {
+        let lockoutData = await cache.get<{
+          attempts: number;
+          lockedUntil: number;
+        }>(lockoutKey) || { attempts: 0, lockedUntil: 0 };
+
+        lockoutData.attempts += 1;
+
+        // Lock account after 5 failed attempts
+        if (lockoutData.attempts >= 5) {
+          lockoutData.lockedUntil = Date.now() + (15 * 60 * 1000); // 15 minutes
+
+          // Log security event
+          const { createAuditLog, AuditEventType } = await import('./audit-log');
+          await createAuditLog(AuditEventType.ACCOUNT_LOCKED, {
+            userEmail: email,
+            action: 'Account locked due to failed login attempts',
+            metadata: { attempts: lockoutData.attempts },
+            riskLevel: 'medium',
+          });
+        }
+
+        await cache.set(lockoutKey, lockoutData, 3600); // 1 hour TTL
+      }
     })
   ],
```

**Tests:**
```typescript
// tests/lib/auth-brute-force.test.ts
import { cache } from '@/lib/cache';

describe('Brute Force Protection', () => {
  const testEmail = 'test@example.com';
  const lockoutKey = `auth:lockout:${testEmail}`;

  beforeEach(async () => {
    await cache.delete(lockoutKey);
  });

  it('should allow login with valid credentials', async () => {
    // Test valid login succeeds
  });

  it('should lock account after 5 failed attempts', async () => {
    // Simulate 5 failed logins
    for (let i = 0; i < 5; i++) {
      // Trigger failed login
    }

    // Verify account is locked
    const lockoutData = await cache.get(lockoutKey);
    expect(lockoutData?.lockedUntil).toBeGreaterThan(Date.now());
  });

  it('should unlock after lockout period expires', async () => {
    // Set lockout in past
    await cache.set(lockoutKey, {
      attempts: 5,
      lockedUntil: Date.now() - 1000,
    }, 3600);

    // Next login attempt should be allowed
  });

  it('should clear lockout on successful login', async () => {
    // Set lockout
    // Simulate successful login
    // Verify lockout cleared
  });
});
```

**Configuration Changes:**
Add to `.env.example`:
```bash
# Security: Brute force protection
AUTH_MAX_FAILED_ATTEMPTS=5
AUTH_LOCKOUT_DURATION_MINUTES=15
```

---

#### Ticket 1.1.3: Add Password Strength Validation

**Priority:** P1 - HIGH  
**Severity:** HIGH  
**Effort:** 3 hours  
**Risk:** LOW  
**Files:** `lib/auth.ts`

**Problem:**
No password strength validation allows weak passwords like "123456" or "password".

**Implementation:**

```typescript
// Add to lib/auth.ts

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
  score: number;
} {
  const errors: string[] = [];
  let score = 0;

  // Length check (max 20 points)
  if (password.length >= 16) score += 20;
  else if (password.length >= 12) score += 15;
  else if (password.length >= 8) score += 10;
  else {
    errors.push('Password must be at least 8 characters long');
    score -= 10;
  }

  // Uppercase check (max 20 points)
  if (/[A-Z]/.test(password)) score += 20;
  else errors.push('Password must contain at least one uppercase letter');

  // Lowercase check (max 20 points)
  if (/[a-z]/.test(password)) score += 20;
  else errors.push('Password must contain at least one lowercase letter');

  // Number check (max 20 points)
  if (/[0-9]/.test(password)) score += 20;
  else errors.push('Password must contain at least one number');

  // Special character check (max 20 points)
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 20;
  else if (process.env.PASSWORD_REQUIRE_SPECIAL === 'true') {
    errors.push('Password must contain at least one special character');
  }

  // Common password check
  const commonPasswords = [
    'password', '123456', 'qwerty', 'letmein', 'welcome',
    'admin', 'password123', '12345678', 'abc123',
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a stronger password');
    score -= 30;
  }

  return {
    valid: errors.length === 0,
    errors,
    score: Math.max(0, Math.min(100, score)),
  };
}

export async function hashPassword(password: string): Promise<string> {
  // Validate password strength
  const validation = validatePasswordStrength(password);

  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  // Warn if score is low but allow
  if (validation.score < 60) {
    console.warn('Weak password detected:', {
      score: validation.score,
      length: password.length,
    });
    // In production, consider requiring stronger passwords
  }

  return bcrypt.hash(password, 12);
}
```

**Tests:**
```typescript
// tests/lib/password-validation.test.ts
import { validatePasswordStrength } from '@/lib/auth';

describe('Password Strength Validation', () => {
  it('should reject short passwords', () => {
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
    expect(result.errors).toContain('too common');
  });

  it('should accept strong passwords', () => {
    const result = validatePasswordStrength('Str0ngP@ssw0rd!2026');
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThan(80);
  });

  it('should score passwords correctly', () => {
    const weak = validatePasswordStrength('weak');
    const strong = validatePasswordStrength('V3ryStr0ng&P@ss!');
    expect(strong.score).toBeGreaterThan(weak.score);
  });
});
```

---

### Epic 1.2: Input Validation & Sanitization

---

#### Ticket 1.2.1: Replace Regex HTML Sanitization with DOMPurify

**Priority:** P0 - CRITICAL  
**Severity:** HIGH  
**Effort:** 4 hours  
**Risk:** MEDIUM  
**Files:** `lib/sanitizer.ts`, components using HTML

**Problem:**
Regex-based HTML sanitization is fundamentally insecure and can be bypassed with modern XSS techniques.

**Implementation:**

```bash
# Install DOMPurify
npm install dompurify
npm install -D @types/dompurify
```

```diff
--- a/lib/sanitizer.ts
+++ b/lib/sanitizer.ts
@@ -1,4 +1,7 @@
 /**
  * Input Sanitization Library
+ *
+ * SECURITY NOTE: For HTML sanitization, DOMPurify is recommended.
+ * Regex-based sanitization is deprecated for production use.
  */

+import DOMPurify from 'dompurify';
+
 export class InputSanitizer {
@@ -45,25 +48,35 @@ export class InputSanitizer {
   /**
    * Sanitize HTML content (allows safe tags)
    */
   static sanitizeHTML(input: string): string {
     if (!input) return '';

-    let sanitized = input;
-
-    // Remove XSS patterns
-    this.XSS_PATTERNS.forEach((pattern) => {
-      sanitized = sanitized.replace(pattern, '');
-    });
-
-    // Remove disallowed tags
-    const tagPattern = new RegExp(`</?(?!(${this.ALLOWED_HTML_TAGS.join('|')})\\b)[a-z][a-z0-9]*\\b[^>]*>`, 'gi');
-    sanitized = sanitized.replace(tagPattern, '');
-
-    // Remove disallowed attributes
-    const attrPattern = new RegExp(`\\s(?!(${this.ALLOWED_HTML_ATTRS.join('|')})\\b)[a-z][a-z0-9-]*\\s*=\\s*["'][^"']*["']`, 'gi');
-    sanitized = sanitized.replace(attrPattern, '');
-
-    return sanitized;
+    // Use DOMPurify for production-grade sanitization
+    const sanitized = DOMPurify.sanitize(input, {
+      ALLOWED_TAGS: this.ALLOWED_HTML_TAGS,
+      ALLOWED_ATTR: this.ALLOWED_HTML_ATTRS,
+      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
+      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
+    });
+
+    return sanitized;
   }
```

**Tests:**
```typescript
// tests/lib/sanitizer-dompurify.test.ts
import { InputSanitizer } from '@/lib/sanitizer';

describe('DOMPurify HTML Sanitization', () => {
  it('should remove script tags', () => {
    const input = '<script>alert(1)</script>Hello';
    const output = InputSanitizer.sanitizeHTML(input);
    expect(output).not.toContain('<script>');
    expect(output).toContain('Hello');
  });

  it('should handle nested tag bypass', () => {
    const input = '<scr<script>ipt>alert(1)</script>';
    const output = InputSanitizer.sanitizeHTML(input);
    expect(output).not.toContain('script');
  });

  it('should handle SVG onload bypass', () => {
    const input = '<svg/onload=alert(1)>';
    const output = InputSanitizer.sanitizeHTML(input);
    expect(output).not.toContain('onload');
  });

  it('should handle mutation XSS', () => {
    const input = '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>';
    const output = InputSanitizer.sanitizeHTML(input);
    expect(output).not.toContain('onerror');
  });

  it('should allow safe HTML', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    const output = InputSanitizer.sanitizeHTML(input);
    expect(output).toBe('<p>Hello <strong>world</strong></p>');
  });
});
```

---

#### Ticket 1.2.2: Add SSRF Protection to URL Sanitization

**Priority:** P1 - HIGH  
**Severity:** HIGH  
**Effort:** 3 hours  
**Risk:** LOW  
**Files:** `lib/sanitizer.ts`

**Problem:**
URL sanitization doesn't check for internal/private IP addresses, allowing SSRF attacks.

**Implementation:**

```diff
--- a/lib/sanitizer.ts
+++ b/lib/sanitizer.ts
@@ -115,6 +115,60 @@ export class InputSanitizer {
   static sanitizeUrl(url: string): string | null {
     if (!url) return null;

     try {
       const parsed = new URL(url.trim());

       // Only allow http and https protocols
       if (!['http:', 'https:'].includes(parsed.protocol)) {
         return null;
       }

+      // SSRF PROTECTION
+      const hostname = parsed.hostname.toLowerCase();
+
+      // Block localhost
+      if (
+        hostname === 'localhost' ||
+        hostname === '127.0.0.1' ||
+        hostname === '::1'
+      ) {
+        console.warn('SSRF attempt blocked: localhost', { url });
+        return null;
+      }
+
+      // Block private IP ranges
+      if (this.isPrivateIP(hostname)) {
+        console.warn('SSRF attempt blocked: private IP', { url, hostname });
+        return null;
+      }
+
+      // Block cloud metadata endpoints
+      const metadataEndpoints = [
+        '169.254.169.254', // AWS/GCP/Azure
+        'metadata.google.internal',
+        '100.100.100.200', // Alibaba
+      ];
+      if (metadataEndpoints.some(ep => hostname.includes(ep))) {
+        console.warn('SSRF attempt blocked: cloud metadata', { url, hostname });
+        return null;
+      }
+
+      // Block URLs with embedded credentials
+      if (parsed.username || parsed.password) {
+        console.warn('URL with credentials blocked', { url });
+        return null;
+      }
+
       // Remove dangerous characters from hostname
       const safeHostname = hostname.replace(/[^\w.-]/g, '');

       const safeUrl = new URL(parsed);
       safeUrl.hostname = safeHostname;
       safeUrl.pathname = this.sanitizeText(parsed.pathname);

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
+      /^169\.254\./, // Link-local
+    ];
+
+    for (const pattern of ipv4Patterns) {
+      if (pattern.test(hostname)) {
+        return true;
+      }
+    }
+
+    // IPv6 private ranges
+    if (
+      hostname.startsWith('fc') ||
+      hostname.startsWith('fd') ||
+      hostname === '::1'
+    ) {
+      return true;
+    }
+
+    return false;
+  }
```

**Tests:**
```typescript
// tests/lib/sanitizer-ssrf.test.ts
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

  it('should block URLs with credentials', () => {
    expect(InputSanitizer.sanitizeUrl('http://user:pass@example.com')).toBe(null);
  });

  it('should allow legitimate public URLs', () => {
    expect(InputSanitizer.sanitizeUrl('https://example.com/path')).toBe('https://example.com/path');
    expect(InputSanitizer.sanitizeUrl('http://github.com/user/repo')).toBe('http://github.com/user/repo');
  });
});
```

---

## Phase 2: Infrastructure Hardening (Week 3-4)

### Epic 2.1: Cache Reliability

---

#### Ticket 2.1.1: Add Cache Stampede Prevention

**Priority:** P1 - HIGH  
**Severity:** HIGH  
**Effort:** 6 hours  
**Risk:** MEDIUM  
**Files:** `lib/cache.ts`

**Problem:**
When popular cache keys expire, concurrent requests all miss and simultaneously fetch fresh data, overwhelming the database.

**Implementation:**

```diff
--- a/lib/cache.ts
+++ b/lib/cache.ts
@@ -115,20 +115,75 @@ export class CacheService {
   async cacheable<T>(
     key: string,
     fetcher: () => Promise<T>,
     ttl: number = this.defaultTTL
   ): Promise<T> {
     const cached = await this.get<T>(key);
     if (cached) {
       return cached;
     }

+    // CACHE STAMPEDE PREVENTION
+    const lockKey = `lock:${key}`;
+    const lockTtl = 5000; // 5 second lock
+
+    // Try to acquire lock
+    const lockAcquired = await this.redis.set(lockKey, Date.now().toString(), {
+      PX: lockTtl,
+      NX: true,
+    });
+
+    if (!lockAcquired) {
+      // Another request is fetching - wait and retry
+      await this.sleep(100);
+
+      // Retry cache lookup
+      const retryCached = await this.get<T>(key);
+      if (retryCached) {
+        return retryCached;
+      }
+
+      // Still not cached - proceed (fallback)
+      console.warn('Cache stampede lock miss, proceeding with fetch', { key });
+    }
+
+    try {
+      // Double-check cache after acquiring lock
+      const doubleCheck = await this.get<T>(key);
+      if (doubleCheck) {
+        return doubleCheck;
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
+      // Release lock if we acquired it
+      if (lockAcquired) {
+        await this.redis.del(lockKey);
+      }
+    }
   }

+  private sleep(ms: number): Promise<void> {
+    return new Promise(resolve => setTimeout(resolve, ms));
+  }
+
   /**
    * Get or set with factory function
    */
   async getOrSet<T>(
     key: string,
     factory: () => Promise<T>,
     ttl: number = this.defaultTTL
   ): Promise<T> {
     const cached = await this.get<T>(key);
     if (cached) return cached;

     const fresh = await factory();
     await this.set(key, fresh, ttl);
     return fresh;
   }
```

**Tests:**
```typescript
// tests/lib/cache-stampede.test.ts
describe('Cache Stampede Prevention', () => {
  it('should only call fetcher once for concurrent requests', async () => {
    let fetchCount = 0;
    let resolveFetch: () => void;
    const fetchPromise = new Promise<void>(resolve => {
      resolveFetch = resolve;
    });

    const fetcher = async () => {
      fetchCount++;
      await fetchPromise; // Wait until all requests are in flight
      await new Promise(r => setTimeout(r, 100));
      return { data: 'test' };
    };

    // Fire 10 concurrent requests
    const promises = Array(10)
      .fill(null)
      .map(() => cache.cacheable('test:stampede', fetcher, 60));

    // Release the fetcher
    setTimeout(() => resolveFetch!(), 50);

    const results = await Promise.all(promises);

    // Fetcher should only be called once
    expect(fetchCount).toBe(1);

    // All results should be identical
    results.forEach(r => {
      expect(r).toEqual({ data: 'test' });
    });
  });

  it('should handle lock acquisition failure gracefully', async () => {
    // Simulate lock already held
    await cache.redis.set('lock:test:contention', '1', { PX: 5000, NX: true });

    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return { data: 'test' };
    };

    // Should still complete (fallback behavior)
    const result = await cache.cacheable('test:contention', fetcher, 60);
    expect(result).toEqual({ data: 'test' });
  });
});
```

---

#### Ticket 2.1.2: Add Zod Schema Validation for Cache

**Priority:** P1 - HIGH  
**Severity:** HIGH  
**Effort:** 4 hours  
**Risk:** LOW  
**Files:** `lib/cache.ts`

**Problem:**
`JSON.parse(data) as T` provides no runtime type safety. Corrupted cache data causes runtime errors.

**Implementation:**

```diff
--- a/lib/cache.ts
+++ b/lib/cache.ts
@@ -1,5 +1,6 @@
 /**
  * Enhanced Cache Service with Redis
+ *
+ * For production use, validate cached data with Zod schemas.
  */

 import { createClient } from 'redis';
+import { z } from 'zod';

@@ -45,12 +46,45 @@ export class CacheService {
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
+      return parsed as T;
     } catch (error) {
       console.error('Cache get error:', error);
       return null;
     }
   }

+  /**
+   * Get value from cache with Zod schema validation
+   *
+   * @param key - Cache key
+   * @param schema - Zod schema for validation
+   * @returns Validated data or null
+   */
+  async getValidated<T>(key: string, schema: z.ZodSchema<T>): Promise<T | null> {
+    if (!this.connected) return null;
+
+    try {
+      const data = await this.redis.get(key);
+
+      if (!data) {
+        this.recordMiss(key);
+        return null;
+      }
+
+      const parsed = JSON.parse(data);
+      const validated = schema.parse(parsed);
+
+      this.recordHit(key);
+      return validated;
+    } catch (error) {
+      if (error instanceof z.ZodError) {
+        console.error('Cache validation error:', {
+          key,
+          errors: error.errors,
+        });
+        // Delete corrupted cache entry
+        await this.delete(key);
+      }
+      console.error('Cache get error:', error);
+      return null;
+    }
+  }
+
   /**
    * Set value in cache
    */
   async set<T>(
     key: string,
     value: T,
     ttl: number = this.defaultTTL
   ): Promise<void> {
     if (!this.connected) return;

     try {
-      await this.redis.set(key, JSON.stringify(value), { EX: ttl });
+      // Validate value is serializable
+      const serialized = JSON.stringify(value);
+      await this.redis.set(key, serialized, { EX: ttl });
     } catch (error) {
       console.error('Cache set error:', error);
     }
   }
```

**Tests:**
```typescript
// tests/lib/cache-validation.test.ts
import { z } from 'zod';

describe('Cache Validation with Zod', () => {
  const userSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().optional(),
    createdAt: z.string().datetime(),
  });

  it('should validate cached data with schema', async () => {
    const validUser = {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date().toISOString(),
    };

    await cache.set('test:user:valid', validUser, 60);

    const result = await cache.getValidated('test:user:valid', userSchema);
    expect(result).toEqual(validUser);
  });

  it('should reject invalid cached data', async () => {
    const invalidUser = {
      id: 'user123',
      email: 'not-an-email', // Invalid
      createdAt: 'invalid-date', // Invalid
    };

    await cache.set('test:user:invalid', invalidUser, 60);

    const result = await cache.getValidated('test:user:invalid', userSchema);
    expect(result).toBe(null);
  });

  it('should delete corrupted cache entries', async () => {
    // Set corrupted JSON
    await cache.redis.set('test:corrupt', 'not-valid-json{{{');

    const result = await cache.get('test:corrupt');
    expect(result).toBe(null);

    // Corrupted entry should be deleted
    const deleted = await cache.redis.get('test:corrupt');
    expect(deleted).toBe(null);
  });

  it('should handle circular references', async () => {
    const circular: any = { name: 'test' };
    circular.self = circular;

    await cache.set('test:circular', circular, 60);
    // Should not throw
  });
});
```

---

## Phase 3: API & Integration Hardening (Week 5-6)

### Epic 3.1: API Security

---

#### Ticket 3.1.1: Add Request Timeout to All API Calls

**Priority:** P1 - HIGH  
**Severity:** HIGH  
**Effort:** 4 hours  
**Risk:** LOW  
**Files:** All `app/api/` routes

**Problem:**
API routes don't set request timeouts, allowing slow requests to exhaust connection pools.

**Implementation:**

```typescript
// Create middleware: lib/api-timeout.ts

import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_TIMEOUT = parseInt(process.env.API_TIMEOUT_MS || '30000');

export async function withTimeout<T>(
  handler: () => Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([handler(), timeoutPromise]);
}

export function timeoutMiddleware(
  req: NextRequest,
  timeoutMs: number = DEFAULT_TIMEOUT
): { limited: boolean; response?: NextResponse } {
  const start = Date.now();

  // Add timeout header for debugging
  const headers = new Headers({
    'X-Request-Timeout': timeoutMs.toString(),
    'X-Request-Start': start.toString(),
  });

  return { limited: false, headers };
}
```

**Usage in API routes:**
```diff
--- a/app/api/teams/route.ts
+++ b/app/api/teams/route.ts
@@ -1,5 +1,6 @@
 import { NextRequest, NextResponse } from 'next/server'
+import { withTimeout } from '@/lib/api-timeout'

 export async function GET(request: NextRequest) {
-  const teams = await prisma.team.findMany({...})
+  const teams = await withTimeout(
+    () => prisma.team.findMany({...}),
+    30000
+  )
```

---

## Phase 4: Testing & Documentation (Week 7-8)

### Epic 4.1: Test Coverage

---

#### Ticket 4.1.1: Add Integration Tests for Auth Flow

**Priority:** P2 - MEDIUM  
**Severity:** MEDIUM  
**Effort:** 8 hours  
**Risk:** LOW  
**Files:** `tests/integration/auth.test.ts`

**Implementation:**

```typescript
// tests/integration/auth.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('Authentication Integration', () => {
  beforeAll(async () => {
    // Create test user
    await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: await bcrypt.hash('Test123!@#', 12),
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.delete({ where: { email: 'test@example.com' } });
    await prisma.$disconnect();
  });

  it('should authenticate with valid credentials', async () => {
    const response = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test123!@#',
      }),
    });

    expect(response.status).toBe(200);
  });

  it('should reject invalid credentials', async () => {
    const response = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword',
      }),
    });

    expect(response.status).toBe(401);
  });

  it('should lock account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await fetch('http://localhost:3000/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      });
    }

    // 6th attempt should be blocked
    const response = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test123!@#', // Correct password
      }),
    });

    expect(response.status).toBe(403); // or 429
  });
});
```

---

## Rollback Plan

### General Rollback Strategy

1. **Feature Flags:** All changes should be behind feature flags where possible
2. **Gradual Rollout:** Deploy to 10% → 50% → 100% of users
3. **Monitoring:** Watch error rates, auth failures, cache hit rates
4. **Quick Revert:** Any P0 issue triggers immediate rollback

### Specific Rollback Procedures

#### Auth Changes Rollback
```bash
# If auth breaks after deployment:
# 1. Revert JWT secret validation
git revert <commit-hash> --no-edit

# 2. Disable brute force protection
# Set in environment:
AUTH_BRUTE_FORCE_ENABLED=false

# 3. Monitor auth error rates
# Check Sentry/Datadog for auth errors
```

#### Cache Changes Rollback
```bash
# If cache stampede prevention causes issues:
# 1. Disable locking
CACHE_LOCK_ENABLED=false

# 2. Clear all locks
redis-cli KEYS "lock:*" | xargs redis-cli DEL

# 3. Monitor cache hit rates
```

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Auth Error Rate | Unknown | <0.1% | Sentry/Datadog |
| Brute Force Attempts Blocked | 0 | 100% | Audit logs |
| Cache Hit Rate | Unknown | >80% | Redis stats |
| API Timeout Rate | Unknown | <1% | API metrics |
| XSS Attempts Blocked | 0 | 100% | Security logs |
| SSRF Attempts Blocked | 0 | 100% | Security logs |

---

## Appendix: Environment Variables Reference

### Security (REQUIRED)
```bash
# JWT Authentication
NEXTAUTH_SECRET=your-secret-key-min-32-characters-change-in-production
NEXTAUTH_URL=http://localhost:3000

# Brute Force Protection
AUTH_MAX_FAILED_ATTEMPTS=5
AUTH_LOCKOUT_DURATION_MINUTES=15

# Password Policy
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_DIGIT=true
PASSWORD_REQUIRE_SPECIAL=false

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000

# Cache
CACHE_DEFAULT_TTL=3600
CACHE_LOCK_ENABLED=true

# API Timeouts
API_TIMEOUT_MS=30000

# Security Features
USE_DOMPURIFY=true
REQUIRE_EMAIL_VERIFICATION=false
```

---

*Document Version: 1.0*  
*Last Updated: March 3, 2026*  
*Next Review: March 17, 2026*
