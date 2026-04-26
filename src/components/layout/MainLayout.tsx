import {
  ReactNode,
  SVGProps,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/common/PageTransition';
import { MainRoutes } from '@/router/MainRoutes';
import {
  IconSidebarAuthFiles,
  IconSidebarConfig,
  IconSidebarDashboard,
  IconSidebarLogs,
  IconSidebarOauth,
  IconSidebarProviders,
  IconSidebarQuota,
  IconSidebarSystem,
  IconSidebarUsage,
} from '@/components/ui/icons';
import { INLINE_LOGO_JPEG } from '@/assets/logoInline';
import {
  useAuthStore,
  useConfigStore,
  useLanguageStore,
  useNotificationStore,
  useThemeStore,
} from '@/stores';
import { triggerHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { LANGUAGE_LABEL_KEYS, LANGUAGE_ORDER } from '@/utils/constants';
import { isSupportedLanguage } from '@/utils/language';
import type { Theme } from '@/types';

const sidebarIcons: Record<string, ReactNode> = {
  dashboard: <IconSidebarDashboard size={18} />,
  aiProviders: <IconSidebarProviders size={18} />,
  authFiles: <IconSidebarAuthFiles size={18} />,
  oauth: <IconSidebarOauth size={18} />,
  quota: <IconSidebarQuota size={18} />,
  usage: <IconSidebarUsage size={18} />,
  config: <IconSidebarConfig size={18} />,
  logs: <IconSidebarLogs size={18} />,
  system: <IconSidebarSystem size={18} />,
};

const headerIconProps: SVGProps<SVGSVGElement> = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
};

const headerIcons = {
  refresh: (
    <svg {...headerIconProps}>
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  ),
  menu: (
    <svg {...headerIconProps}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  ),
  language: (
    <svg {...headerIconProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  sun: (
    <svg {...headerIconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ),
  moon: (
    <svg {...headerIconProps}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
    </svg>
  ),
  logout: (
    <svg {...headerIconProps}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  ),
};

const THEMES: Array<{ key: Theme; labelKey: string }> = [
  { key: 'auto', labelKey: 'theme.auto' },
  { key: 'white', labelKey: 'theme.white' },
  { key: 'dark', labelKey: 'theme.dark' },
];

export function MainLayout() {
  const { t } = useTranslation();
  const { showNotification } = useNotificationStore();
  const location = useLocation();

  const logout = useAuthStore((state) => state.logout);

  const config = useConfigStore((state) => state.config);
  const fetchConfig = useConfigStore((state) => state.fetchConfig);
  const clearCache = useConfigStore((state) => state.clearCache);

  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);

  const fullBrandName = 'CPAMC';
  const abbrBrandName = 'CPAMC';
  const isLogsPage = location.pathname.startsWith('/logs');

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!languageMenuRef.current?.contains(event.target as Node)) {
        setLanguageMenuOpen(false);
      }
      if (!themeMenuRef.current?.contains(event.target as Node)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const handleThemeSelect = (nextTheme: Theme) => {
    setTheme(nextTheme);
    setThemeMenuOpen(false);
  };

  const handleLanguageSelect = (nextLanguage: string) => {
    if (!isSupportedLanguage(nextLanguage)) return;
    setLanguage(nextLanguage);
    setLanguageMenuOpen(false);
  };

  useEffect(() => {
    fetchConfig().catch(() => {});
  }, [fetchConfig]);

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: sidebarIcons.dashboard },
    { path: '/config', label: t('nav.config_management'), icon: sidebarIcons.config },
    { path: '/ai-providers', label: t('nav.ai_providers'), icon: sidebarIcons.aiProviders },
    { path: '/auth-files', label: t('nav.auth_files'), icon: sidebarIcons.authFiles },
    { path: '/oauth', label: t('nav.oauth', { defaultValue: 'OAuth' }), icon: sidebarIcons.oauth },
    { path: '/quota', label: t('nav.quota_management'), icon: sidebarIcons.quota },
    { path: '/usage', label: t('nav.usage_stats'), icon: sidebarIcons.usage },
    ...(config?.loggingToFile ? [{ path: '/logs', label: t('nav.logs'), icon: sidebarIcons.logs }] : []),
    { path: '/system', label: t('nav.system_info'), icon: sidebarIcons.system },
  ];

  const handleRefreshAll = async () => {
    clearCache();
    await Promise.allSettled([fetchConfig(undefined, true), triggerHeaderRefresh()]);
    showNotification(t('notification.data_refreshed'), 'success');
  };

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <img src={INLINE_LOGO_JPEG} alt="logo" className="sidebar-brand-logo" />
          {!sidebarCollapsed && <span className="sidebar-brand-title">{abbrBrandName}</span>}
        </div>

        <nav className="nav-section">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main-body">
        <header className="main-header">
          <div className="header-actions">
            <Button variant="ghost" size="sm" onClick={handleRefreshAll}>
              {headerIcons.refresh}
            </Button>
            
            <div className="language-menu" ref={languageMenuRef}>
              <Button variant="ghost" size="sm" onClick={() => setLanguageMenuOpen(!languageMenuOpen)}>
                {headerIcons.language}
              </Button>
              {languageMenuOpen && (
                <div className="language-menu-popover">
                  {LANGUAGE_ORDER.map((lang) => (
                    <button key={lang} className={`language-menu-option ${language === lang ? 'active' : ''}`} onClick={() => handleLanguageSelect(lang)}>
                      {t(LANGUAGE_LABEL_KEYS[lang])}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="theme-menu" ref={themeMenuRef}>
              <Button variant="ghost" size="sm" onClick={() => setThemeMenuOpen(!themeMenuOpen)}>
                {theme === 'dark' ? headerIcons.moon : headerIcons.sun}
              </Button>
              {themeMenuOpen && (
                <div className="theme-menu-popover">
                  {THEMES.map((tc) => (
                    <button key={tc.key} className={`theme-card ${theme === tc.key ? 'active' : ''}`} onClick={() => handleThemeSelect(tc.key)}>
                      {t(tc.labelKey)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button variant="ghost" size="sm" onClick={logout}>
              {headerIcons.logout}
            </Button>
          </div>
        </header>

        <main className="content" ref={contentRef}>
          <div className="main-content">
            <MainRoutes location={location} />
          </div>
        </main>
      </div>
    </div>
  );
}
