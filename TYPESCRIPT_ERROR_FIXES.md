# CopaMundial - TypeScript Error Fix Report

**Date:** March 3, 2026  
**Total Errors Found:** 148  
**Status:** Being Fixed

---

## Critical Errors by Category

### 1. Missing Dependencies (2 errors)
- ❌ `jsonwebtoken` - Required for socket auth
- ❌ `@types/jsonwebtoken` - TypeScript types

**Fix:**
```bash
npm install jsonwebtoken @types/jsonwebtoken
```

### 2. API Response Helper Method Names (12 errors)

**File:** `lib/api-response.ts`

**Issue:** Methods don't match usage

**Current:**
```typescript
export function errorResponse(code: string, message: string, status = 400)
export function successResponse<T>(data: T, status = 200)
```

**Usage expects:**
```typescript
errorResponse.unauthorized('message')
errorResponse.notFound('message')
errorResponse.forbidden('message')
errorResponse.badRequest('message')
errorResponse.internal('message')
successResponse.ok(data)
successResponse.created(data)
```

**Fix:** Add convenience methods to errorResponse and successResponse

### 3. Missing Audit Event Types (6 errors)

**File:** `lib/audit-log.ts`

**Issue:** AuditEventType enum doesn't include new event types

**Missing Events:**
- `NOTIFICATION_CREATED`
- `PLAYER_PROFILE_UPDATED`
- `TEAM_CREATED`
- `TOURNAMENT_CREATED`
- `PAYMENT_SUCCEEDED`
- `PAYMENT_FAILED`
- `PAYMENT_DISPUTE`
- `TOURNAMENT_REGISTRATION`

**Fix:** Add to AuditEventType enum

### 4. Implicit 'any' Types (80+ errors)

**Pattern:**
```typescript
// Before
array.map(item => ...)

// After
array.map((item: any) => ...)
// Or better
array.map((item: ItemType) => ...)
```

### 5. MCP SDK API Changes (20+ errors)

**File:** `mcp-server/index.ts`

**Issue:** MCP SDK API has changed - `server.tool` and `server.resource` methods don't exist

**Fix:** Update to use correct MCP SDK API or downgrade SDK version

### 6. Socket.IO Client Option Name (1 error)

**File:** `hooks/use-socket-client.ts`

**Issue:** `reconnectionAttempts` should be `reconnectAttempts`

### 7. Module Import Path (1 error)

**File:** `lib/ai/formation-recommender.ts`

**Issue:** Cannot find module './rating-engine'

**Fix:** Change to `'../rating-engine'`

### 8. Headers API (1 error)

**File:** `app/api/webhooks/stripe/route.ts`

**Issue:** `headers()` returns Promise in Next.js 15

**Fix:** Await headers() call

---

## Fix Priority

### P0 - Critical (Breaks Build)
1. ✅ Install missing dependencies
2. ✅ Fix api-response helper methods
3. ✅ Fix audit event types
4. ✅ Fix module import paths

### P1 - High (Type Safety)
1. ⏸️ Add type annotations to reduce 'any' types
2. ⏸️ Fix MCP SDK compatibility

### P2 - Medium (Code Quality)
1. ⏸️ Fix remaining implicit 'any' types
2. ⏸️ Add proper error handling

---

## Commands to Run

```bash
# Install missing dependencies
npm install jsonwebtoken @types/jsonwebtoken --legacy-peer-deps

# Run type check
npm run typecheck
```

---

**Status:** Fixes in progress  
**Estimated Time:** 30-45 minutes for critical fixes
