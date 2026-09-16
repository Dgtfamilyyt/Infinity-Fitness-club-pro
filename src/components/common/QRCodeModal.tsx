import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, ShieldCheck, X, Copy, Check, AlertCircle, RefreshCw, KeyRound, Sparkles } from 'lucide-react';
import { UserProfile } from '../../types';
import { maskQrToken, isValidQrTokenFormat, generateCryptographicQrToken } from '../../services/qrService';
import { dataService } from '../../services/dataService';
import { attendanceService } from '../../services/attendanceService';

interface QRCodeModalProps {
  member: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  token?: string;
  onRegenerateToken?: (newToken: string) => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ 
  member, 
  isOpen, 
  onClose,
  token: propToken,
  onRegenerateToken
}) => {
  const [activeToken, setActiveToken] = useState<string>('');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  // Initialize or resolve cryptographic token whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    let candidateToken = propToken || member.qrToken;
    if (!candidateToken || !isValidQrTokenFormat(candidateToken)) {
      // Auto-generate opaque cryptographic QR token
      candidateToken = generateCryptographicQrToken();
      dataService.upsertProfile({ ...member, qrToken: candidateToken });
      attendanceService.registerMemberQrToken(member.id, candidateToken);
      if (onRegenerateToken) onRegenerateToken(candidateToken);
    }
    setActiveToken(candidateToken);
  }, [isOpen, propToken, member]);

  // Generate QR code whenever activeToken changes
  useEffect(() => {
    if (isOpen && activeToken && isValidQrTokenFormat(activeToken)) {
      setQrError(null);
      QRCode.toDataURL(activeToken, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      }).then(url => {
        setQrUrl(url);
      }).catch(err => {
        console.error('Failed to generate QR code', err);
        setQrError('Failed to render cryptographic QR image');
      });
    } else {
      setQrUrl('');
    }
  }, [isOpen, activeToken]);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setQrError(null);
    try {
      const newToken = generateCryptographicQrToken();
      setActiveToken(newToken);
      dataService.upsertProfile({ ...member, qrToken: newToken });
      await attendanceService.registerMemberQrToken(member.id, newToken);
      if (onRegenerateToken) {
        onRegenerateToken(newToken);
      }
    } catch (err) {
      console.warn('Failed to regenerate token:', err);
    } finally {
      setTimeout(() => setIsRegenerating(false), 500);
    }
  };

  const handleCopyId = () => {
    if (member.memberId) {
      navigator.clipboard.writeText(member.memberId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleCopyToken = () => {
    if (activeToken) {
      navigator.clipboard.writeText(activeToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  if (!isOpen) return null;

  const isExpired = member.status === 'EXPIRED';
  const isFrozen = member.status === 'FROZEN';
  const hasValidToken = Boolean(activeToken && isValidQrTokenFormat(activeToken));

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="qr-code-modal-card"
        className="relative w-full max-w-sm rounded-3xl bg-[#121214] border border-zinc-800 p-6 text-white shadow-2xl overflow-hidden"
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner">
              <QrCode className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm tracking-wide uppercase text-zinc-100 font-sans">
                  Digital Pass
                </h3>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold uppercase">
                  IFC1
                </span>
              </div>
              <p className="text-xs text-zinc-400">Cryptographic Check-In Token</p>
            </div>
          </div>
          <button 
            id="close-qr-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition"
            aria-label="Close pass modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Header Card */}
        <div className="py-2.5 px-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 mb-3 text-center">
          <div className="text-base font-bold text-white tracking-tight">{member.fullName}</div>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider border ${
              isExpired 
                ? 'bg-red-500/10 text-red-400 border-red-500/30' 
                : isFrozen 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              {member.status || 'ACTIVE'}
            </span>
            <span className="text-xs text-zinc-400 truncate max-w-[160px]">
              {member.planName || 'Infinity Performance'}
            </span>
          </div>
        </div>

        {/* QR Code Presentation Frame */}
        {hasValidToken ? (
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-xl my-2 relative group">
            {qrUrl ? (
              <img 
                src={qrUrl} 
                alt="Member Cryptographic Check-In QR Pass" 
                className="w-52 h-52 object-contain select-none" 
              />
            ) : qrError ? (
              <div className="w-52 h-52 flex flex-col items-center justify-center text-center p-4 text-zinc-700">
                <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                <span className="text-xs font-medium">{qrError}</span>
              </div>
            ) : (
              <div className="w-52 h-52 flex flex-col items-center justify-center text-zinc-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-500 mb-2" />
                <span>Rendering cryptographic pass...</span>
              </div>
            )}

            <div className="mt-2 text-[11px] font-mono text-zinc-700 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{maskQrToken(activeToken)}</span>
            </div>
          </div>
        ) : (
          <div className="p-6 my-2 rounded-2xl bg-zinc-900 border border-zinc-800 text-center flex flex-col items-center justify-center">
            <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
            <h4 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">
              Token Generation Required
            </h4>
            <button
              onClick={handleRegenerate}
              className="mt-3 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider"
            >
              Generate Cryptographic Pass
            </button>
          </div>
        )}

        {/* Token Management & Copy Bar */}
        <div className="mt-3 space-y-2">
          {/* Member ID & Token actions */}
          <div className="p-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400">
                Member ID
              </div>
              <div className="text-xs font-mono font-bold text-emerald-400 tracking-wider">
                {member.memberId || 'IFC-1001'}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                id="copy-member-id-btn"
                onClick={handleCopyId}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-200 transition font-medium active:scale-95"
                title="Copy Member ID"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId ? 'Copied' : 'ID'}</span>
              </button>

              <button
                id="copy-qr-token-btn"
                onClick={handleCopyToken}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-200 transition font-medium active:scale-95"
                title="Copy Cryptographic Token"
              >
                {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <KeyRound className="w-3.5 h-3.5" />}
                <span>{copiedToken ? 'Copied' : 'Token'}</span>
              </button>
            </div>
          </div>

          {/* Regenerate Token Quick Control */}
          <button
            id="regenerate-qr-token-btn"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="w-full py-2 px-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>{isRegenerating ? 'Generating New Pass...' : 'Regenerate Cryptographic Pass'}</span>
          </button>
        </div>

        <p className="text-center text-[11px] text-zinc-500 mt-3 leading-relaxed">
          Hold against the scanner at reception or present to your trainer on the gym floor for instant smart check-in.
        </p>
      </div>
    </div>
  );
};
