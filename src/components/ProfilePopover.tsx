import React, { useState } from 'react';
import {
  Gauge,
  ChevronRight,
  ChevronDown,
  Globe,
  Send,
  Settings,
  HelpCircle,
  LogOut,
  Smile,
  Server,
} from 'lucide-react';
import type { ProviderAccount, UserProfile } from '../types';

interface ProfilePopoverProps {
  isOpen: boolean;
  userProfile: UserProfile;
  accounts: ProviderAccount[];
  onClose: () => void;
  onOpenSettings: (initialTab?: string) => void;
  onTogglePet: () => void;
  onOpenOnboarding: () => void;
}

export const ProfilePopover: React.FC<ProfilePopoverProps> = ({
  isOpen,
  userProfile,
  accounts,
  onClose,
  onOpenSettings,
  onTogglePet,
  onOpenOnboarding,
}) => {
  const [quotaExpanded, setQuotaExpanded] = useState(true);

  if (!isOpen) return null;

  // Find primary 5h quota summary for collapsed badge (like "0%" in Screenshot 155653.png)
  const primaryQuota = accounts[0]?.quotas[0]?.percentRemaining ?? 0;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed bottom-12 left-12 z-50 w-72 rounded-2xl bg-[#202020]/95 backdrop-blur-xl border border-[#323232] shadow-2xl py-2 text-sm text-[#ececec] select-none">
        {/* User Header (Screenshot 155653.png & 155701.png) */}
        <div
          onClick={() => {
            onClose();
            onOpenSettings('profil');
          }}
          className="px-3.5 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-[#2a2a2a] transition-colors"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-[#141414] shrink-0"
            style={{ backgroundColor: userProfile.avatarColor || '#b08d57' }}
          >
            {userProfile.initials || 'XL'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white text-sm truncate leading-tight">
              {userProfile.username}
            </div>
            <div className="text-xs text-[#9a9a9a] leading-tight">{userProfile.planName}</div>
          </div>
        </div>

        <div className="my-1.5 border-t border-[#2e2e2e]" />

        {/* Verbleibendes Kontingent (Expandable exactly like Screenshot 155701.png) */}
        <div>
          <button
            type="button"
            onClick={() => setQuotaExpanded(!quotaExpanded)}
            className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-[#2a2a2a] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Gauge className="w-4 h-4 text-[#b4b4b4]" />
              <span className="font-medium text-[13px]">Verbleibendes Kontingent</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#9a9a9a]">
              <span>{primaryQuota}%</span>
              {quotaExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </div>
          </button>

          {quotaExpanded && (
            <div className="px-4 py-1.5 space-y-2.5 max-h-60 overflow-y-auto bg-[#1a1a1a]/60 border-y border-[#292929]">
              {accounts.map((acc) => (
                <div key={acc.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#aaa] uppercase tracking-wider pt-1">
                    <span>{acc.label}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        acc.status === 'authenticated' ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                  </div>
                  {acc.quotas.map((q, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-[13px] pl-2 py-0.5"
                    >
                      <span className="font-semibold text-white">{q.label}</span>
                      <div className="flex items-center gap-2.5 text-[#a8a8a8] tabular-nums">
                        <span
                          className={
                            q.percentRemaining <= 5
                              ? 'text-amber-400 font-semibold'
                              : 'text-[#b8b8b8]'
                          }
                        >
                          {q.percentRemaining}%
                        </span>
                        <span>{q.resetAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              <div className="pt-1 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings('nutzung');
                  }}
                  className="w-full flex items-center justify-between py-1 text-[13px] text-white hover:text-blue-400 transition-colors"
                >
                  <span className="font-medium">Auf Pro upgraden</span>
                  <Globe className="w-3.5 h-3.5 text-[#9a9a9a]" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings('profil');
                  }}
                  className="w-full flex items-center justify-between py-1 text-[13px] text-white hover:text-blue-400 transition-colors"
                >
                  <span className="font-medium">Mehr erfahren</span>
                  <Globe className="w-3.5 h-3.5 text-[#9a9a9a]" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Menu Items (Screenshot 155701.png) */}
        <div className="mt-1 space-y-0.5">
          <button
            type="button"
            onClick={() => {
              onTogglePet();
              onClose();
            }}
            className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-[#2a2a2a] transition-colors text-[13px]"
          >
            <div className="flex items-center gap-2.5">
              <Smile className="w-4 h-4 text-[#b4b4b4]" />
              <span>Pet anzeigen</span>
            </div>
            <span className="text-xs text-[#7a7a7a]">Alt+Win+P</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSettings('profil');
            }}
            className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-[#2a2a2a] transition-colors text-[13px]"
          >
            <div className="flex items-center gap-2.5">
              <Send className="w-4 h-4 text-[#b4b4b4]" />
              <span>Freund:in einladen</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSettings('allgemein');
            }}
            className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-[#2a2a2a] transition-colors text-[13px]"
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-[#b4b4b4]" />
              <span>Einstellungen</span>
            </div>
            <span className="text-xs text-[#7a7a7a]">Ctrl+,</span>
          </button>
        </div>

        <div className="my-1.5 border-t border-[#2e2e2e]" />

        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenOnboarding();
            }}
            className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-[#2a2a2a] transition-colors text-[13px]"
          >
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-blue-400" />
              <span>SSH-Server & Accounts einrichten</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#7a7a7a]" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-[#2a2a2a] transition-colors text-[13px]"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4 text-[#b4b4b4]" />
              <span>Hilfe</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#7a7a7a]" />
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenOnboarding();
            }}
            className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-[#2a2a2a] transition-colors text-[13px] text-[#e0e0e0]"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4 text-[#b4b4b4]" />
              <span>Abmelden</span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
};
