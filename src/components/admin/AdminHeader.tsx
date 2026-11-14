import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  MoreVertical,
  X,
  LayoutDashboard,
  Database,
  LogOut,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  UploadCloud,
  RefreshCw,
  Cloud,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { DeRoteWordmark } from '../DeRoteWordmark';
import { type AdminAccount } from '../../services/adminService';

interface AdminHeaderProps {
  admin: AdminAccount;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenSearchNavigateToList?: () => void;
  onReturnToMainDashboard: () => void;
  onRefreshData: () => void;
  onSyncQuestionnaire: () => void;
  onTestBackendPing: () => void;
  isSyncingQuestionnaire: boolean;
  isTestingPing: boolean;
  backendPingResult: string | null;
  questionCount: number;
  sectionCount: number;
  onSignOut: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  admin,
  searchQuery,
  onSearchChange,
  onOpenSearchNavigateToList,
  onReturnToMainDashboard,
  onRefreshData,
  onSyncQuestionnaire,
  onTestBackendPing,
  isSyncingQuestionnaire,
  isTestingPing,
  backendPingResult,
  questionCount,
  sectionCount,
  onSignOut,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [menuView, setMenuView] = useState<'main' | 'system'>('main');
  const [showTechnicalControls, setShowTechnicalControls] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  // Auto-focus search input when revealed
  useEffect(() => {
    if (isSearchOpen) {
      window.requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [isSearchOpen]);

  // Close menu on outside click or Escape key
  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
        setMenuView('main');
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsMenuOpen(false);
        setMenuView('main');
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const closeMenu = () => {
    setIsMenuOpen(false);
    setMenuView('main');
  };

  const handleOpenSearch = () => {
    closeMenu();
    setIsSearchOpen(true);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
  };

  const handleSearchInputChange = (value: string) => {
    onSearchChange(value);
    if (value.trim() && onOpenSearchNavigateToList) {
      onOpenSearchNavigateToList();
    }
  };

  const handleToggleMenu = () => {
    setIsMenuOpen((prev) => {
      const next = !prev;
      if (next) {
        setMenuView('main');
      }
      return next;
    });
  };

  return (
    <header className="bg-white border-b border-[#E2EDF8] px-4 sm:px-6 lg:px-8 h-14 sm:h-16 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-3">
        {/* Left Zone: DeRote Logo & Brand Name (hidden on <sm when mobile search bar is expanded) */}
        <button
          type="button"
          onClick={onReturnToMainDashboard}
          className={`${
            isSearchOpen ? 'hidden sm:flex' : 'flex'
          } items-center text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0866C6] rounded-lg cursor-pointer shrink-0`}
          title="Return to Main Dashboard"
        >
          <DeRoteWordmark showDescriptor={false} size="md" />
        </button>

        {/* Right Zone: Search Control + Three-Dot Administration Menu */}
        <div
          className={`flex items-center gap-1.5 sm:gap-2 ${
            isSearchOpen ? 'flex-1 sm:flex-initial justify-end' : 'ml-auto'
          }`}
        >
          {/* Compact Search Field (revealed on Search click) */}
          {isSearchOpen ? (
            <div className="flex items-center gap-1.5 w-full sm:w-80 md:w-96 bg-[#F8FAFD] border border-[#0866C6]/50 rounded-xl px-3 h-10 focus-within:ring-2 focus-within:ring-[#0866C6]/15 focus-within:border-[#0866C6] transition-colors">
              <Search className="w-4 h-4 text-[#0866C6] shrink-0" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCloseSearch();
                  } else if (e.key === 'Enter' && onOpenSearchNavigateToList) {
                    onOpenSearchNavigateToList();
                  }
                }}
                placeholder="Search name, email, school, or class..."
                aria-label="Search students by name, email, institution, or class"
                className="w-full bg-transparent text-xs sm:text-sm text-[#062B50] placeholder-[#7B8FA3] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="text-[11px] font-semibold text-[#5A6E85] hover:text-[#062B50] px-1.5 py-0.5 rounded-md hover:bg-[#E8F3FF] cursor-pointer shrink-0"
                  aria-label="Clear search query"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={handleCloseSearch}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#5A6E85] hover:text-[#062B50] hover:bg-[#E8F3FF] cursor-pointer shrink-0"
                aria-label="Close search"
                title="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleOpenSearch}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center text-[#062B50] hover:bg-[#F2F7FC] hover:text-[#0866C6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0866C6] transition-colors cursor-pointer"
              aria-label="Search students"
              aria-expanded={false}
              title={searchQuery.trim() ? `Search active: "${searchQuery.trim()}"` : 'Search students'}
            >
              <Search className="w-[18px] h-[18px]" />
              {searchQuery.trim() && (
                <span
                  className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#0866C6]"
                  aria-hidden="true"
                />
              )}
            </button>
          )}

          {/* Vertical Three-Dot Administration Menu */}
          <div className="relative" ref={menuContainerRef}>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={handleToggleMenu}
              className={`w-10 h-10 rounded-xl flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0866C6] transition-colors cursor-pointer ${
                isMenuOpen
                  ? 'bg-[#EBF4FE] text-[#0866C6]'
                  : 'text-[#062B50] hover:bg-[#F2F7FC] hover:text-[#0866C6]'
              }`}
              aria-label="Administration menu"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              title="Administration menu"
            >
              <MoreVertical className="w-[18px] h-[18px]" />
            </button>

            {isMenuOpen && (
              <div
                role="menu"
                aria-label="Administration navigation menu"
                className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl border border-[#D5E4F3] shadow-lg overflow-hidden z-50"
              >
                {menuView === 'main' ? (
                  <div>
                    {/* Menu Heading */}
                    <div className="px-4 py-3 border-b border-[#E8F3FF] bg-[#F8FAFD]">
                      <div className="text-[11px] font-extrabold tracking-wider uppercase text-[#062B50]">
                        ADMINISTRATION
                      </div>
                      <div className="text-[11px] text-[#5A6E85] truncate mt-0.5">
                        {admin.email}
                      </div>
                    </div>

                    {/* A. DASHBOARD */}
                    <div className="p-2">
                      <div className="px-2.5 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#64778C]">
                        Dashboard
                      </div>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onReturnToMainDashboard();
                          closeMenu();
                        }}
                        className="w-full min-h-[42px] px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left text-sm font-semibold text-[#062B50] hover:bg-[#F2F7FC] hover:text-[#0866C6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0866C6] transition-colors cursor-pointer"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#0866C6] shrink-0" />
                        <span>Main Dashboard</span>
                      </button>
                    </div>

                    {/* B. SYSTEM & BACKEND */}
                    <div className="px-2 pb-2 border-t border-[#F0F6FC] pt-2">
                      <div className="px-2.5 pt-0.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#64778C]">
                        System &amp; Backend
                      </div>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => setMenuView('system')}
                        className="w-full min-h-[42px] px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 text-left text-sm font-semibold text-[#062B50] hover:bg-[#F2F7FC] hover:text-[#0866C6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0866C6] transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <Database className="w-4 h-4 text-[#0866C6] shrink-0" />
                          <span className="truncate">System &amp; Backend</span>
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-semibold text-emerald-700">
                            {backendPingResult === 'Failed' ? 'Check' : 'Active'}
                          </span>
                          <ChevronRight className="w-4 h-4 text-[#64778C]" />
                        </span>
                      </button>
                    </div>

                    {/* C. ACCOUNT */}
                    <div className="p-2 border-t border-[#E8F3FF] bg-[#FBFDFF]">
                      <div className="px-2.5 pt-0.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#64778C]">
                        Account
                      </div>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          closeMenu();
                          onSignOut();
                        }}
                        className="w-full min-h-[42px] px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Dedicated Compact System & Backend Submenu View */
                  <div>
                    <div className="px-3 py-2.5 border-b border-[#E8F3FF] bg-[#F8FAFD] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setMenuView('main')}
                        className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold text-[#0866C6] hover:bg-[#EBF4FE] focus-visible:outline-2 focus-visible:outline-[#0866C6] transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>
                      <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#062B50]">
                        System &amp; Backend
                      </span>
                    </div>

                    <div className="p-3 space-y-3">
                      {/* Backend Connection Status */}
                      <div className="px-3 py-2.5 rounded-xl bg-[#F8FAFD] border border-[#E8F3FF] flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#062B50]">
                            Firebase Backend
                          </div>
                          <div className="text-[11px] text-[#5A6E85] font-mono truncate">
                            gen-lang-client-0276070718
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold shrink-0 ${
                            backendPingResult === 'Failed'
                              ? 'text-red-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {backendPingResult === 'Failed' ? (
                            <AlertCircle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {backendPingResult === 'Failed' ? 'Failed' : 'Active'}
                          </span>
                        </span>
                      </div>

                      {/* Refresh Data */}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onRefreshData();
                          closeMenu();
                        }}
                        className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-[#D5E4F3] bg-white hover:bg-[#F2F7FC] text-[#062B50] font-semibold text-xs flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <RotateCcw className="w-3.5 h-3.5 text-[#0866C6]" />
                          <span>Refresh Data</span>
                        </span>
                        <span className="text-[11px] text-[#64778C]">Reload roster</span>
                      </button>

                      {/* Technical Controls */}
                      <div className="border-t border-[#E8F3FF] pt-2.5 space-y-2">
                        <button
                          type="button"
                          onClick={() => setShowTechnicalControls((prev) => !prev)}
                          aria-expanded={showTechnicalControls}
                          className="w-full px-2 py-1.5 rounded-lg text-xs font-bold text-[#062B50] hover:bg-[#F2F7FC] flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span>Technical Controls</span>
                          <ChevronRight
                            className={`w-3.5 h-3.5 text-[#64778C] transition-transform ${
                              showTechnicalControls ? 'rotate-90' : ''
                            }`}
                          />
                        </button>

                        {showTechnicalControls && (
                          <div className="space-y-2 pt-1">
                            <p className="text-[11px] text-[#5A6E85] px-1 leading-relaxed">
                              Collections: <span className="font-mono text-[#0866C6]">students</span>,{' '}
                              <span className="font-mono text-[#0866C6]">submissions</span>,{' '}
                              <span className="font-mono text-[#0866C6]">drafts</span>,{' '}
                              <span className="font-mono text-[#0866C6]">questionnaires</span> ({questionCount}Q / {sectionCount}S)
                            </p>

                            <button
                              type="button"
                              role="menuitem"
                              onClick={onSyncQuestionnaire}
                              disabled={isSyncingQuestionnaire}
                              className="w-full min-h-[38px] px-3 py-2 rounded-xl bg-[#0866C6] hover:bg-[#062B50] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                            >
                              {isSyncingQuestionnaire ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Syncing Questionnaire...</span>
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="w-3.5 h-3.5" />
                                  <span>Sync Questionnaire to Backend</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              role="menuitem"
                              onClick={onTestBackendPing}
                              disabled={isTestingPing}
                              className="w-full min-h-[38px] px-3 py-2 rounded-xl border border-[#D5E4F3] bg-white hover:bg-[#F2F7FC] text-[#062B50] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                            >
                              {isTestingPing ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0866C6]" />
                              ) : (
                                <Cloud className="w-3.5 h-3.5 text-[#0866C6]" />
                              )}
                              <span>
                                {backendPingResult ? `Ping: ${backendPingResult}` : 'Test Cloud Ping'}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
