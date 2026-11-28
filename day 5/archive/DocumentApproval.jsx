import React, { useState, useEffect } from 'react';

/**
 * DOCUMENT APPROVAL WORKFLOW - STATE OWNERSHIP EXPLANATION
 *
 * State Ownership:
 * 1. documentVersions (array) - Owned by DocumentApproval parent
 *    - This is the source of truth for all version data
 *    - Child components receive versions as props (unidirectional data flow)
 *    - Mutations happen here (addVersion, approveVersion) and flow down
 *
 * 2. loading (boolean) - Owned by DocumentApproval
 *    - Controls UI loading state for the entire view
 *    - Passed to UI components that need to show loading indicators
 *
 * 3. error (string | null) - Owned by DocumentApproval
 *    - Centralized error state that affects the entire view
 *    - Rendered once at the top level, affects all children
 *
 * 4. currentUser (object) - Owned by DocumentApproval
 *    - User context that determines permissions
 *    - Passed to children to control access patterns
 *
 * 5. Individual component state:
 *    - DocumentVersionList: expandedVersionId (local UI state)
 *    - ApprovalStatus: local hover/selection states
 *    - PermissionBadge: no state (pure presentational)
 */

// ===== REUSABLE COMPONENT 1: PermissionBadge =====
// Pure presentational component - no state, receives all data via props
function PermissionBadge({ permission, size = 'medium' }) {
  const colors = {
    owner: 'bg-purple-100 text-purple-800 border-purple-200',
    editor: 'bg-blue-100 text-blue-800 border-blue-200',
    viewer: 'bg-gray-100 text-gray-800 border-gray-200',
    approver: 'bg-green-100 text-green-800 border-green-200',
  };

  const sizes = {
    small: 'text-xs px-2 py-0.5',
    medium: 'text-sm px-3 py-1',
    large: 'text-base px-4 py-1.5',
  };

  return (
    <span className={`inline-flex items-center border rounded-full ${colors[permission] || colors.viewer} ${sizes[size]}`}>
      {permission.charAt(0).toUpperCase() + permission.slice(1)}
    </span>
  );
}

// ===== REUSABLE COMPONENT 2: ApprovalStatus =====
// Shows approval status with visual indicators
function ApprovalStatus({ status, approver }) {
  const config = {
    pending: { color: 'text-yellow-600', icon: '⏳', label: 'Pending' },
    approved: { color: 'text-green-600', icon: '✓', label: 'Approved' },
    rejected: { color: 'text-red-600', icon: '✗', label: 'Rejected' },
  };

  const { color, icon, label } = config[status] || config.pending;

  return (
    <div className={`flex items-center gap-2 ${color}`}>
      <span className="text-lg">{icon}</span>
      <span className="font-medium">{label}</span>
      {approver && <span className="text-sm opacity-75">by {approver}</span>}
    </div>
  );
}

