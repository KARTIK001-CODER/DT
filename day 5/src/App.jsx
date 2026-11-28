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
    owner: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' },
    editor: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
    viewer: { bg: '#f3f4f6', text: '#1f2937', border: '#e5e7eb' },
    approver: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  };

  const sizes = {
    small: { fontSize: '12px', padding: '2px 8px' },
    medium: { fontSize: '14px', padding: '4px 12px' },
    large: { fontSize: '16px', padding: '6px 16px' },
  };

  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: colors[permission]?.bg || colors.viewer.bg,
    color: colors[permission]?.text || colors.viewer.text,
    border: `1px solid ${colors[permission]?.border || colors.viewer.border}`,
    borderRadius: '9999px',
    fontSize: sizes[size].fontSize,
    padding: sizes[size].padding,
  };

  return (
    <span style={style}>
      {permission.charAt(0).toUpperCase() + permission.slice(1)}
    </span>
  );
}

// ===== REUSABLE COMPONENT 2: ApprovalStatus =====
// Shows approval status with visual indicators
function ApprovalStatus({ status, approver }) {
  const config = {
    pending: { color: '#ca8a04', icon: '⏳', label: 'Pending' },
    approved: { color: '#16a34a', icon: '✓', label: 'Approved' },
    rejected: { color: '#dc2626', icon: '✗', label: 'Rejected' },
  };

  const { color, icon, label } = config[status] || config.pending;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color }}>
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <span style={{ fontWeight: 500 }}>{label}</span>
      {approver && <span style={{ fontSize: '14px', opacity: 0.75 }}>by {approver}</span>}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {versions.map((version) => (
        <div
          key={version.id}
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => toggleExpand(version.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#6b7280',
                }}
              >
                {expandedVersionId === version.id ? '▼' : '▶'}
              </button>
              <div>
                <div style={{ fontWeight: 500 }}>Version {version.versionNumber}</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>{version.createdAt}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ApprovalStatus
                status={version.approvalStatus}
                approver={version.approver}
              />
              {canApprove && version.approvalStatus === 'pending' && (
                <button
                  onClick={() => onApprove(version.id)}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                >
                  Approve
                </button>
              )}
            </div>
          </div>

          {expandedVersionId === version.id && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '14px', color: '#4b5563', marginBottom: '8px' }}>
                <strong>Changes:</strong> {version.changes}
              </div>
              <div style={{ fontSize: '14px', color: '#4b5563', marginBottom: '8px' }}>
                <strong>Author:</strong> {version.author}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Permissions:</span>
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '2px solid #e5e7eb',
        borderTop: '2px solid #2563eb',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '16px'
      }}></div>
      <p style={{ color: '#4b5563' }}>Loading document versions...</p>
    </div>
  );
}

// ===== EMPTY STATE COMPONENT =====
function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
      <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#111827', marginBottom: '8px' }}>No Versions Yet</h3>
      <p style={{ color: '#6b7280', maxWidth: '448px' }}>
        This document has no version history. Create the first version to get started.
      </p>
    </div>
  );
}

// ===== ERROR STATE COMPONENT =====
function ErrorState({ error, onRetry }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
      <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#7f1d1d', marginBottom: '8px' }}>Error Loading Document</h3>
      <p style={{ color: '#b91c1c', maxWidth: '448px', marginBottom: '16px' }}>{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// ===== MAIN COMPONENT: DocumentApproval =====
function App() {
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
    window.location.reload();
  };

  // Check if current user can approve
  const canApprove = currentUser.permissions.includes('approver');

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
          Document Approval Workflow
        </h1>
        <p style={{ color: '#4b5563' }}>
          Manage document versions and track approval status
        </p>
      </div>

      {/* User Info Bar */}
      <div style={{
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#2563eb',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 500
          }}>
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{currentUser.name}</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Current User</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
      <div style={{
        marginTop: '32px',
        padding: '16px',
        backgroundColor: '#fefce8',
        border: '1px solid #fef9c3',
        borderRadius: '8px'
      }}>
        <h3 style={{ fontWeight: 500, color: '#713f12', marginBottom: '8px' }}>⚡ Edge Case: Concurrent Approvals</h3>
        <p style={{ fontSize: '14px', color: '#854d0e', marginBottom: '12px' }}>
          If two users click "Approve" simultaneously, the last write wins. In production,
          this would use optimistic updates with conflict resolution or server-side locking.
        </p>
        <button
          onClick={() => {
            setDocumentVersions((prev) =>
              prev.map((v) =>
                v.approvalStatus === 'pending'
                  ? { ...v, approvalStatus: 'approved', approver: 'System (Auto)' }
                  : v
              )
            );
          }}
          style={{
            padding: '4px 12px',
            backgroundColor: '#ca8a04',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a16207'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ca8a04'}
        >
          Simulate Auto-Approve All
        </button>
      </div>
    </div>
  );
}

export default App;
