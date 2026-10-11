import React, { useEffect, useRef, useState } from 'react';
import { LogOut, Menu, Monitor, Moon, Plus, Settings, Sun, Upload } from 'lucide-react';
import { ActiveTab, Transaction } from '../types/budget';
import { ThemeMode, AccentColor, ACCENT_COLORS, DEFAULT_ACCENT } from '../constants/theme';

interface HeaderProps {
  activeTab: ActiveTab;
  isAccountHolder: boolean;
  onOpenImportCsv: () => void;
  onOpenAddBill: () => void;
  onOpenAddTransaction: (prefill?: Partial<Transaction>) => void;
  onOpenMobileMenu: () => void;
  themeMode: ThemeMode;
  onChangeTheme: (theme: ThemeMode) => void;
  accentColor: AccentColor;
  onChangeAccent: (accent: AccentColor) => void;
  userEmail: string;
  onSignOut: () => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  isAccountHolder,
  onOpenImportCsv,
  onOpenAddBill,
  onOpenAddTransaction,
  onOpenMobileMenu,
  themeMode,
  onChangeTheme,
  accentColor,
  onChangeAccent,
  userEmail,
  onSignOut,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !settingsRef.current?.contains(event.target)) {
        setSettingsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
        settingsButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [settingsOpen]);

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Personal Dashboard';
      case 'incoming': return 'Incoming Money & Deposits';
      case 'outgoing': return 'Outgoing Expenses & Debits';
      case 'household-bills': return 'Household Bills & Split Rules';
      case 'members': return 'Member Profiles & Allocations';
      case 'settlement': return 'Settlement Matrix & Balances';
      default: return 'Dashboard';
    }
  };

  const today = new Date();
  const currentMonthYear = today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <header className="hdr-root">
      {/* Zone 1: Breadcrumb Trail */}
      <div className="hdr-left">
        <button
          onClick={onOpenMobileMenu}
          className="hdr-menu-btn"
          aria-label="Open sidebar"
        >
          <Menu className="hdr-icon" />
        </button>
        <div className="hdr-breadcrumb">
          <span className="hdr-breadcrumb-prefix hidden sm:inline">Hearth</span>
          <span className="hdr-breadcrumb-sep hidden sm:inline" aria-hidden="true">/</span>
          <h1 className="hdr-title">{getBreadcrumbTitle()}</h1>
        </div>
      </div>

      {/* Zone 2: Month / Household context */}
      {isAccountHolder && (
        <div className="hdr-center hidden md:flex">
          <span>Cycle: <strong className="hdr-highlight">{currentMonthYear}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Account: <strong className="hdr-highlight">Lora &amp; Carl (Shared)</strong></span>
        </div>
      )}

      {/* Zone 3: Primary Actions */}
      <div className="hdr-right">
        {isAccountHolder && (
          <>
            <button
              onClick={onOpenImportCsv}
              className="hdr-btn hdr-btn--secondary"
              title="Import bank statement CSV"
            >
              <Upload className="hdr-icon-sm" />
              <span className="hidden sm:inline">Import CSV</span>
            </button>
            {activeTab === 'household-bills' ? (
              <button
                onClick={onOpenAddBill}
                className="hdr-btn hdr-btn--primary"
              >
                <Plus className="hdr-icon-sm" />
                <span className="hidden sm:inline">Add Bill</span>
              </button>
            ) : (
              <button
                onClick={() => onOpenAddTransaction({})}
                className="hdr-btn hdr-btn--primary"
              >
                <Plus className="hdr-icon-sm" />
                <span className="hidden sm:inline">Record Flow</span>
              </button>
            )}
          </>
        )}

        {/* Settings Dropdown */}
        <div className="hdr-settings-wrap" ref={settingsRef}>
          <button
            ref={settingsButtonRef}
            type="button"
            onClick={() => {
              setSettingsOpen((open) => !open);
              setSignOutError('');
            }}
            className="hdr-settings-btn"
            aria-label="Open settings"
            aria-expanded={settingsOpen}
          >
            <Settings className="hdr-icon-sm" />
          </button>

          {settingsOpen && (
            <div className="hdr-settings-panel" role="dialog" aria-label="Settings">
              {/* Panel Header */}
              <div className="hdr-settings-head">
                <div>
                  <h2 className="hdr-settings-title">Appearance</h2>
                  <p className="hdr-settings-sub">Choose how HurlesLedger looks.</p>
                </div>
                <Settings className="hdr-icon-sm hdr-icon-muted" />
              </div>

              {/* Theme Mode Toggle */}
              <div className="hdr-theme-toggle">
                {([
                  { value: 'light' as const, label: 'Light', Icon: Sun },
                  { value: 'dark' as const, label: 'Dark', Icon: Moon },
                  { value: 'system' as const, label: 'System', Icon: Monitor },
                ]).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onChangeTheme(value)}
                    aria-pressed={themeMode === value}
                    className={`hdr-theme-option ${themeMode === value ? 'is-active' : ''}`}
                  >
                    <Icon className="hdr-icon-sm" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Accent Color Picker */}
              <div className="hdr-accent-section">
                <p className="hdr-accent-label">Accent Color</p>
                <div className="hdr-accent-grid">
                  {ACCENT_COLORS.map((accent) => (
                    <button
                      key={accent.id}
                      type="button"
                      onClick={() => onChangeAccent(accent.id)}
                      title={accent.label}
                      className={`hdr-accent-swatch ${accentColor === accent.id ? 'is-selected' : ''}`}
                      style={{ '--accent-hex': accent.hex } as React.CSSProperties}
                    >
                      {accentColor === accent.id && (
                        <span className="hdr-accent-check">✓</span>
                      )}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onChangeAccent(DEFAULT_ACCENT)}
                  className="hdr-reset-link"
                >
                  Reset to default
                </button>
              </div>

              {/* Account & Sign Out */}
              <div className="hdr-account-section">
                <div className="hdr-email-display" title={userEmail}>
                  Signed in as <span className="hdr-email">{userEmail}</span>
                </div>
                {signOutError && (
                  <p role="alert" className="hdr-error-text">{signOutError}</p>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await onSignOut();
                    } catch (error) {
                      setSignOutError(error instanceof Error ? error.message : 'Sign out failed.');
                    }
                  }}
                  className="hdr-signout-btn"
                >
                  <LogOut className="hdr-icon-sm" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};