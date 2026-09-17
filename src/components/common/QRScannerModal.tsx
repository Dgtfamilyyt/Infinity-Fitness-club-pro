import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import { 
  Camera, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  User, 
  Dumbbell, 
  MapPin, 
  ShieldAlert,
  RefreshCw,
  LogOut,
  CameraOff,
  SwitchCamera,
  Flame,
  AlertCircle
} from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';
import { CheckInResult, ActiveGymSession } from '../../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffName: string;
}

type ScannerStatus = 'INITIALIZING' | 'SCANNING' | 'PROCESSING' | 'CAMERA_DENIED' | 'CAMERA_UNAVAILABLE';

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, staffName }) => {
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('INITIALIZING');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [manualInput, setManualInput] = useState('');
  const [isManualProcessing, setIsManualProcessing] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  // References to handle scanner lifecycle safely
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const readerElementId = 'ifc-html5-qr-reader';

  // Handle successful scan from camera or manual submission
  const handleScanSuccess = useCallback(async (decodedText: string, method: 'QR' | 'MEMBER_ID' = 'QR') => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setScannerStatus('PROCESSING');
    setCheckoutNotice(null);

    // Pause/stop camera scanner while processing
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.pause(true);
        }
      } catch (err) {
        console.warn('Scanner pause notice:', err);
      }
    }

    try {
      const res = await attendanceService.processMemberCheckIn({
        rawIdentifier: decodedText,
        method,
        staffName
      });
      setCheckInResult(res);
    } catch (err: any) {
      console.error('Check-in processing error:', err);
      setCheckInResult({
        success: false,
        status: 'CHECK_IN_REFUSED',
        message: err?.message || 'Attendance could not be confirmed. Please reconnect and retry.'
      });
    } finally {
      isProcessingRef.current = false;
    }
  }, [staffName]);

  // Start or restart camera scanning
  const startCamera = useCallback(async (cameraIdToUse?: string) => {
    if (!isOpen) return;

    // Ensure any existing scanner instance is cleaned up first
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Cleanup error before start:', e);
      }
      scannerRef.current = null;
    }

    // Wait for DOM element
    const container = document.getElementById(readerElementId);
    if (!container) return;

    setScannerStatus('INITIALIZING');
    setErrorMessage('');

    try {
      const html5QrCode = new Html5Qrcode(readerElementId);
      scannerRef.current = html5QrCode;

      // Discover available camera devices
      let availableCameras: CameraDevice[] = [];
      try {
        availableCameras = await Html5Qrcode.getCameras();
        setCameras(availableCameras);
      } catch (deviceErr) {
        console.warn('Could not enumerate cameras:', deviceErr);
      }

      // Configuration: dynamic responsive qrbox and frame rate
      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const edge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrSize = Math.max(180, Math.floor(edge * 0.72));
          return { width: qrSize, height: qrSize };
        },
        aspectRatio: 1.0
      };

      const onScan = (decodedText: string) => {
        handleScanSuccess(decodedText, 'QR');
      };

      const onError = () => {
        // Continuous non-match frames in camera feed are expected, ignore
      };

      if (cameraIdToUse) {
        await html5QrCode.start(cameraIdToUse, config, onScan, onError);
        setSelectedCameraId(cameraIdToUse);
      } else if (availableCameras.length > 0) {
        // Prefer rear/environment camera on phones
        const backCam = availableCameras.find(c => 
          c.label.toLowerCase().includes('back') || 
          c.label.toLowerCase().includes('rear') || 
          c.label.toLowerCase().includes('environment')
        );
        const targetCam = backCam || availableCameras[0];
        setSelectedCameraId(targetCam.id);
        await html5QrCode.start(targetCam.id, config, onScan, onError);
      } else {
        // Fallback to constraints
        await html5QrCode.start({ facingMode: 'environment' }, config, onScan, onError);
      }

      setScannerStatus('SCANNING');
    } catch (err: any) {
      console.warn('Camera startup note:', err);
      const msg = err?.message || String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission') || msg.includes('denied')) {
        setScannerStatus('CAMERA_DENIED');
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser or use Manual Member ID entry.');
      } else {
        setScannerStatus('CAMERA_UNAVAILABLE');
        setErrorMessage('Camera feed unavailable on this device or origin. Please use manual Member ID entry below.');
      }
    }
  }, [isOpen, handleScanSuccess]);

  // Stop camera when closing
  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Scanner stop note:', err);
      } finally {
        scannerRef.current = null;
      }
    }
  }, []);

  // Modal open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      setCheckInResult(null);
      setCheckoutNotice(null);
      isProcessingRef.current = false;
      // Start camera after DOM node is mounted
      const timer = setTimeout(() => {
        startCamera();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, startCamera, stopCamera]);

  // Handle switching camera
  const handleSwitchCamera = async (newCameraId: string) => {
    setSelectedCameraId(newCameraId);
    await startCamera(newCameraId);
  };

  // Reset scanner to scan next athlete
  const handleResetForNextScan = async () => {
    setCheckInResult(null);
    setCheckoutNotice(null);
    isProcessingRef.current = false;

    if (scannerRef.current) {
      try {
        if (scannerRef.current.isPaused()) {
          scannerRef.current.resume();
          setScannerStatus('SCANNING');
          return;
        }
      } catch (err) {
        console.warn('Resume error:', err);
      }
    }
    await startCamera(selectedCameraId);
  };

  // Handle Manual Form Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualInput.trim();
    if (!clean || isManualProcessing) return;

    setIsManualProcessing(true);
    await handleScanSuccess(clean, 'MEMBER_ID');
    setIsManualProcessing(false);
    setManualInput('');
  };

  // Handle Checkout of already checked in member
  const handleCheckOutAlreadyIn = async (memberUid: string) => {
    setIsCheckingOut(true);
    try {
      const res = await attendanceService.processMemberCheckOut({
        memberUid,
        staffName
      });
      if (res.success) {
        setCheckoutNotice(res.message);
        // Clear result so staff can scan next
        setTimeout(() => {
          handleResetForNextScan();
        }, 1800);
      } else {
        setCheckoutNotice(res.message);
      }
    } catch (e: any) {
      setCheckoutNotice(e?.message || 'Attendance could not be confirmed. Please reconnect and retry.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
    >
      <div 
        id="qr-scanner-modal-card"
        className="relative w-full max-w-lg rounded-3xl bg-[#121214] border border-zinc-800 p-5 sm:p-6 text-white shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base tracking-wide text-zinc-100 uppercase">
                QR Attendance Scanner
              </h3>
              <p className="text-xs text-zinc-400">
                Logged in as <strong className="text-emerald-400">{staffName}</strong>
              </p>
            </div>
          </div>
          <button 
            id="close-scanner-modal-btn"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto pr-1 flex-1 py-4 space-y-4">
          
          {/* CAMERA FEED OR STATUS FRAME */}
          {!checkInResult && (
            <div className="relative rounded-2xl bg-black border border-zinc-800 overflow-hidden min-h-[260px] sm:min-h-[300px] flex flex-col items-center justify-center">
              
              {/* html5-qrcode mount target */}
              <div 
                id={readerElementId} 
                className={`w-full ${scannerStatus === 'SCANNING' || scannerStatus === 'PROCESSING' ? 'block' : 'hidden'}`}
              />

              {/* Status overlays */}
              {scannerStatus === 'INITIALIZING' && (
                <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-400">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
                  <p className="text-sm font-medium text-zinc-200">Initializing Optical Camera...</p>
                  <p className="text-xs text-zinc-500 mt-1">Requesting high-speed lens permissions</p>
                </div>
              )}

              {scannerStatus === 'PROCESSING' && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                  <RefreshCw className="w-9 h-9 text-emerald-400 animate-spin mb-3" />
                  <p className="text-sm font-bold text-white">Validating Cryptographic Pass...</p>
                  <p className="text-xs text-zinc-400 mt-1">Executing atomic Firestore check-in transaction</p>
                </div>
              )}

              {(scannerStatus === 'CAMERA_DENIED' || scannerStatus === 'CAMERA_UNAVAILABLE') && (
                <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-3">
                    <CameraOff className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-100">
                    {scannerStatus === 'CAMERA_DENIED' ? 'Camera Permission Blocked' : 'Camera Device Unavailable'}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                    {errorMessage || 'Use the manual Member ID entry below to check in athletes instantly.'}
                  </p>
                  <button
                    onClick={() => startCamera(selectedCameraId)}
                    className="mt-4 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition font-medium flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Camera
                  </button>
                </div>
              )}

              {/* Camera Switcher Bar (if 2+ cameras detected) */}
              {cameras.length > 1 && scannerStatus === 'SCANNING' && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-black/70 backdrop-blur-md border border-zinc-700/60 rounded-xl px-2.5 py-1 text-xs">
                  <SwitchCamera className="w-3.5 h-3.5 text-emerald-400" />
                  <select
                    value={selectedCameraId}
                    onChange={(e) => handleSwitchCamera(e.target.value)}
                    className="bg-transparent text-zinc-200 text-xs focus:outline-none cursor-pointer"
                  >
                    {cameras.map(cam => (
                      <option key={cam.id} value={cam.id} className="bg-zinc-900 text-white">
                        {cam.label || `Camera ${cam.id.substring(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* CHECK-IN RESULT CARD */}
          {checkInResult && (
            <div 
              id="checkin-result-display"
              className={`p-4 sm:p-5 rounded-2xl border animate-in zoom-in-95 duration-200 ${
                checkInResult.success
                  ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-100'
                  : checkInResult.status === 'ALREADY_CHECKED_IN'
                    ? 'bg-blue-950/30 border-blue-500/40 text-blue-100'
                    : checkInResult.status === 'MEMBERSHIP_FROZEN'
                      ? 'bg-amber-950/25 border-amber-500/40 text-amber-100'
                      : 'bg-red-950/25 border-red-500/40 text-red-100'
              }`}
            >
              {/* Header Status */}
              <div className="flex items-start gap-3">
                {checkInResult.success ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                ) : checkInResult.status === 'ALREADY_CHECKED_IN' ? (
                  <Flame className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                ) : checkInResult.status === 'MEMBERSHIP_FROZEN' ? (
                  <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                )}

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm tracking-wide uppercase">
                      {checkInResult.success 
                        ? 'Check-In Successful' 
                        : checkInResult.status === 'ALREADY_CHECKED_IN'
                          ? 'Athlete Already Checked In'
                          : checkInResult.status === 'MEMBERSHIP_EXPIRED'
                            ? 'Check-In Refused: Membership Expired'
                            : checkInResult.status === 'MEMBERSHIP_FROZEN'
                              ? 'Check-In Refused: Membership Frozen'
                              : 'Check-In Refused'}
                    </span>
                    {checkInResult.member?.status && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        checkInResult.member.status === 'ACTIVE' 
                          ? 'bg-emerald-500/20 text-emerald-300' 
                          : 'bg-zinc-800 text-zinc-300'
                      }`}>
                        {checkInResult.member.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    {checkInResult.message}
                  </p>
                </div>
              </div>

              {/* SUCCESS DETAILS */}
              {checkInResult.success && checkInResult.session && (
                <div className="mt-3.5 pt-3.5 border-t border-emerald-500/20 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/20">
                      <div className="text-[10px] text-zinc-400 uppercase font-semibold">Athlete</div>
                      <div className="text-white font-bold text-sm truncate">{checkInResult.session.memberName}</div>
                      <div className="text-[10px] font-mono text-emerald-400 mt-0.5">{checkInResult.member?.memberId || 'IFC Member'}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/20">
                      <div className="text-[10px] text-zinc-400 uppercase font-semibold">Allocated Floor Zone</div>
                      <div className="text-emerald-400 font-bold text-sm truncate">{checkInResult.session.zoneName}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">Arrived at {checkInResult.session.arrival}</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/20 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase font-semibold">Today's Workout Split</div>
                      <div className="text-white font-semibold text-xs mt-0.5">{checkInResult.session.workoutName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-400 uppercase font-semibold">Trainer</div>
                      <div className="text-emerald-300 font-medium text-xs mt-0.5">{checkInResult.session.trainerName}</div>
                    </div>
                  </div>

                  {/* Safety / Medical Restriction Notice */}
                  {checkInResult.restrictionsFlagged && checkInResult.restrictionsFlagged.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                      <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wide text-amber-300">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        Trainer Safety Protocol Flagged
                      </div>
                      <p className="text-[11px] text-amber-200/90 mt-1 leading-relaxed">
                        {checkInResult.restrictionsFlagged[0]}
                      </p>
                    </div>
                  )}

                  {/* Zone Capacity Reassignment Notice */}
                  {checkInResult.alternativeAssigned && (
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-[11px]">
                      Smart load-balancer reallocated athlete from peak zone to {checkInResult.session.zoneName}.
                    </div>
                  )}
                </div>
              )}

              {/* ALREADY CHECKED IN ACTIONS */}
              {checkInResult.status === 'ALREADY_CHECKED_IN' && checkInResult.session && (
                <div className="mt-3.5 pt-3.5 border-t border-blue-500/20 space-y-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-blue-500/20 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase font-semibold">Active Session</div>
                      <div className="text-white font-bold">{checkInResult.session.memberName}</div>
                      <div className="text-zinc-400 text-[11px]">Inside {checkInResult.session.zoneName} since {checkInResult.session.arrival}</div>
                    </div>
                    <button
                      id="scanner-checkout-athlete-btn"
                      onClick={() => handleCheckOutAlreadyIn(checkInResult.session?.memberId || '')}
                      disabled={isCheckingOut}
                      className="px-3.5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isCheckingOut ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <LogOut className="w-3.5 h-3.5" />
                      )}
                      Check Out
                    </button>
                  </div>

                  {checkoutNotice && (
                    <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs text-center font-medium">
                      {checkoutNotice}
                    </div>
                  )}
                </div>
              )}

              {/* ACTION BUTTON TO RESUME SCANNING */}
              <div className="mt-4 pt-2 flex justify-end">
                <button
                  id="scan-next-athlete-btn"
                  onClick={handleResetForNextScan}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs uppercase tracking-wider transition active:scale-98 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Scan Next Athlete
                </button>
              </div>
            </div>
          )}

          {/* MANUAL MEMBER ID FALLBACK (ALWAYS AVAILABLE) */}
          <form 
            id="manual-member-checkin-form"
            onSubmit={handleManualSubmit} 
            className="pt-2 border-t border-zinc-800/80"
          >
            <div className="flex items-center justify-between mb-1.5">
              <label 
                htmlFor="manual-member-id-input"
                className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold"
              >
                Manual Member ID Fallback:
              </label>
              <span className="text-[10px] text-zinc-500">e.g. IFC-1001, IFC-1002</span>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  id="manual-member-id-input"
                  type="text"
                  placeholder="Enter Member ID (e.g. IFC-1001)..."
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  disabled={isManualProcessing}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono tracking-wide transition"
                />
              </div>
              <button
                id="submit-manual-checkin-btn"
                type="submit"
                disabled={!manualInput.trim() || isManualProcessing}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isManualProcessing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Validate'
                )}
              </button>
            </div>
          </form>

        </div>

        {/* Footer Guidance */}
        <div className="pt-2 border-t border-zinc-800 text-center">
          <p className="text-[11px] text-zinc-500">
            Hold member's Digital Pass 15–20cm in front of camera lens. Transactions persist to Firestore in real-time.
          </p>
        </div>
      </div>
    </div>
  );
};
