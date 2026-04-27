import { useMemo, type PropsWithChildren, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import iconOpenaiLight from '@/assets/icons/openai-light.svg';
import iconOpenaiDark from '@/assets/icons/openai-dark.svg';
import type { OpenAIProviderConfig } from '@/types';
import { maskApiKey } from '@/utils/format';
import { calculateStatusBarData, type KeyStats } from '@/utils/usage';
import { type UsageDetailsByAuthIndex, type UsageDetailsBySource } from '@/utils/usageIndex';
import { ProviderStatusBar } from '../ProviderStatusBar';
import {
  collectOpenAIProviderUsageDetails,
  getOpenAIProviderKey,
  getOpenAIProviderStats,
} from '../utils';

function DesignCard({ title, extra, children }: PropsWithChildren<{title?: ReactNode, extra?: ReactNode}>) {
    return (
        <div className="card">
            {(title || extra) && (
                <header className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="title">{title}</div>
                    {extra}
                </header>
            )}
            {children}
        </div>
    );
}

interface OpenAISectionProps {
  configs: OpenAIProviderConfig[];
  keyStats: KeyStats;
  usageDetailsBySource: UsageDetailsBySource;
  usageDetailsByAuthIndex: UsageDetailsByAuthIndex;
  loading: boolean;
  disableControls: boolean;
  isSwitching: boolean;
  resolvedTheme: string;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

export function OpenAISection({
  configs,
  keyStats,
  usageDetailsBySource,
  usageDetailsByAuthIndex,
  loading,
  disableControls,
  isSwitching,
  resolvedTheme,
  onAdd,
  onEdit,
  onDelete,
}: OpenAISectionProps) {
  const { t } = useTranslation();
  const actionsDisabled = disableControls || loading || isSwitching;

  const statusBarCache = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof calculateStatusBarData>>();
    configs.forEach((provider, index) => {
      const providerKey = getOpenAIProviderKey(provider, index);
      cache.set(
        providerKey,
        calculateStatusBarData(
          collectOpenAIProviderUsageDetails(provider, usageDetailsBySource, usageDetailsByAuthIndex)
        )
      );
    });
    return cache;
  }, [configs, usageDetailsByAuthIndex, usageDetailsBySource]);

  return (
    <DesignCard
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={resolvedTheme === 'dark' ? iconOpenaiDark : iconOpenaiLight} alt="" style={{ width: '24px', height: '24px' }} />
          {t('ai_providers.openai_title')}
        </span>
      }
      extra={
        <Button size="sm" onClick={onAdd} disabled={actionsDisabled} variant="secondary">
          {t('ai_providers.openai_add_button')}
        </Button>
      }
    >
      {loading && configs.length === 0 ? (
        <div className="hint">{t('common.loading')}</div>
      ) : configs.length === 0 ? (
        <EmptyState title={t('ai_providers.openai_empty_title')} description={t('ai_providers.openai_empty_desc')} />
      ) : (
        <div className="stack stack-lg">
          {configs.map((provider, index) => {
             const stats = getOpenAIProviderStats(provider, keyStats);
             const providerKey = getOpenAIProviderKey(provider, index);
             const statusData = statusBarCache.get(providerKey) || calculateStatusBarData([]);
             
             return (
                <div key={providerKey} className="card card-nested">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '600' }}>{provider.name}</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button variant="secondary" size="sm" onClick={() => onEdit(index)} disabled={actionsDisabled}>{t('common.edit')}</Button>
                            <Button variant="danger" size="sm" onClick={() => onDelete(index)} disabled={actionsDisabled}>{t('common.delete')}</Button>
                        </div>
                    </div>

                    <div className="stack stack-xs" style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{t('common.base_url')}</span>
                            <span>{provider.baseUrl}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{t('ai_providers.openai_keys_count')}</span>
                            <span>{provider.apiKeyEntries?.length || 0}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <span className="status-badge success">{t('stats.success')}: {stats.success}</span>
                        <span className="status-badge error">{t('stats.failure')}: {stats.failure}</span>
                    </div>

                    <ProviderStatusBar statusData={statusData} />
                </div>
             );
          })}
        </div>
      )}
    </DesignCard>
  );
}
