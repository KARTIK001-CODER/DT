# Day 5: React State & Component Design

## Context: Document Approval Workflow

A React application for managing document version history with approval permissions, demonstrating proper state ownership, reusable components, and comprehensive state handling.

## Quick Start

```bash
# Install dependencies (already done)
npm install

# Run the development server
npm run dev
```

The app will open at `http://localhost:1234` (Parcel default)

## What You'll See

- **Loading State**: Spinner with message during 1.5s simulated API fetch
- **Document Version List**: Expandable version cards with approval actions
- **Approval Workflow**: Click "Approve" to approve pending versions (only if you have approver permission)
- **Edge Case Demo**: "Simulate Auto-Approve All" button demonstrates concurrent approval handling

## 3 Reusable Components

### 1. PermissionBadge
Pure presentational component for displaying permission levels (owner/editor/viewer/approver) with color-coded badges.

**Props:**
- `permission` (string): Permission level
- `size` (enum: small/medium/large): Badge size

**State:** None (pure props-driven)

### 2. ApprovalStatus
Shows approval status with icons and approver information.

**Props:**
- `status` (enum: pending/approved/rejected): Approval status
- `approver` (string | null): Name of approver

**State:** None (pure props-driven)

### 3. DocumentVersionList
Displays version history with expand/collapse functionality and approval actions.

**Props:**
- `versions` (array): List of document versions
- `currentUser` (object): Current user with permissions
- `onApprove` (function): Callback for approval action
- `canApprove` (boolean): Whether current user can approve

**State:** `expandedVersionId` (local UI state only)

## State Ownership

### Parent Component (App)
Owns all data state:
- `documentVersions` - Source of truth for all version data
- `loading` - Controls loading state across entire view
- `error` - Centralized error handling
- `currentUser` - User context and permissions

### Child Component (DocumentVersionList)
Owns local UI state:
- `expandedVersionId` - Local UI state for expand/collapse (doesn't affect data)

### Presentational Components
PermissionBadge and ApprovalStatus have no state - they're pure props-driven components.

## State Handling

- **Loading State**: Spinner with message during data fetch
- **Empty State**: Clear guidance when no versions exist
- **Error State**: Error message with retry button

## Edge Case: Concurrent Approvals

**Scenario**: Two users click "Approve" on the same version simultaneously

**Current Implementation**: Last write wins (basic optimistic update)

**Production Solutions**:
1. Optimistic Updates with Conflict Resolution
2. Server-Side Locking
3. Event Sourcing

**Demonstration**: Click "Simulate Auto-Approve All" to see rapid state updates.

## Additional Documentation

See `IMPLEMENTATION_NOTES.md` for:
- Detailed state ownership explanation
- Component reusability analysis
- Data flow diagram
- Testing recommendations
- Performance considerations
