# Individual File Migration Checklists

## File 1: `app/api/teams/[id]/route.ts`

### Current State Analysis
- **Methods**: GET, PATCH, DELETE
- **Parameter Usage**: `params.id` (direct access in all methods)
- **Special Notes**: 
  - Uses local `handleError` function (not imported)
  - Complex team data formatting in GET method
  - Authorization checks for captains/creators in PATCH/DELETE

### Migration Checklist

#### Type Annotation Updates
- [ ] Update GET method signature: `{ params }: { params: Promise<{ id: string }> }`
- [ ] Update PATCH method signature: `{ params }: { params: Promise<{ id: string }> }`
- [ ] Update DELETE method signature: `{ params }: { params: Promise<{ id: string }> }`

#### Parameter Access Updates
- [ ] GET method: Replace `params.id` with `const { id } = await params`
- [ ] PATCH method: Replace `params.id` with `const { id } = await params`
- [ ] DELETE method: Replace `params.id` with `const { id } = await params`

#### Verification Points
- [ ] All Prisma queries use the correct `id` variable
- [ ] Authorization logic remains unchanged
- [ ] Complex team formatting logic preserved
- [ ] Error handling with local `handleError` function works
- [ ] Response structures remain identical

---

## File 2: `app/api/teams/[id]/invites/route.ts`

### Current State Analysis
- **Methods**: POST, GET, PATCH, DELETE
- **Parameter Usage**: `params.id` (used as `teamId` in POST/GET, as `inviteId` in PATCH/DELETE)
- **Special Notes**:
  - Uses imported `handleError` from `@/lib/error-handler`
  - Complex authorization logic for team captains/creators
  - PATCH/DELETE methods treat `params.id` as `inviteId`, not `teamId`
  - Enum usage for `InviteStatus`

### Migration Checklist

#### Type Annotation Updates
- [ ] Update POST method signature: `{ params }: { params: Promise<{ id: string }> }`
- [ ] Update GET method signature: `{ params }: { params: Promise<{ id: string }> }`
- [ ] Update PATCH method signature: `{ params }: { params: Promise<{ id: string }> }`
- [ ] Update DELETE method signature: `{ params }: { params: Promise<{ id: string }> }`

#### Parameter Access Updates
- [ ] POST method: Replace `const teamId = params.id` with `const { id: teamId } = await params`
- [ ] GET method: Replace `const teamId = params.id` with `const { id: teamId } = await params`
- [ ] PATCH method: Replace `const inviteId = params.id` with `const { id: inviteId } = await params`
- [ ] DELETE method: Replace `const inviteId = params.id` with `const { id: inviteId } = await params`

#### Verification Points
- [ ] POST/GET methods correctly use `teamId` for team operations
- [ ] PATCH/DELETE methods correctly use `inviteId` for invite operations
- [ ] Complex authorization checks for team captains/creators preserved
- [ ] InviteStatus enum usage maintained
- [ ] Team member creation logic in PATCH method works correctly
- [ ] Imported `handleError` function continues to work

---

## File 3: `app/api/teams/[id]/messages/route.ts`

### Current State Analysis
- **Methods**: GET, POST
- **Parameter Usage**: `params.id` (used as `teamId` in both methods)
- **Special Notes**:
  - Uses imported `handleError` from `@/lib/error-handler`
  - Socket.IO integration for real-time messaging
  - Team membership verification required
  - Pagination support in GET method

### Migration Checklist

#### Type Annotation Updates
- [ ] Update GET method signature: `{ params }: { params: Promise<{ id: string }> }`
- [ ] Update POST method signature: `{ params }: { params: Promise<{ id: string }> }`

#### Parameter Access Updates
- [ ] GET method: Replace `const teamId = params.id` with `const { id: teamId } = await params`
- [ ] POST method: Replace `const teamId = params.id` with `const { id: teamId } = await params`

#### Verification Points
- [ ] Team membership verification logic preserved
- [ ] Pagination parameters (take/skip) handling unchanged
- [ ] Socket.IO event emission continues to work
- [ ] Message creation and retrieval logic maintained
- [ ] Session handling and user extraction preserved
- [ ] Imported `handleError` function continues to work

---

## Cross-File Validation Checklist

After completing all individual file migrations:

### Pattern Consistency
- [ ] All files use identical parameter type annotation: `{ params: Promise<{ id: string }> }`
- [ ] All files use consistent parameter access pattern: `const { id } = await params` or `const { id: variableName } = await params`
- [ ] Variable naming follows logical conventions (teamId for team operations, inviteId for invite operations)

### Functionality Preservation
- [ ] All HTTP methods respond correctly to valid requests
- [ ] Error handling produces identical responses to pre-migration
- [ ] Authorization logic works correctly across all endpoints
- [ ] Database operations complete successfully
- [ ] Socket.IO events (where applicable) continue to emit

### Integration Testing
- [ ] Team creation → team retrieval flow works
- [ ] Team invite → acceptance → membership flow works  
- [ ] Team messaging → real-time updates flow works
- [ ] Team deletion → cleanup flow works
- [ ] Cross-endpoint authorization consistency maintained

### Performance & Type Safety
- [ ] TypeScript compilation succeeds without warnings
- [ ] No runtime errors when accessing parameters
- [ ] Response times remain consistent with pre-migration
- [ ] Memory usage patterns unchanged