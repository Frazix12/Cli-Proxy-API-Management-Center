import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useNotificationStore, useThemeStore } from '@/stores';
import { oauthApi, type OAuthProvider } from '@/services/api/oauth';
import { vertexApi, type VertexImportResponse } from '@/services/api/vertex';
import { copyToClipboard } from '@/utils/clipboard';
import iconCodex from '@/assets/icons/codex.svg';
import iconClaude from '@/assets/icons/claude.svg';
import iconAntigravity from '@/assets/icons/antigravity.svg';
import iconGemini from '@/assets/icons/gemini.svg';
import iconKimiLight from '@/assets/icons/kimi-light.svg';
import iconKimiDark from '@/assets/icons/kimi-dark.svg';
import iconVertex from '@/assets/icons/vertex.svg';

interface ProviderState {
  url?: string;
  state?: string;
  status?: 'idle' | 'waiting' | 'success' | 'error';
  error?: string;
  polling?: boolean;
  projectId?: string;
  projectIdError?: string;
  callbackUrl?: string;
  callbackSubmitting?: boolean;
  callbackStatus?: 'success' | 'error';
  callbackError?: string;
}

interface VertexImportResult {
  projectId?: string;
  email?: string;
  location?: string;
  authFile?: string;
}

interface VertexImportState {
  file?: File;
  fileName: string;
  location: string;
  loading: boolean;
  error?: string;
  result?: VertexImportResult;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (isRecord(error) && typeof error.message === 'string') return error.message;
  return typeof error === 'string' ? error : '';
}

const PROVIDERS: { id: OAuthProvider; titleKey: string; hintKey: string; urlLabelKey: string; icon: string | { light: string; dark: string } }[] = [
  { id: 'codex', titleKey: 'auth_login.codex_oauth_title', hintKey: 'auth_login.codex_oauth_hint', urlLabelKey: 'auth_login.codex_oauth_url_label', icon: iconCodex },
  { id: 'anthropic', titleKey: 'auth_login.anthropic_oauth_title', hintKey: 'auth_login.anthropic_oauth_hint', urlLabelKey: 'auth_login.anthropic_oauth_url_label', icon: iconClaude },
  { id: 'antigravity', titleKey: 'auth_login.antigravity_oauth_title', hintKey: 'auth_login.antigravity_oauth_hint', urlLabelKey: 'auth_login.antigravity_oauth_url_label', icon: iconAntigravity },
  { id: 'gemini-cli', titleKey: 'auth_login.gemini_cli_oauth_title', hintKey: 'auth_login.gemini_cli_oauth_hint', urlLabelKey: 'auth_login.gemini_cli_oauth_url_label', icon: iconGemini },
  { id: 'kimi', titleKey: 'auth_login.kimi_oauth_title', hintKey: 'auth_login.kimi_oauth_hint', urlLabelKey: 'auth_login.kimi_oauth_url_label', icon: { light: iconKimiLight, dark: iconKimiDark } }
];

const CALLBACK_SUPPORTED: OAuthProvider[] = ['codex', 'anthropic', 'antigravity', 'gemini-cli'];
const getProviderI18nPrefix = (provider: OAuthProvider) => provider.replace('-', '_');
const getAuthKey = (provider: OAuthProvider, suffix: string) =>
  `auth_login.${getProviderI18nPrefix(provider)}_${suffix}`;

const getIcon = (icon: string | { light: string; dark: string }, theme: 'light' | 'dark') => {
  return typeof icon === 'string' ? icon : icon[theme];
};

