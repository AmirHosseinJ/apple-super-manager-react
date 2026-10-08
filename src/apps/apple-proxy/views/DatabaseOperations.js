import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'

import { useCollection, useMutation } from '../../../api/hooks'
import {
  ConfirmDialog,
  DataTable,
  PageHeader,
  RelativeTime,
  StatusBadge,
} from '../../../components/common'
import { DATABASE_STATUSES, databaseBackups, restoreJobs } from '../api'

const ACTIVE_STATUSES = new Set(['queued', 'running'])

const formatBytes = (value) => {
  if (value === null || value === undefined) return '—'
  if (value === 0) return '0 B'

  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  const amount = value / 1024 ** exponent
  return `${amount.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`
}

const formatChecksum = (value) => {
  if (!value) return '—'
  return <code title={value}>{value.slice(0, 12)}…</code>
}

const statusOptions = (label) => (
  <>
    <option value="">{label}</option>
    {DATABASE_STATUSES.map((status) => (
      <option key={status} value={status}>
        {status}
      </option>
    ))}
  </>
)

const DatabaseOperations = () => {
  const [backupFilters, setBackupFilters] = useState({ status: '' })
  const [restoreFilters, setRestoreFilters] = useState({ status: '' })
  const [notice, setNotice] = useState(null)
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [restoreConfirmation, setRestoreConfirmation] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)
  const [trackedOperation, setTrackedOperation] = useState(null)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadVisible, setUploadVisible] = useState(false)

  const backups = useCollection(
    useCallback((options) => databaseBackups.list(options), []),
    { ordering: '-created_at', filters: backupFilters },
  )
  const restores = useCollection(
    useCallback((options) => restoreJobs.list(options), []),
    { ordering: '-created_at', filters: restoreFilters },
  )

  const { refresh: refreshBackups } = backups
  const { refresh: refreshRestores } = restores

  const createMutation = useMutation(() => databaseBackups.create())
  const uploadMutation = useMutation((file) => databaseBackups.upload(file))
  const deleteMutation = useMutation((backup) => databaseBackups.remove(backup.id))
  const restoreMutation = useMutation((backup, confirmation) =>
    databaseBackups.restore(backup.id, confirmation),
  )

  const activeBackup = useMemo(
    () => backups.items.find((backup) => ACTIVE_STATUSES.has(backup.status)),
    [backups.items],
  )
  const activeRestore = useMemo(
    () => restores.items.find((restore) => ACTIVE_STATUSES.has(restore.status)),
    [restores.items],
  )
  const maintenanceActive = restores.items.some((restore) => restore.status === 'running')
  const operationActive = Boolean(activeBackup || activeRestore || trackedOperation)

  useEffect(() => {
    if (!operationActive) return undefined
    let cancelled = false

    const pollTrackedOperation = async () => {
      if (!trackedOperation) return

      try {
        const current =
          trackedOperation.kind === 'backup'
            ? await databaseBackups.retrieve(trackedOperation.id)
            : await restoreJobs.retrieve(trackedOperation.id)
        if (!cancelled && !ACTIVE_STATUSES.has(current.status)) setTrackedOperation(null)
      } catch {
        // Collection refreshes below surface errors in the tables.
      }
    }

    const interval = window.setInterval(() => {
      refreshBackups()
      refreshRestores()
      pollTrackedOperation()
    }, 5000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [operationActive, refreshBackups, refreshRestores, trackedOperation])

  const showNotice = (color, text) => setNotice({ color, text })

  const handleCreate = async () => {
    setNotice(null)
    try {
      const backup = await createMutation.run()
      if (backup?.id) setTrackedOperation({ kind: 'backup', id: backup.id })
      showNotice(
        'info',
        'Database backup queued. This page will refresh until it reaches a terminal status.',
      )
      refreshBackups()
    } catch (error) {
      showNotice(error.isConflict ? 'warning' : 'danger', error.message)
    }
  }

  const closeUpload = () => {
    if (uploadMutation.pending) return
    setUploadVisible(false)
    setUploadFile(null)
    uploadMutation.reset()
  }

  const handleUpload = async () => {
    if (!uploadFile) return

    try {
      const backup = await uploadMutation.run(uploadFile)
      if (backup?.id) setTrackedOperation({ kind: 'backup', id: backup.id })
      setUploadVisible(false)
      setUploadFile(null)
      uploadMutation.reset()
      showNotice(
        'info',
        'Backup uploaded and queued for validation. This page will refresh until it reaches a terminal status.',
      )
      refreshBackups()
    } catch {
      // Rendered in the upload dialog.
    }
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.run(deleting)
      setDeleting(null)
      deleteMutation.reset()
      refreshBackups()
      refreshRestores()
    } catch {
      // Rendered in the confirmation dialog.
    }
  }

  const closeRestore = () => {
    setRestoreTarget(null)
    setRestoreConfirmation('')
    restoreMutation.reset()
  }

  const handleRestore = async () => {
    try {
      const restore = await restoreMutation.run(restoreTarget, restoreConfirmation)
      if (restore?.id) setTrackedOperation({ kind: 'restore', id: restore.id })
      closeRestore()
      showNotice(
        'warning',
        'Database restore queued. Normal API traffic may be unavailable while it runs.',
      )
      refreshBackups()
      refreshRestores()
    } catch {
      // Rendered in the confirmation dialog.
    }
  }

  const handleDownload = async (backup) => {
    setNotice(null)
    setDownloadingId(backup.id)
    try {
      const result = await databaseBackups.download(backup.id)
      const objectUrl = URL.createObjectURL(result.blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = result.filename || backup.file_name || `apple-proxy-${backup.id}.dump`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
    } catch (error) {
      showNotice(error.status === 503 || error.isConflict ? 'warning' : 'danger', error.message)
    } finally {
      setDownloadingId(null)
    }
  }

  const backupColumns = [
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (backup) => <StatusBadge value={backup.status} kind="database" />,
    },
    {
      key: 'file_name',
      label: 'File',
      render: (backup) => <code>{backup.file_name || 'Pending filename'}</code>,
    },
    {
      key: 'file_size_bytes',
      label: 'Size',
      render: (backup) => formatBytes(backup.file_size_bytes),
    },
    {
      key: 'sha256',
      label: 'SHA-256',
      render: (backup) => formatChecksum(backup.sha256),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (backup) => <RelativeTime value={backup.created_at} />,
    },
    {
      key: 'completed_at',
      label: 'Completed',
      sortable: true,
      render: (backup) => <RelativeTime value={backup.completed_at} />,
    },
    {
      key: 'details',
      label: 'Details',
      render: (backup) =>
        backup.error_message ? (
          <span className="text-danger small" title={backup.error_message}>
            {backup.error_message}
          </span>
        ) : (
          <span className="text-body-secondary">—</span>
        ),
    },
    {
      key: 'actions',
      label: '',
      className: 'text-end text-nowrap',
      render: (backup) => {
        const completed = backup.status === 'completed'
        const deletable = backup.status === 'completed' || backup.status === 'failed'

        return (
          <>
            <CButton
              size="sm"
              color="primary"
              variant="ghost"
              title="Download backup"
              disabled={!completed || maintenanceActive || downloadingId === backup.id}
              onClick={() => handleDownload(backup)}
            >
              <i className="fa-solid fa-download" />
            </CButton>
            <CButton
              size="sm"
              color="danger"
              variant="ghost"
              title="Restore database"
              disabled={!completed || maintenanceActive}
              onClick={() => {
                setRestoreTarget(backup)
                setRestoreConfirmation('')
              }}
            >
              <i className="fa-solid fa-rotate" />
            </CButton>
            <CButton
              size="sm"
              color="danger"
              variant="ghost"
              title="Delete backup"
              disabled={!deletable || maintenanceActive}
              onClick={() => setDeleting(backup)}
            >
              <i className="fa-solid fa-trash" />
            </CButton>
          </>
        )
      },
    },
  ]

  const restoreColumns = [
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (restore) => <StatusBadge value={restore.status} kind="database" />,
    },
    {
      key: 'source_file_name',
      label: 'Source file',
      render: (restore) => <code>{restore.source_file_name}</code>,
    },
    {
      key: 'source_backup_id',
      label: 'Backup ID',
      render: (restore) => <code>{restore.source_backup_id}</code>,
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (restore) => <RelativeTime value={restore.created_at} />,
    },
    {
      key: 'started_at',
      label: 'Started',
      sortable: true,
      render: (restore) => <RelativeTime value={restore.started_at} />,
    },
    {
      key: 'completed_at',
      label: 'Completed',
      sortable: true,
      render: (restore) => <RelativeTime value={restore.completed_at} />,
    },
    {
      key: 'details',
      label: 'Details',
      render: (restore) =>
        restore.error_message ? (
          <span className="text-danger small" title={restore.error_message}>
            {restore.error_message}
          </span>
        ) : (
          <span className="text-body-secondary">—</span>
        ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Database Operations"
        description="Create, upload, download, delete, and restore PostgreSQL backups for Apple Proxy. These files contain the complete database and must be handled as sensitive data."
        actions={
          <div className="d-flex gap-2">
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => setUploadVisible(true)}
              disabled={operationActive || maintenanceActive}
            >
              <i className="fa-solid fa-upload me-2" />
              Upload backup
            </CButton>
            <CButton
              color="primary"
              onClick={handleCreate}
              disabled={operationActive || maintenanceActive}
            >
              <i className="fa-solid fa-database me-2" />
              Create backup
            </CButton>
          </div>
        }
      />

      {notice && (
        <CAlert color={notice.color} dismissible onClose={() => setNotice(null)}>
          {notice.text}
        </CAlert>
      )}

      {maintenanceActive && (
        <CAlert color="danger">
          <strong>Database restore in progress.</strong> Normal Apple Proxy traffic is temporarily
          unavailable. Restore jobs cannot be cancelled safely; keep this page open to monitor the
          result.
        </CAlert>
      )}

      <CCard className="mb-4">
        <CCardHeader>
          <i className="fa-solid fa-box-archive me-2" />
          Backups
        </CCardHeader>
        <CCardBody>
          <DataTable
            columns={backupColumns}
            items={backups.items}
            loading={backups.loading}
            error={backups.error}
            count={backups.count}
            page={backups.page}
            pageSize={backups.pageSize}
            onPageChange={backups.setPage}
            sort={backups.sort}
            onSortChange={backups.setSort}
            onRefresh={refreshBackups}
            filters={
              <CFormSelect
                size="sm"
                className="w-auto"
                value={backupFilters.status}
                onChange={(event) =>
                  setBackupFilters((current) => ({ ...current, status: event.target.value }))
                }
              >
                {statusOptions('All backup statuses')}
              </CFormSelect>
            }
            emptyMessage="No database backups have been created yet."
          />
        </CCardBody>
      </CCard>

      <CCard>
        <CCardHeader>
          <i className="fa-solid fa-clock-rotate-left me-2" />
          Restore jobs
        </CCardHeader>
        <CCardBody>
          <DataTable
            columns={restoreColumns}
            items={restores.items}
            loading={restores.loading}
            error={restores.error}
            count={restores.count}
            page={restores.page}
            pageSize={restores.pageSize}
            onPageChange={restores.setPage}
            sort={restores.sort}
            onSortChange={restores.setSort}
            onRefresh={refreshRestores}
            filters={
              <CFormSelect
                size="sm"
                className="w-auto"
                value={restoreFilters.status}
                onChange={(event) =>
                  setRestoreFilters((current) => ({ ...current, status: event.target.value }))
                }
              >
                {statusOptions('All restore statuses')}
              </CFormSelect>
            }
            emptyMessage="No restore jobs have been requested."
          />
        </CCardBody>
      </CCard>

      <ConfirmDialog
        visible={Boolean(deleting)}
        title="Delete database backup"
        confirmLabel="Delete backup"
        confirmColor="danger"
        pending={deleteMutation.pending}
        confirmDisabled={maintenanceActive}
        error={deleteMutation.error}
        onConfirm={handleDelete}
        onClose={() => {
          setDeleting(null)
          deleteMutation.reset()
        }}
      >
        <p>
          Delete <code>{deleting?.file_name}</code>? This removes the backup metadata and the dump
          artifact from the server.
        </p>
        <p className="mb-0 text-body-secondary">
          Restore history remains available because restore jobs retain their source snapshot.
        </p>
      </ConfirmDialog>

      <CModal visible={uploadVisible} onClose={closeUpload} alignment="center" backdrop="static">
        <CModalHeader closeButton={!uploadMutation.pending}>
          <CModalTitle>Upload database backup</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            Choose one PostgreSQL custom-format <code>.dump</code> file. The server will validate it
            before allowing download or restore.
          </p>
          <CFormInput
            type="file"
            accept=".dump,application/octet-stream"
            disabled={uploadMutation.pending}
            onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
            aria-label="Database backup file"
          />
          {uploadMutation.error && (
            <CAlert
              color={uploadMutation.error.isConflict ? 'warning' : 'danger'}
              className="mt-3 mb-0"
            >
              {uploadMutation.error.message}
            </CAlert>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="ghost"
            onClick={closeUpload}
            disabled={uploadMutation.pending}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleUpload}
            disabled={!uploadFile || uploadMutation.pending || operationActive || maintenanceActive}
          >
            {uploadMutation.pending ? 'Uploading…' : 'Upload backup'}
          </CButton>
        </CModalFooter>
      </CModal>

      <ConfirmDialog
        visible={Boolean(restoreTarget)}
        title="Restore database"
        confirmLabel="Restore database"
        confirmColor="danger"
        pending={restoreMutation.pending}
        confirmDisabled={
          maintenanceActive || restoreConfirmation !== `RESTORE ${restoreTarget?.id || ''}`
        }
        error={restoreMutation.error}
        onConfirm={handleRestore}
        onClose={closeRestore}
      >
        <CAlert color="danger">
          <strong>This replaces the current application database.</strong> Normal API traffic will
          return 503 while the restore runs, and the operation cannot be cancelled safely.
        </CAlert>
        <p>
          Source backup: <code>{restoreTarget?.file_name}</code>
        </p>
        <p>
          Type <code>RESTORE {restoreTarget?.id}</code> to confirm this destructive operation.
        </p>
        <CFormInput
          autoFocus
          value={restoreConfirmation}
          disabled={restoreMutation.pending}
          onChange={(event) => setRestoreConfirmation(event.target.value)}
          placeholder={`RESTORE ${restoreTarget?.id || ''}`}
          aria-label="Restore confirmation"
        />
      </ConfirmDialog>
    </>
  )
}

export default DatabaseOperations
