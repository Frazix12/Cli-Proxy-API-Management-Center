import { PropsWithChildren, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import iconAmp from '@/assets/icons/amp.svg';
import iconAntigravity from '@/assets/icons/antigravity.svg';
import type { AmpcodeConfig } from '@/types';
import { maskApiKey } from '@/utils/format';

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

interface AmpcodeSectionProps {
  config: AmpcodeConfig | null | undefined;
  loading: boolean;
  disableControls: boolean;
  isSwitching: boolean;
  onEdit: () => void;
}

export function AmpcodeSection({
  config,
  loading,
  disableControls,
  isSwitching,
  onEdit,
}: AmpcodeSectionProps) {
  const { t } = useTranslation();
  const showLoadingPlaceholder = loading && !config;

  return (
    <div className="stack stack-lg">
      <DesignCard
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={iconAmp} alt="" style={{ width: '24px', height: '24px' }} />
            {t('ai_providers.ampcode_title')}
          </span>
        }
        extra={
          <Button
            size="sm"
            variant="secondary"
            onClick={onEdit}
            disabled={disableControls || loading || isSwitching}
          >
            {t('common.edit')}
          </Button>
        }
      >
        {showLoadingPlaceholder ? (
          <div className="hint">{t('common.loading')}</div>
        ) : (
          <div className="card card-nested">
            <div className="stack" style={{ gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('ai_providers.ampcode_upstream_url_label')}</span>
                <span>{config?.upstreamUrl || t('common.not_set')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('ai_providers.ampcode_upstream_api_key_label')}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {config?.upstreamApiKey ? maskApiKey(config.upstreamApiKey) : t('common.not_set')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('ai_providers.ampcode_force_model_mappings_label')}</span>
                <span>{(config?.forceModelMappings ?? false) ? t('common.yes') : t('common.no')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('ai_providers.ampcode_model_mappings_count')}</span>
                <span>{config?.modelMappings?.length || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('ai_providers.ampcode_upstream_api_keys_count')}</span>
                <span>{config?.upstreamApiKeys?.length || 0}</span>
              </div>
            </div>
            
            {config?.modelMappings?.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                {config.modelMappings.slice(0, 10).map((mapping) => (
                  <span key={`${mapping.from}→${mapping.to}`} className="status-badge" style={{ fontSize: '11px', padding: '2px 8px' }}>
                    {mapping.from} → {mapping.to}
                  </span>
                ))}
                {config.modelMappings.length > 10 && (
                  <span className="status-badge" style={{ fontSize: '11px', padding: '2px 8px' }}>
                    +{config.modelMappings.length - 10}
                  </span>
                )}
              </div>
            ) : null}
          </div>
        )}
      </DesignCard>

      <DesignCard
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={iconAntigravity} alt="" style={{ width: '24px', height: '24px' }} />
            Gemini CLI
          </span>
        }
      >
        <div className="card card-nested">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                    Access Gemini via command line interface credentials.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>
                        Auth Files (google_gemini_cli.json)
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => (window.location.hash = '#/auth-files')}>
                        Manage
                    </Button>
                </div>
            </div>
        </div>
      </DesignCard>
    </div>
  );
}