export function OAuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showNotification } = useNotificationStore();
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const [states, setStates] = useState<Record<OAuthProvider, ProviderState>>({} as Record<OAuthProvider, ProviderState>);
  const [vertexState, setVertexState] = useState<VertexImportState>({
    fileName: '',
    location: '',
    loading: false
  });
  const pollingTimers = useRef<Partial<Record<OAuthProvider, number>>>({});
  const vertexFileInputRef = useRef<HTMLInputElement | null>(null);

  const updateProviderState = (provider: OAuthProvider, next: Partial<ProviderState>) => {
    setStates((prev) => ({
      ...prev,
      [provider]: { ...(prev[provider] ?? {}), ...next }
    }));
  };

  const startPolling = (provider: OAuthProvider, state: string) => {
    const timer = window.setInterval(async () => {
      try {
        const res = await oauthApi.getAuthStatus(state);
        if (res.status === 'ok') {
          updateProviderState(provider, { status: 'success', polling: false });
          showNotification(t(getAuthKey(provider, 'oauth_status_success')), 'success');
          window.clearInterval(timer);
        } else if (res.status === 'error') {
          updateProviderState(provider, { status: 'error', error: res.error, polling: false });
          window.clearInterval(timer);
        }
      } catch (err: unknown) {
        updateProviderState(provider, { status: 'error', error: getErrorMessage(err), polling: false });
        window.clearInterval(timer);
      }
    }, 3000);
    pollingTimers.current[provider] = timer;
  };

  const startAuth = async (provider: OAuthProvider) => {
    const geminiState = states[provider];
    updateProviderState(provider, { status: 'waiting', polling: true, error: undefined });
    try {
      const res = await oauthApi.startAuth(provider, provider === 'gemini-cli' ? { projectId: geminiState?.projectId } : undefined);
      if (!res.state) throw new Error('Missing state');
      updateProviderState(provider, { url: res.url, state: res.state });
      startPolling(provider, res.state);
    } catch (err: unknown) {
      updateProviderState(provider, { status: 'error', error: getErrorMessage(err), polling: false });
    }
  };

  const submitCallback = async (provider: OAuthProvider) => {
    const redirectUrl = (states[provider]?.callbackUrl || '').trim();
    updateProviderState(provider, { callbackSubmitting: true });
    try {
      await oauthApi.submitCallback(provider, redirectUrl);
      updateProviderState(provider, { callbackSubmitting: false, callbackStatus: 'success' });
      showNotification(t('auth_login.oauth_callback_success'), 'success');
    } catch (err: unknown) {
      updateProviderState(provider, { callbackSubmitting: false, callbackStatus: 'error', callbackError: getErrorMessage(err) });
    }
  };

  const handleVertexImport = async () => {
    if (!vertexState.file) return;
    setVertexState((prev) => ({ ...prev, loading: true }));
    try {
      const res: VertexImportResponse = await vertexApi.importCredential(vertexState.file, vertexState.location || undefined);
      setVertexState((prev) => ({ ...prev, loading: false, result: { projectId: res.project_id, email: res.email, location: res.location, authFile: res.auth_file } }));
      showNotification(t('vertex_import.success'), 'success');
    } catch (err: unknown) {
      setVertexState((prev) => ({ ...prev, loading: false, error: getErrorMessage(err) }));
    }
  };

  return (
    <div className="page-container">
      <header className="section-header">
        <h1>{t('nav.oauth')}</h1>
      </header>

      <div className="grid grid-2">
        {PROVIDERS.map((provider) => {
          const state = states[provider.id] || {};
          const canSubmitCallback = CALLBACK_SUPPORTED.includes(provider.id) && Boolean(state.url);
          
          return (
            <div key={provider.id} className="card">
              <header className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={getIcon(provider.icon, resolvedTheme)} alt="" style={{ width: '24px', height: '24px' }} />
                    <span className="title">{t(provider.titleKey)}</span>
                </div>
                <Button onClick={() => startAuth(provider.id)} loading={state.polling} variant="primary" size="sm">
                    {t(getAuthKey(provider.id, 'oauth_button'))}
                </Button>
              </header>

              <div className="stack stack-md">
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t(provider.hintKey)}</p>
                
                {provider.id === 'gemini-cli' && (
                  <Input
                    label={t('auth_login.gemini_cli_project_id_label')}
                    value={state.projectId || ''}
                    onChange={(e) => updateProviderState(provider.id, { projectId: e.target.value })}
                    placeholder="Project ID / ALL"
                  />
                )}

                {state.url && (
                    <div className="card card-nested">
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t(provider.urlLabelKey)}</div>
                        <div style={{ wordBreak: 'break-all', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '12px' }}>{state.url}</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button variant="secondary" size="sm" onClick={() => copyToClipboard(state.url!)}>{t('common.copy')}</Button>
                            <Button variant="secondary" size="sm" onClick={() => window.open(state.url, '_blank')}>{t('common.open')}</Button>
                        </div>
                    </div>
                )}

                {canSubmitCallback && (
                    <div className="stack stack-xs">
                        <Input
                            label={t('auth_login.oauth_callback_label')}
                            value={state.callbackUrl || ''}
                            onChange={(e) => updateProviderState(provider.id, { callbackUrl: e.target.value })}
                        />
                        <Button variant="secondary" size="sm" onClick={() => submitCallback(provider.id)} loading={state.callbackSubmitting}>
                            {t('auth_login.oauth_callback_button')}
                        </Button>
                    </div>
                )}

                {state.status && state.status !== 'idle' && (
                    <div className={`status-badge ${state.status}`}>
                        {state.status === 'success' ? t('common.success') : state.status === 'error' ? state.error : t('common.loading')}
                    </div>
                )}
              </div>
            </div>
          );
        })}

        <div className="card">
            <header className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={iconVertex} alt="" style={{ width: '24px', height: '24px' }} />
                    <span className="title">{t('vertex_import.title')}</span>
                </div>
                <Button onClick={handleVertexImport} loading={vertexState.loading} variant="primary" size="sm">
                    {t('vertex_import.import_button')}
                </Button>
            </header>
            
            <div className="stack stack-md">
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('vertex_import.description')}</p>
                <Input label={t('vertex_import.location_label')} value={vertexState.location} onChange={e => setVertexState(prev => ({ ...prev, location: e.target.value }))} />
                
                <div className="stack stack-xs">
                    <label style={{ fontSize: '12px', fontWeight: '600' }}>{t('vertex_import.file_label')}</label>
                    <Button variant="secondary" onClick={() => vertexFileInputRef.current?.click()}>
                        {vertexState.fileName || t('vertex_import.choose_file')}
                    </Button>
                    <input ref={vertexFileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={e => setVertexState(prev => ({ ...prev, file: e.target.files?.[0], fileName: e.target.files?.[0]?.name || '' }))} />
                </div>

                {vertexState.result && (
                    <div className="card card-nested">
                        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>{t('vertex_import.result_title')}</div>
                        <div style={{ fontSize: '12px' }}>{vertexState.result.authFile}</div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