// ===== REUSABLE COMPONENT 3: DocumentVersionList =====
// Displays version history with expand/collapse
function DocumentVersionList({ versions, currentUser, onApprove, canApprove }) {
  const [expandedVersionId, setExpandedVersionId] = useState(null);

  const toggleExpand = (versionId) => {
    setExpandedVersionId(expandedVersionId === versionId ? null : versionId);
  };

  return (
    <div className="space-y-3">
      {versions.map((version) => (
        <div
          key={version.id}
          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleExpand(version.id)}
                className="text-gray-500 hover:text-gray-700"
              >
                {expandedVersionId === version.id ? '▼' : '▶'}
              </button>
              <div>
                <div className="font-medium">Version {version.versionNumber}</div>
                <div className="text-sm text-gray-500">{version.createdAt}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ApprovalStatus
                status={version.approvalStatus}
                approver={version.approver}
              />
              {canApprove && version.approvalStatus === 'pending' && (
                <button
                  onClick={() => onApprove(version.id)}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Approve
                </button>
              )}
            </div>
          </div>

          {expandedVersionId === version.id && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600 mb-2">
                <strong>Changes:</strong> {version.changes}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                <strong>Author:</strong> {version.author}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Permissions:</span>
                {version.permissions.map((perm) => (
                  <PermissionBadge key={perm} permission={perm} size="small" />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ===== LOADING STATE COMPONENT =====
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-gray-600">Loading document versions...</p>
    </div>
  );
}

// ===== EMPTY STATE COMPONENT =====
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-6xl mb-4">📄</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No Versions Yet</h3>
      <p className="text-gray-500 max-w-md">
        This document has no version history. Create the first version to get started.
      </p>
    </div>
  );
}

// ===== ERROR STATE COMPONENT =====
function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-6xl mb-4">⚠️</div>
      <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Document</h3>
      <p className="text-red-700 max-w-md mb-4">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// ===== MAIN COMPONENT: DocumentApproval =====
function DocumentApproval() {
  const [documentVersions, setDocumentVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mock current user with permissions
  const currentUser = {
    id: 'user-123',
    name: 'John Doe',
    permissions: ['editor', 'approver'],
  };

  // Simulate API fetch
  useEffect(() => {
    const fetchVersions = async () => {
      setLoading(true);
      setError(null);

      try {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Mock data - would come from API in real app
        const mockVersions = [
          {
            id: 'v1',
            versionNumber: 1,
            createdAt: '2024-11-27 10:00 AM',
            author: 'Alice Smith',
            changes: 'Initial document creation',
            approvalStatus: 'approved',
            approver: 'Bob Johnson',
            permissions: ['owner', 'editor', 'viewer'],
          },
          {
            id: 'v2',
            versionNumber: 2,
            createdAt: '2024-11-27 02:30 PM',
            author: 'Alice Smith',
            changes: 'Updated section 3 with new requirements',
            approvalStatus: 'pending',
            approver: null,
            permissions: ['editor', 'viewer'],
          },
          {
            id: 'v3',
            versionNumber: 3,
            createdAt: '2024-11-28 09:15 AM',
            author: 'John Doe',
            changes: 'Fixed formatting and added approval workflow',
            approvalStatus: 'pending',
            approver: null,
            permissions: ['editor', 'viewer', 'approver'],
          },
        ];

        setDocumentVersions(mockVersions);
      } catch (err) {
        setError('Failed to load document versions. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, []);

  const handleApprove = (versionId) => {
    setDocumentVersions((prev) =>
      prev.map((version) =>
        version.id === versionId
          ? {
              ...version,
              approvalStatus: 'approved',
              approver: currentUser.name,
            }
          : version
      )
    );
  };

  const handleRetry = () => {
    // Trigger refetch by re-running the effect
    // In real app, would call fetchVersions() directly
    window.location.reload();
  };

  // Check if current user can approve
  const canApprove = currentUser.permissions.includes('approver');

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Document Approval Workflow
        </h1>
        <p className="text-gray-600">
          Manage document versions and track approval status
        </p>
      </div>

      {/* User Info Bar */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <div className="font-medium">{currentUser.name}</div>
            <div className="text-sm text-gray-500">Current User</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentUser.permissions.map((perm) => (
            <PermissionBadge key={perm} permission={perm} />
          ))}
        </div>
      </div>

      {/* Main Content - State-Based Rendering */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={handleRetry} />
      ) : documentVersions.length === 0 ? (
        <EmptyState />
      ) : (
        <DocumentVersionList
          versions={documentVersions}
          currentUser={currentUser}
          onApprove={handleApprove}
          canApprove={canApprove}
        />
      )}

      {/* Edge Case Demonstration */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-medium text-yellow-900 mb-2">⚡ Edge Case: Concurrent Approvals</h3>
        <p className="text-sm text-yellow-800 mb-3">
          If two users click "Approve" simultaneously, the last write wins. In production,
          this would use optimistic updates with conflict resolution or server-side locking.
        </p>
        <button
          onClick={() => {
            // Simulate rapid concurrent approval
            setDocumentVersions((prev) =>
              prev.map((v) =>
                v.approvalStatus === 'pending'
                  ? { ...v, approvalStatus: 'approved', approver: 'System (Auto)' }
                  : v
              )
            );
          }}
          className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
        >
          Simulate Auto-Approve All
        </button>
      </div>
    </div>
  );
}

export default DocumentApproval;
