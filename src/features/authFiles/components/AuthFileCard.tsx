import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { SelectionCheckbox } from '@/components/ui/SelectionCheckbox';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import {
  IconDownload,
  IconModelCluster,
  IconSettings,
  IconTrash2,
} from '@/components/ui/icons';
import { ProviderStatusBar } from '@/components/providers/ProviderStatusBar';
import type { AuthFileItem } from '@/types';
import { calculateStatusBarData, normalizeAuthIndex, type KeyStats } from '@/utils/usage';
import { formatFileSize } from '@/utils/format';
import {
  formatModified,
  getAuthFileIcon,
  getTypeColor,
  getTypeLabel,
  isRuntimeOnlyAuthFile,
  resolveAuthFileStats,
  type QuotaProviderType,
  type ResolvedTheme,
} from '@/features/authFiles/constants';

export type AuthFileCardProps = {
  file: AuthFileItem;
  compact: boolean;
  selected: boolean;
  resolvedTheme: ResolvedTheme;
  disableControls: boolean;
  deleting: string | null;
  statusUpdating: Record<string, boolean>;
  quotaFilterType: QuotaProviderType | null;
  keyStats: KeyStats;
  statusBarCache: Map<string, any>;
  onShowModels: (file: AuthFileItem) => void;
  onDownload: (name: string) => void;
  onOpenPrefixProxyEditor: (file: AuthFileItem) => void;
  onDelete: (name: string) => void;
  onToggleStatus: (file: AuthFileItem, enabled: boolean) => void;
  onToggleSelect: (name: string) => void;
};

export function AuthFileCard(props: AuthFileCardProps) {
  const { t } = useTranslation();
  const {
    file,
    selected,
    resolvedTheme,
    disableControls,
    deleting,
    statusUpdating,
    keyStats,
    statusBarCache,
    onShowModels,
    onDownload,
    onOpenPrefixProxyEditor,
    onDelete,
    onToggleStatus,
    onToggleSelect,
  } = props;

  const fileStats = resolveAuthFileStats(file, keyStats);
  const isRuntimeOnly = isRuntimeOnlyAuthFile(file);
  const typeColor = getTypeColor(file.type || 'unknown', resolvedTheme);
  const typeLabel = getTypeLabel(t, file.type || 'unknown');
  const providerIcon = getAuthFileIcon(file.type || 'unknown', resolvedTheme);

  const rawAuthIndex = file['auth_index'] ?? file.authIndex;
  const authIndexKey = normalizeAuthIndex(rawAuthIndex);
  const statusData = (authIndexKey && statusBarCache.get(authIndexKey)) || calculateStatusBarData([]);

  return (
    <div 
      className={`auth-file-row ${file.disabled ? 'is-disabled' : ''}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr 120px 180px 100px auto',
        alignItems: 'center',
        gap: '24px',
        padding: '16px 20px',
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border-color)',
        opacity: file.disabled ? 0.7 : 1,
        transition: 'all 0.2s ease'
      }}
    >
      {/* Select & Icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {!isRuntimeOnly && (
          <SelectionCheckbox
            checked={selected}
            onChange={() => onToggleSelect(file.name)}
          />
        )}
        <div style={{ 
          width: '40px', 
          height: '40px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'var(--bg-secondary)', 
          borderRadius: '10px',
          boxShadow: 'var(--shadow-ring)',
          flexShrink: 0
        }}>
          {providerIcon ? (
            <img src={providerIcon} alt="" style={{ width: '24px', height: '24px' }} />
          ) : (
            <span style={{ fontWeight: '700', color: 'var(--text-tertiary)' }}>{typeLabel[0]}</span>
          )}
        </div>
      </div>

      {/* Name & Meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: '600', 
          color: 'var(--text-primary)',
          wordBreak: 'break-all',
          marginBottom: '4px'
        }}>
          {file.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            fontSize: '9px', 
            fontWeight: '800', 
            textTransform: 'uppercase', 
            padding: '2px 6px', 
            borderRadius: '4px',
            backgroundColor: typeColor.bg,
            color: typeColor.text,
            letterSpacing: '0.05em'
          }}>
            {typeLabel}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {formatFileSize(file.size || 0)}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            • {formatModified(file)}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>S:</span>
          <span style={{ fontWeight: '600', color: 'var(--success-color)' }}>{fileStats.success}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>F:</span>
          <span style={{ fontWeight: '600', color: 'var(--error-color)' }}>{fileStats.failure}</span>
        </div>
      </div>

      {/* Health Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          <span>Health</span>
          <span style={{ color: 'var(--success-color)' }}>{Math.round(statusData.successRate)}%</span>
        </div>
        <ProviderStatusBar statusData={statusData} />
      </div>

      {/* Status Toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '12px' }}>
        {!isRuntimeOnly && (
          <ToggleSwitch
            checked={!file.disabled}
            onChange={(value) => onToggleStatus(file, value)}
            disabled={disableControls || statusUpdating[file.name]}
          />
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="sm" onClick={() => onShowModels(file)} disabled={disableControls} title={t('auth_files.models_hint')}>
          <IconModelCluster size={18} />
        </Button>
        {!isRuntimeOnly && (
          <>
            <Button variant="ghost" size="sm" onClick={() => onOpenPrefixProxyEditor(file)} disabled={disableControls} title={t('auth_files.proxy_settings')}>
              <IconSettings size={18} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDownload(file.name)} disabled={disableControls} title={t('common.download')}>
              <IconDownload size={18} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(file.name)} disabled={disableControls || deleting === file.name} style={{ color: 'var(--error-color)' }}>
              <IconTrash2 size={18} />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
