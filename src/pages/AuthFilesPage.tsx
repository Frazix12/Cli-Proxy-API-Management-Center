import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useInterval } from '@/hooks/useInterval';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { usePageTransitionLayer } from '@/components/common/PageTransitionLayer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { copyToClipboard } from '@/utils/clipboard';
import {
  QUOTA_PROVIDER_TYPES,
  getTypeLabel,
  isRuntimeOnlyAuthFile,
  normalizeProviderKey,
  parsePriorityValue,
  type QuotaProviderType,
  type ResolvedTheme,
} from '@/features/authFiles/constants';
import { AuthFileCard } from '@/features/authFiles/components/AuthFileCard';
import { AuthFileModelsModal } from '@/features/authFiles/components/AuthFileModelsModal';
import { AuthFilesPrefixProxyEditorModal } from '@/features/authFiles/components/AuthFilesPrefixProxyEditorModal';
import { OAuthExcludedCard } from '@/features/authFiles/components/OAuthExcludedCard';
import { OAuthModelAliasCard } from '@/features/authFiles/components/OAuthModelAliasCard';
import { useAuthFilesData } from '@/features/authFiles/hooks/useAuthFilesData';
import { useAuthFilesModels } from '@/features/authFiles/hooks/useAuthFilesModels';
import { useAuthFilesOauth } from '@/features/authFiles/hooks/useAuthFilesOauth';
import { useAuthFilesPrefixProxyEditor } from '@/features/authFiles/hooks/useAuthFilesPrefixProxyEditor';
import { useAuthFilesStats } from '@/features/authFiles/hooks/useAuthFilesStats';
import { useAuthFilesStatusBarCache } from '@/features/authFiles/hooks/useAuthFilesStatusBarCache';
import {
  isAuthFilesSortMode,
  readAuthFilesUiState,
  writeAuthFilesUiState,
  type AuthFilesSortMode,
} from '@/features/authFiles/uiState';
import { useAuthStore, useNotificationStore, useThemeStore } from '@/stores';

