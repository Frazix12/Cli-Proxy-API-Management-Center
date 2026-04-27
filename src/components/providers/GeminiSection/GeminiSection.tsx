import { Fragment, useMemo, type PropsWithChildren, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import iconGemini from '@/assets/icons/gemini.svg';
import type { GeminiKeyConfig } from '@/types';
import { maskApiKey } from '@/utils/format';
import { calculateStatusBarData, type KeyStats } from '@/utils/usage';
import { type UsageDetailsByAuthIndex, type UsageDetailsBySource } from '@/utils/usageIndex';
import { ProviderList } from '../ProviderList';
import { ProviderStatusBar } from '../ProviderStatusBar';
import {
  collectUsageDetailsForIdentity,
  getProviderConfigKey,
  getStatsForIdentity,
  hasDisableAllModelsRule,
} from '../utils';

// Local Card component to match new design
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

interface GeminiSectionProps {
  configs: GeminiKeyConfig[];
  keyStats: KeyStats;
  usageDetailsBySource: UsageDetailsBySource;
  usageDetailsByAuthIndex: UsageDetailsByAuthIndex;
  loading: boolean;
  disableControls: boolean;
  isSwitching: boolean;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onToggle: (index: number, enabled: boolean) => void;
}

export function GeminiSection({
  configs,
  keyStats,
  usageDetailsBySource,
  usageDetailsByAuthIndex,
  loading,
  disableControls,
  isSwitching,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
}: GeminiSectionProps) {
  const { t } = useTranslation();
  const actionsDisabled = disableControls || loading || isSwitching;
  const toggleDisabled = disableControls || loading || isSwitching;

  const statusBarCache = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof calculateStatusBarData>>();

    configs.forEach((config, index) => {
      if (!config.apiKey) return;
      const configKey = getProviderConfigKey(config, index);
      cache.set(
        configKey,
        calculateStatusBarData(
          collectUsageDetailsForIdentity(
            { authIndex: config.authIndex, apiKey: config.apiKey, prefix: config.prefix },
            usageDetailsBySource,
            usageDetailsByAuthIndex
          )
        )
      );
    });

    return cache;
  }, [configs, usageDetailsByAuthIndex, usageDetailsBySource]);

  return (
    <DesignCard
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={iconGemini} alt="" style={{ width: '24px', height: '24px' }} />
          {t('ai_providers.gemini_title')}
        </span>
      }
      extra={
        <Button size="sm" onClick={onAdd} disabled={actionsDisabled} variant="secondary">
          {t('ai_providers.gemini_add_button')}
        </Button>
      }
    >
      <ProviderList<GeminiKeyConfig>
        items={configs}
        loading={loading}
        keyField={(item, index) => getProviderConfigKey(item, index)}
        emptyTitle={t('ai_providers.gemini_empty_title')}
        emptyDescription={t('ai_providers.gemini_empty_desc')}
        onEdit={(_, index) => onEdit(index)}
        onDelete={(_, index) => onDelete(index)}
        actionsDisabled={actionsDisabled}
        getRowDisabled={(item) => hasDisableAllModelsRule(item.excludedModels)}
        renderExtraActions={(item, index) => (
          <ToggleSwitch
            label={t('ai_providers.config_toggle_label')}
            checked={!hasDisableAllModelsRule(item.excludedModels)}
            disabled={toggleDisabled}
            onChange={(value) => void onToggle(index, value)}
          />
        )}
        renderContent={(item, index) => {
          const stats = getStatsForIdentity(
            { authIndex: item.authIndex, apiKey: item.apiKey, prefix: item.prefix },
            keyStats
          );
          const headerEntries = Object.entries(item.headers || {});
          const configDisabled = hasDisableAllModelsRule(item.excludedModels);
          const statusData =
            statusBarCache.get(getProviderConfigKey(item, index)) || calculateStatusBarData([]);

          return (
            <div className="card card-nested">
              <div className="item-title" style={{ fontFamily: 'var(--font-display)', fontSize: '18px', marginBottom: '16px' }}>
                {t('ai_providers.gemini_item_title')} #{index + 1}
              </div>
              
              <div className="stack" style={{ gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('common.api_key')}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{maskApiKey(item.apiKey)}</span>
                </div>
                {item.baseUrl && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{t('common.base_url')}</span>
                        <span>{item.baseUrl}</span>
                    </div>
                )}
              </div>

              {headerEntries.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '12px' }}>
                  {headerEntries.map(([key, value]) => (
                    <span key={key} className="pill">
                      <strong>{key}:</strong> {value}
                    </span>
                  ))}
                </div>
              )}

              {configDisabled && (
                <div className="status-badge warning" style={{ marginTop: 12 }}>
                  {t('ai_providers.config_disabled_badge')}
                </div>
              )}

              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <span className="status-badge success">{t('stats.success')}: {stats.success}</span>
                <span className="status-badge error">{t('stats.failure')}: {stats.failure}</span>
              </div>

              <div style={{ marginTop: '16px' }}>
                <ProviderStatusBar statusData={statusData} />
              </div>
            </div>
          );
        }}
      />
    </DesignCard>
  );
}
