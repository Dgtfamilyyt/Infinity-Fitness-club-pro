import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, ShieldCheck, X, Copy, Check, AlertCircle } from 'lucide-react';
import { UserProfile } from '../../types';
import { maskQrToken, isValidQrTokenFormat } from '../../services/qrService';

interface QRCodeModalProps {
  member: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ member, isOpen, onClose }) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  const token = member.qrToken;
  const hasValidIssuedToken = Boolean(token && isValidQrTokenFormat(token));

  useEffect(() => {
    if (isOpen && hasValidIssuedToken && token) {
      setQrError(null);
      // Generate QR encoding ONLY the opaque cryptographic token - NO PII
      QRCode.toDataURL(token, {
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
        setQrError('Failed to render digital QR image');
      });
    } else {
      setQrUrl('');
    }
  }, [isOpen, token, hasValidIssuedToken]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    if (member.memberId) {
      navigator.clipboard.writeText(member.memberId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isExpired = member.status === 'EXPIRED';
  const isFrozen = member.status === 'FROZEN';

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
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide uppercase text-zinc-100 font-sans">
                Infinity Digital Pass
              </h3>
              <p className="text-xs text-zinc-400">Contactless Floor Check-In</p>
            </div>
          </div>
          <button 
            id="close-qr-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Header Card */}
        <div className="py-2.5 px-3 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 mb-4 text-center">
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
        {hasValidIssuedToken ? (
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-xl my-2">
            {qrUrl ? (
              <img 
                src={qrUrl} 
                alt="Member Cryptographic QR Pass" 
                className="w-52 h-52 object-contain select-none" 
              />
            ) : qrError ? (
              <div className="w-52 h-52 flex flex-col items-center justify-center text-center p-4 text-zinc-700">
                <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                <span className="text-xs font-medium">{qrError}</span>
              </div>
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-zinc-400 text-xs">
                Rendering cryptographic pass...
              </div>
            )}
            <div className="mt-2 text-[11px] font-mono text-zinc-600 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{maskQrToken(token)}</span>
            </div>
          </div>
        ) : (
          /* NO FAKE FALLBACK: Display explicit notice if token is not issued */
          <div className="p-6 my-2 rounded-2xl bg-zinc-900 border border-amber-500/30 text-center flex flex-col items-center justify-center">
            <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
            <h4 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">
              Digital Pass Not Issued
            </h4>
            <p className="text-xs text-zinc-400 mt-1.5 max-w-[240px] leading-relaxed">
              Please contact the front desk at Infinity Fitness Club reception to activate your cryptographic pass.
            </p>
          </div>
        )}

        {/* Fallback Member ID Copy Bar */}
        <div className="mt-4 p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400">
              Manual Member ID
            </div>
            <div className="text-sm font-mono font-bold text-emerald-400 tracking-wider">
              {member.memberId || 'IFC-1001'}
            </div>
          </div>
          <button
            id="copy-member-id-btn"
            onClick={handleCopyId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition font-medium active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy ID'}
          </button>
        </div>

        <p className="text-center text-[11px] text-zinc-500 mt-4 leading-relaxed">
          Hold against the scanner at reception or present to your trainer on the gym floor for instant smart check-in.
        </p>
      </div>
    </div>
  );
};
