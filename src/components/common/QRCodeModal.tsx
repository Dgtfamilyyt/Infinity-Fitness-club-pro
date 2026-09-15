import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, ShieldCheck, X, Copy, Check } from 'lucide-react';
import { UserProfile } from '../../types';

interface QRCodeModalProps {
  member: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ member, isOpen, onClose }) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Opaque secure token - NEVER sensitive PII
  const token = member.qrToken || `IFC_SEC_TOKEN_${member.memberId || '1001'}`;

  useEffect(() => {
    if (isOpen) {
      // Generate QR encoding only the opaque token
      QRCode.toDataURL(token, {
        width: 280,
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
      });
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(member.memberId || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#121214] border border-zinc-800 p-6 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide uppercase text-zinc-200">Infinity Digital Pass</h3>
              <p className="text-xs text-zinc-400">Fast Contactless Check-in</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Header */}
        <div className="text-center py-2 border-b border-zinc-800/80 mb-4">
          <div className="text-lg font-bold text-white tracking-tight">{member.fullName}</div>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {member.status || 'ACTIVE'}
            </span>
            <span className="text-xs text-zinc-400">{member.planName || 'Infinity Plan'}</span>
          </div>
        </div>

        {/* QR Display */}
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-inner my-2">
          {qrUrl ? (
            <img src={qrUrl} alt="Member QR Code" className="w-52 h-52 object-contain" />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-zinc-400 text-sm">
              Generating pass...
            </div>
          )}
          <div className="mt-2 text-[11px] font-mono text-zinc-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Opaque Token: {token.substring(0, 18)}...
          </div>
        </div>

        {/* Manual Fallback */}
        <div className="mt-4 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-400">Manual Member ID</div>
            <div className="text-sm font-mono font-bold text-emerald-400">{member.memberId || 'IFC-1001'}</div>
          </div>
          <button
            onClick={handleCopyId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <p className="text-center text-[11px] text-zinc-500 mt-4 leading-relaxed">
          Hold against the scanner at reception or present to your assigned trainer on the gym floor.
        </p>
      </div>
    </div>
  );
};