export function AuthFilesPage() {
  const { t } = useTranslation();
  const { showNotification } = useNotificationStore();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const resolvedTheme: ResolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const pageTransitionLayer = usePageTransitionLayer();
  const isCurrentLayer = pageTransitionLayer ? pageTransitionLayer.status === 'current' : true;
  const navigate = useNavigate();

  const [filter, setFilter] = useState<'all' | string>('all');
  const [problemOnly, setProblemOnly] = useState(false);
  const [disabledOnly, setDisabledOnly] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [viewMode, setViewMode] = useState<'diagram' | 'list'>('list');
  const [sortMode, setSortMode] = useState<AuthFilesSortMode>('default');
  const [uiStateHydrated, setUiStateHydrated] = useState(false);

  const { keyStats, usageDetails, loadKeyStats, refreshKeyStats } = useAuthFilesStats();
  const {
    files,
    selectedFiles,
    loading,
    error,
    uploading,
    deleting,
    deletingAll,
    statusUpdating,
    fileInputRef,
    loadFiles,
    handleUploadClick,
    handleFileChange,
    handleDelete,
    handleDeleteAll,
    handleDownload,
    handleStatusToggle,
    toggleSelect,
    batchDownload,
    batchSetStatus,
    batchDelete,
  } = useAuthFilesData({ refreshKeyStats });

  const statusBarCache = useAuthFilesStatusBarCache(files, usageDetails);

  const {
    excluded,
    excludedError,
    modelAlias,
    modelAliasError,
    allProviderModels,
    loadExcluded,
    loadModelAlias,
    deleteExcluded,
    deleteModelAlias,
    handleMappingUpdate,
    handleDeleteLink,
    handleToggleFork,
    handleRenameAlias,
    handleDeleteAlias,
  } = useAuthFilesOauth({ viewMode, files });

  const {
    modelsModalOpen,
    modelsLoading,
    modelsList,
    modelsFileName,
    modelsFileType,
    modelsError,
    showModels,
    closeModelsModal,
  } = useAuthFilesModels();

  const {
    prefixProxyEditor,
    prefixProxyUpdatedText,
    prefixProxyDirty,
    openPrefixProxyEditor,
    closePrefixProxyEditor,
    handlePrefixProxyChange,
    handlePrefixProxySave,
  } = useAuthFilesPrefixProxyEditor({
    disableControls: connectionStatus !== 'connected',
    loadFiles,
    loadKeyStats: refreshKeyStats,
  });

  const disableControls = connectionStatus !== 'connected';
  const normalizedFilter = normalizeProviderKey(String(filter));
  const quotaFilterType: QuotaProviderType | null = QUOTA_PROVIDER_TYPES.has(
    normalizedFilter as QuotaProviderType
  )
    ? (normalizedFilter as QuotaProviderType)
    : null;

  useEffect(() => {
    const persisted = readAuthFilesUiState();
    if (persisted) {
      if (typeof persisted.filter === 'string') setFilter(persisted.filter);
      if (typeof persisted.search === 'string') setSearch(persisted.search);
      if (isAuthFilesSortMode(persisted.sortMode)) setSortMode(persisted.sortMode);
    }
    setUiStateHydrated(true);
  }, []);

  useEffect(() => {
    if (!uiStateHydrated) return;
    writeAuthFilesUiState({ filter, search, sortMode, page, pageSize, problemOnly, disabledOnly, compactMode });
  }, [filter, search, sortMode, page, pageSize, problemOnly, disabledOnly, compactMode, uiStateHydrated]);

  const handleHeaderRefresh = useCallback(async () => {
    await Promise.all([loadFiles(), refreshKeyStats(), loadExcluded(), loadModelAlias()]);
  }, [loadFiles, refreshKeyStats, loadExcluded, loadModelAlias]);

  useHeaderRefresh(handleHeaderRefresh);

  useEffect(() => {
    if (!isCurrentLayer) return;
    loadFiles();
    void loadKeyStats().catch(() => {});
    loadExcluded();
    loadModelAlias();
  }, [isCurrentLayer, loadFiles, loadKeyStats, loadExcluded, loadModelAlias]);

  const sortOptions = useMemo(() => [
    { value: 'default', label: t('auth_files.sort_default') },
    { value: 'az', label: t('auth_files.sort_az') },
    { value: 'priority', label: t('auth_files.sort_priority') },
  ], [t]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return files.filter(f => {
        if (problemOnly && !f.status) return false; // Simplified
        if (disabledOnly && !f.disabled) return false;
        if (filter !== 'all' && f.type !== filter) return false;
        return f.name.toLowerCase().includes(term);
    });
  }, [files, search, problemOnly, disabledOnly, filter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sortMode === 'az') copy.sort((a, b) => a.name.localeCompare(b.name));
    if (sortMode === 'priority') copy.sort((a, b) => (parsePriorityValue(b.priority) || 0) - (parsePriorityValue(a.priority) || 0));
    return copy;
  }, [filtered, sortMode]);

  const pageItems = sorted.slice((page - 1) * pageSize, page * pageSize);

  const copyTextWithNotification = useCallback(async (text: string) => {
    const copied = await copyToClipboard(text);
    showNotification(copied ? t('notification.link_copied') : t('notification.copy_failed'), copied ? 'success' : 'error');
  }, [showNotification, t]);

  const openExcludedEditor = useCallback((provider?: string) => {
      navigate(`/auth-files/oauth-excluded`, { state: { fromAuthFiles: true } });
  }, [navigate]);

  const openModelAliasEditor = useCallback((provider?: string) => {
      navigate(`/auth-files/oauth-model-alias`, { state: { fromAuthFiles: true } });
  }, [navigate]);

  return (
    <div className="page-container">
      <header className="section-header">
        <h1>{t('auth_files.title')}</h1>
        <p>{t('auth_files.description')}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
            <Button variant="secondary" size="sm" onClick={handleHeaderRefresh}>{t('common.refresh')}</Button>
            <Button variant="primary" size="sm" onClick={handleUploadClick}>{t('auth_files.upload_button')}</Button>
            <input ref={fileInputRef} type="file" accept=".json,application/json" multiple style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
      </header>

      <div className="stack stack-xl">
        <div className="card">
            <div className="grid grid-3">
                <Input label={t('auth_files.search_label')} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('auth_files.search_placeholder')} />
                <Select label={t('auth_files.sort_label')} value={sortMode} options={sortOptions} onChange={setSortMode} />
                <div className="stack stack-xs">
                    <label style={{ fontSize: '12px', fontWeight: '600' }}>{t('auth_files.display_options_label')}</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <ToggleSwitch checked={problemOnly} onChange={setProblemOnly} label={t('auth_files.problem_filter_only')} />
                        <ToggleSwitch checked={disabledOnly} onChange={setDisabledOnly} label={t('auth_files.disabled_filter_only')} />
                    </div>
                </div>
            </div>
        </div>

        <div className="stack stack-md">
            {pageItems.map((file) => (
                <AuthFileCard
                    key={file.name}
                    file={file}
                    compact={compactMode}
                    selected={selectedFiles.has(file.name)}
                    resolvedTheme={resolvedTheme}
                    disableControls={disableControls}
                    deleting={deleting}
                    statusUpdating={statusUpdating}
                    quotaFilterType={quotaFilterType}
                    keyStats={keyStats}
                    statusBarCache={statusBarCache}
                    onShowModels={showModels}
                    onDownload={handleDownload}
                    onOpenPrefixProxyEditor={openPrefixProxyEditor}
                    onDelete={handleDelete}
                    onToggleStatus={handleStatusToggle}
                    onToggleSelect={toggleSelect}
                />
            ))}
        </div>

        <OAuthExcludedCard
            disableControls={disableControls}
            excludedError={excludedError}
            excluded={excluded}
            onAdd={() => openExcludedEditor()}
            onEdit={openExcludedEditor}
            onDelete={deleteExcluded}
        />

        <OAuthModelAliasCard
            disableControls={disableControls}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onAdd={() => openModelAliasEditor()}
            onEditProvider={openModelAliasEditor}
            onDeleteProvider={deleteModelAlias}
            modelAliasError={modelAliasError}
            modelAlias={modelAlias}
            allProviderModels={allProviderModels}
            onUpdate={handleMappingUpdate}
            onDeleteLink={handleDeleteLink}
            onToggleFork={handleToggleFork}
            onRenameAlias={handleRenameAlias}
            onDeleteAlias={handleDeleteAlias}
        />
      </div>

      <AuthFileModelsModal
        open={modelsModalOpen}
        fileName={modelsFileName}
        fileType={modelsFileType}
        loading={modelsLoading}
        error={modelsError}
        models={modelsList}
        excluded={excluded}
        onClose={closeModelsModal}
        onCopyText={copyTextWithNotification}
      />

      <AuthFilesPrefixProxyEditorModal
        disableControls={disableControls}
        editor={prefixProxyEditor}
        updatedText={prefixProxyUpdatedText}
        dirty={prefixProxyDirty}
        onClose={closePrefixProxyEditor}
        onCopyText={copyTextWithNotification}
        onSave={handlePrefixProxySave}
        onChange={handlePrefixProxyChange}
      />
    </div>
  );
}
