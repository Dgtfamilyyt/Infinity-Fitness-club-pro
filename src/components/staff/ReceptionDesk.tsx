import React, { useState } from 'react';
import { 
  Camera, 
  Search, 
  LogOut, 
  CreditCard, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  UserCheck, 
  MapPin, 
  Plus,
  ArrowRight
} from 'lucide-react';
import { UserProfile, GymZone, ActiveGymSession, PaymentRecord } from '../../types';
import { dataService } from '../../services/dataService';
import { attendanceService } from '../../services/attendanceService';
import { QRScannerModal } from '../common/QRScannerModal';
import { LiveFloorStatus } from '../common/LiveFloorStatus';

interface ReceptionDeskProps {
  zones: GymZone[];
  activeSessions: ActiveGymSession[];
  members: UserProfile[];
  payments: PaymentRecord[];
}

export const ReceptionDesk: React.FC<ReceptionDeskProps> = ({
  zones,
  activeSessions,
  members,
  payments
}) => {
  const [showScanner, setShowScanner] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scanMessage, setScanMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Payment Recording State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayMember, setSelectedPayMember] = useState<UserProfile>(members[0] || {} as any);
  const [payAmount, setPayAmount] = useState<number>(8999);
  const [payMethod, setPayMethod] = useState<PaymentRecord['paymentMethod']>('UPI');
  const [payRef, setPayRef] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Pre-register Member State
  const [showPreRegisterModal, setShowPreRegisterModal] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPlan, setRegPlan] = useState('Quarterly Transformation');

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    try {
      const res = await attendanceService.processMemberCheckIn({
        rawIdentifier: manualInput,
        method: 'MANUAL',
        staffName: 'Reception Desk'
      });
      setScanMessage({ success: res.success, text: res.message });
    } catch {
      setScanMessage({ success: false, text: 'Attendance could not be confirmed. Please reconnect and retry.' });
    }
    setManualInput('');
  };

  const handleCheckOut = async (sessionId: string) => {
    try {
      const res = await attendanceService.processMemberCheckOut({
        memberUid: sessionId,
        staffName: 'Reception Desk'
      });
      if (!res.success) {
        setScanMessage({ success: false, text: res.message });
      }
    } catch {
      setScanMessage({ success: false, text: 'Attendance could not be confirmed. Please reconnect and retry.' });
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRecordingPayment(true);
    setPaymentError(null);
    try {
      await dataService.recordPayment({
        memberId: selectedPayMember.id,
        memberName: selectedPayMember.fullName,
        planName: selectedPayMember.planName || 'Quarterly Transformation',
        amount: Number(payAmount),
        paymentMethod: payMethod,
        reference: payRef.trim() || `TXN-${Date.now()}`,
        recordedBy: 'Receptionist'
      });

      setShowPaymentModal(false);
      setPayRef('');
    } catch (err: any) {
      setPaymentError(err?.message || 'Payment recording failed. Please retry.');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Check In */}
      <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
            RECEPTION & CHECK-IN DESK
          </span>
          <h2 className="text-2xl font-black text-white uppercase mt-1">Live Front Desk Operations</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Contactless QR, manual badges, session check-outs & payments</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowPreRegisterModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Pre-register Member</span>
          </button>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition"
          >
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Record Payment</span>
          </button>

          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/10"
          >
            <Camera className="w-4 h-4" />
            <span>Launch QR Scanner</span>
          </button>
        </div>
      </div>

      {/* Manual Check-in Form */}
      <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-4 shadow-xl">
        <form onSubmit={handleManualCheckIn} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Fast Check-In: Scan token, enter member ID (e.g. IFC-1001), or member name..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition shrink-0"
          >
            Check-In
          </button>
        </form>

        {scanMessage && (
          <div className={`mt-3 p-3 rounded-xl border flex items-center gap-2 text-xs ${
            scanMessage.success 
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
              : 'bg-red-950/20 border-red-500/30 text-red-300'
          }`}>
            {scanMessage.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{scanMessage.text}</span>
          </div>
        )}
      </div>

      {/* Live Floor Status */}
      <LiveFloorStatus zones={zones} totalInside={activeSessions.length} />

      {/* Active Floor Members */}
      <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white uppercase tracking-wide">
              Athletes Inside Club ({activeSessions.length})
            </h3>
          </div>
          <span className="text-xs text-zinc-400 font-mono">Real-time floor tracking</span>
        </div>

        {activeSessions.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs">
            No members currently on the gym floor. Check in athletes above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 rounded-l-lg">Athlete</th>
                  <th className="py-3 px-4">Arrival</th>
                  <th className="py-3 px-4">Workout</th>
                  <th className="py-3 px-4">Zone Allocated</th>
                  <th className="py-3 px-4">Coach</th>
                  <th className="py-3 px-4 rounded-r-lg text-right">Floor Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {activeSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-zinc-900/40 transition">
                    <td className="py-3 px-4 font-bold text-white">
                      <div>{session.memberName}</div>
                      <span className="text-[10px] font-mono font-normal text-emerald-400">
                        {session.memberStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-300 font-semibold">{session.arrival}</td>
                    <td className="py-3 px-4 text-zinc-300">{session.workoutName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-emerald-400 font-medium">
                        {session.zoneName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{session.trainerName || 'Floor Coach'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleCheckOut(session.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition inline-flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Check-Out</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-[#121214] border border-zinc-800 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Record Membership Payment</h3>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRecordPayment} className="py-4 space-y-4 text-xs">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                  Select Member:
                </label>
                <select
                  value={selectedPayMember.id}
                  onChange={(e) => {
                    const found = members.find(m => m.id === e.target.value);
                    if (found) setSelectedPayMember(found);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.memberId} - {m.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                  Amount (₹):
                </label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                  Payment Method:
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                  <option value="Cash">Cash at Desk</option>
                  <option value="Card">Debit / Credit Card (POS Swipe)</option>
                  <option value="Bank Transfer">Bank NEFT/IMPS Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                  Transaction / Receipt Reference:
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI/2026/0915/99812 or POS/4491"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {paymentError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {paymentError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentError(null);
                  }}
                  disabled={isRecordingPayment}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecordingPayment}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold disabled:opacity-50"
                >
                  {isRecordingPayment ? 'Recording...' : 'Save Payment & Renew'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pre-register Member Modal */}
      {showPreRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-[#121214] border border-zinc-800 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">Pre-register Member</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Login access is linked automatically when this registered email signs in for the first time.</p>
              </div>
              <button onClick={() => setShowPreRegisterModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!regName.trim() || !regEmail.trim()) return;
              dataService.addMember({
                fullName: regName.trim(),
                email: regEmail.trim(),
                phone: regPhone.trim() || '+91 98000 00000',
                planName: regPlan,
                assignedTrainerName: 'Floor Coach',
                fitnessGoal: 'General Fitness',
                restrictions: 'None',
                status: 'ACTIVE'
              });
              setShowPreRegisterModal(false);
              setRegName('');
              setRegEmail('');
              setRegPhone('');
            }} className="py-4 space-y-3 text-xs">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sameer Verma"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                  Email Address (for Google Login) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sameer.verma@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+91 98000 00000"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1">
                  Membership Plan
                </label>
                <select
                  value={regPlan}
                  onChange={(e) => setRegPlan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Quarterly Transformation">Quarterly Transformation (₹8,999)</option>
                  <option value="Half-Yearly Elite">Half-Yearly Elite (₹14,999)</option>
                  <option value="Annual Infinity Club Pass">Annual Infinity Club Pass (₹24,999)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowPreRegisterModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase tracking-wider text-xs"
                >
                  Save Pre-registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Scanner */}
      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        staffName="Reception Desk"
      />
    </div>
  );
};
