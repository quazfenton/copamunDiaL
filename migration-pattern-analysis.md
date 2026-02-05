# Next.js 15 API Migration Pattern Analysis

## Reference Implementation Analysis

Based on examination of the successfully migrated reference files (`app/api/matches/[id]/route.ts` and `app/api/notifications/[id]/route.ts`), the following pattern has been established:

### Next.js 15 Pattern Structure

#### 1. Parameter Type Annotation Pattern
**Before (Legacy Pattern):**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
```

**After (Next.js 15 Pattern):**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
```

#### 2. Parameter Access Pattern
**Before (Legacy Pattern):**
```typescript
const { id } = params; // Direct synchronous access
```

**After (Next.js 15 Pattern):**
```typescript
const { id } = await params; // Awaited asynchronous access
```

### Complete Handler Example

**Reference Implementation from `app/api/matches/[id]/route.ts`:**
```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: matchId } = await params; // ← Key pattern: await params
    // ... rest of handler logic remains unchanged
  } catch (error) {
    return handleError(error);
  }
}
```

## Target Files Analysis

### Current Legacy Pattern Usage

All three target files currently use the legacy pattern:

1. **`app/api/teams/[id]/route.ts`**
   - Methods: GET, PATCH, DELETE
   - Current pattern: `{ params }: { params: { id: string } }`
   - Parameter access: `params.id` (direct access)

2. **`app/api/teams/[id]/invites/route.ts`**
   - Methods: POST, GET, PATCH, DELETE
   - Current pattern: `{ params }: { params: { id: string } }`
   - Parameter access: `params.id` (direct access)

3. **`app/api/teams/[id]/messages/route.ts`**
   - Methods: GET, POST
   - Current pattern: `{ params }: { params: { id: string } }`
   - Parameter access: `params.id` (direct access)

### Key Observations

1. **Error Handling**: Some files use imported `handleError` from `@/lib/error-handler`, others define it locally
2. **Authorization Pattern**: All files follow similar session-based authorization
3. **Database Access**: All use Prisma with similar patterns
4. **Response Format**: Consistent NextResponse.json usage
5. **Variable Naming**: Some use destructuring with renaming (e.g., `const { id: matchId } = await params`)

## Migration Checklist Template

### For Each Target File:

#### Phase 1: Type Annotation Updates
- [ ] Update function signature parameter type from `{ params: { id: string } }` to `{ params: Promise<{ id: string }> }`
- [ ] Apply to ALL HTTP method handlers in the file (GET, POST, PATCH, DELETE)
- [ ] Ensure TypeScript compilation passes

#### Phase 2: Parameter Access Updates  
- [ ] Replace direct parameter access `params.id` with `await params` pattern
- [ ] Use destructuring: `const { id } = await params` or `const { id: variableName } = await params`
- [ ] Apply to ALL method handlers consistently
- [ ] Maintain existing variable naming conventions

#### Phase 3: Functionality Verification
- [ ] Ensure all existing logic remains unchanged (authorization, validation, database operations)
- [ ] Verify error handling patterns are preserved
- [ ] Confirm response formats remain identical
- [ ] Check that all imports and dependencies are maintained

#### Phase 4: Testing & Validation
- [ ] Run TypeScript compilation to catch type errors
- [ ] Test each HTTP method with valid parameters
- [ ] Test error conditions (invalid IDs, unauthorized access)
- [ ] Verify responses match pre-migration behavior

## Pattern Consistency Rules

### 1. Type Annotation Consistency
- Always use `Promise<{ id: string }>` for the params type
- Maintain the same destructuring pattern in function signatures
- Keep parameter names consistent (`id` for all dynamic route parameters)

### 2. Parameter Access Consistency
- Always use `await params` before destructuring
- Use destructuring assignment: `const { id } = await params`
- For clarity, consider renaming: `const { id: teamId } = await params`

### 3. Code Structure Preservation
- Keep all existing imports unchanged
- Maintain all existing error handling logic
- Preserve all authorization checks and their positioning
- Keep all database operations and business logic identical

### 4. Error Handling Preservation
- Maintain existing try-catch blocks
- Keep all error response formats unchanged
- Preserve status codes and error messages
- Handle both validation errors and runtime errors consistently

## Implementation Order

1. **Start with `app/api/teams/[id]/route.ts`** (3 methods: GET, PATCH, DELETE)
2. **Continue with `app/api/teams/[id]/invites/route.ts`** (4 methods: POST, GET, PATCH, DELETE)  
3. **Finish with `app/api/teams/[id]/messages/route.ts`** (2 methods: GET, POST)

This order allows for incremental validation and ensures any issues are caught early in simpler files before moving to more complex ones.

## Success Criteria

- [ ] All target files use Next.js 15 Promise-based parameter pattern
- [ ] TypeScript compilation succeeds without errors
- [ ] All HTTP methods respond correctly to requests
- [ ] Parameter extraction works correctly for all routes
- [ ] Error responses remain unchanged from pre-migration behavior
- [ ] Authorization and validation logic functions identically
- [ ] Code structure matches reference implementation patterns