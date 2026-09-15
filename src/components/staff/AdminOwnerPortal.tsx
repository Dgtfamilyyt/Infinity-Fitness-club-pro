import React, { useState } from 'react';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  CreditCard, 
  ShieldCheck, 
  Settings, 
  Globe, 
  FileText, 
  Plus, 
  Search, 
  Edit3, 
  Check, 
  X, 
  RefreshCw, 
  AlertCircle,
  Dumbbell,
  Layers
} from 'lucide-react';
import { 
  UserProfile, 
  GymZone, 
  MembershipPlan, 
  ActiveGymSession, 
  PaymentRecord, 
  GymSettings, 
  AuditLog 
} from '../../types';
import { dataService } from '../../services/dataService';

interface AdminOwnerPortalProps {
  settings: GymSettings;
  zones: GymZone[];
  plans: MembershipPlan[];
  members: UserProfile[];
  trainers: UserProfile[];
  activeSessions: ActiveGymSession[];
  payments: PaymentRecord[];
  auditLogs: AuditLog[];
}

export const AdminOwnerPortal: React.FC<AdminOwnerPortalProps> = ({
  settings,
  zones,
  plans,
  members,
  trainers,
  activeSessions,
  payments,
  auditLogs
}) => {
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'MEMBERS' | 'PLANS' | 'ZONES' | 'CMS' | 'AUDIT'>('ANALYTICS');
  const [memberFilter, setMemberFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'FROZEN' | 'TRIAL'>('ALL');
  const [memberSearch, setMemberSearch] = useState('');

  // Add Member Modal State
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberPlan, setNewMemberPlan] = useState('Quarterly Transformation');
  const [newMemberTrainer, setNewMemberTrainer] = useState('Rahul Sharma');
  const [newMemberGoal, setNewMemberGoal] = useState('Hypertrophy & Strength');
  const [newMemberRestrictions, setNewMemberRestrictions] = useState('None');

  // CMS Edit State
  const [cmsForm, setCmsForm] = useState<GymSettings>({ ...settings });
  const [cmsSaved, setCmsSaved] = useState(false);

  // Selected Zone for Capacity Edit
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [newCapacity, setNewCapacity] = useState<number>(6);

  // Calculations for real analytics
  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === 'ACTIVE').length;
  const expiringSoon = members.filter(m => m.status === 'EXPIRING_SOON').length;
  const expiredMembers = members.filter(m => m.status === 'EXPIRED').length;
  const totalRevenue = payments.reduce((acc, curr) => acc + curr.amount, 0);

  const filteredMembers = members.filter(m => {
    const matchesFilter = memberFilter === 'ALL' || m.status === memberFilter;
    const matchesSearch = m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
                          (m.memberId && m.memberId.toLowerCase().includes(memberSearch.toLowerCase())) ||
                          m.email.toLowerCase().includes(memberSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    dataService.addMember({
      fullName: newMemberName.trim(),
      email: newMemberEmail.trim() || `member${Date.now()}@infinityfitnessclub.in`,
      phone: newMemberPhone.trim() || '+91 98000 00000',
      planName: newMemberPlan,
      assignedTrainerName: newMemberTrainer,
      fitnessGoal: newMemberGoal,
      restrictions: newMemberRestrictions.trim() || 'None',
      status: 'ACTIVE'
    });

    setShowAddMember(false);
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberPhone('');
  };

  const handleSaveCMS = (e: React.FormEvent) => {
    e.preventDefault();
    dataService.updateSettings(cmsForm);
    setCmsSaved(true);
    setTimeout(() => setCmsSaved(false), 2500);
  };

  const handleSaveZoneCapacity = (zoneId: string) => {
    dataService.updateZone(zoneId, { capacity: Number(newCapacity) });
    setEditingZoneId(null);
  };

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset demo data to initial seed state?')) {
      dataService.resetAllData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
              OWNER & ADMIN CONTROL CENTER
            </span>
            <span className="text-xs text-zinc-500 font-mono">Branch: {settings.slug}</span>
          </div>
          <h2 className="text-2xl font-black text-white uppercase mt-1">Management & Executive Analytics</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetData}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-red-500/50 text-zinc-400 hover:text-red-400 text-xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>

          <button
            onClick={() => setShowAddMember(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto text-xs font-bold uppercase tracking-wider">
        {[
          { id: 'ANALYTICS', label: 'Executive Analytics', icon: Activity },
          { id: 'MEMBERS', label: `Athletes (${members.length})`, icon: Users },
          { id: 'PLANS', label: 'Membership Plans', icon: CreditCard },
          { id: 'ZONES', label: 'Floor Zones & Capacities', icon: Layers },
          { id: 'CMS', label: 'Website CMS Editor', icon: Globe },
          { id: 'AUDIT', label: 'System Audit Logs', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition shrink-0 ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXECUTIVE ANALYTICS */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#121214] border border-zinc-800 shadow-xl">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Total Members</span>
              <div className="mt-2 text-3xl font-black text-white font-mono">{totalMembers}</div>
              <div className="mt-2 text-xs text-emerald-400 font-semibold">{activeMembers} Active Subscriptions</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#121214] border border-zinc-800 shadow-xl">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Total Recorded Revenue</span>
              <div className="mt-2 text-3xl font-black text-emerald-400 font-mono">
                {settings.currency} {totalRevenue.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-zinc-400">{payments.length} Transaction Records</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#121214] border border-zinc-800 shadow-xl">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Live Floor Occupancy</span>
              <div className="mt-2 text-3xl font-black text-white font-mono">{activeSessions.length}</div>
              <div className="mt-2 text-xs text-emerald-400">Across 6 Smart Zones</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#121214] border border-zinc-800 shadow-xl">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Renewals Pending</span>
              <div className="mt-2 text-3xl font-black text-amber-400 font-mono">{expiringSoon}</div>
              <div className="mt-2 text-xs text-zinc-400">{expiredMembers} Expired Subscriptions</div>
            </div>
          </div>

          {/* Zones Distribution & Revenue Streams */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Zone Capacity & Occupancy breakdown */}
            <div className="p-6 rounded-2xl bg-[#121214] border border-zinc-800 shadow-xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                Current Floor Zone Utilization
              </h3>
              <div className="space-y-3">
                {zones.map(z => {
                  const pct = Math.round((z.currentOccupancy / z.capacity) * 100);
                  return (
                    <div key={z.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-zinc-300">{z.name}</span>
                        <span className="font-mono text-zinc-400">{z.currentOccupancy} / {z.capacity} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Payments Ledger */}
            <div className="p-6 rounded-2xl bg-[#121214] border border-zinc-800 shadow-xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                Recent Membership Transactions
              </h3>
              <div className="space-y-2.5">
                {payments.slice(0, 5).map(pay => (
                  <div key={pay.id} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{pay.memberName}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">{pay.planName} • {pay.paymentMethod}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-400">
                        {settings.currency} {pay.amount.toLocaleString()}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">{pay.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEMBERS DIRECTORY */}
      {activeTab === 'MEMBERS' && (
        <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            {/* Filter pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(['ALL', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'FROZEN', 'TRIAL'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setMemberFilter(st)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] uppercase transition ${
                    memberFilter === st
                      ? 'bg-zinc-100 text-black'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search member, ID, email..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 rounded-l-lg">Athlete</th>
                  <th className="py-3 px-4">Member ID</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Assigned Coach</th>
                  <th className="py-3 px-4">Restrictions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 rounded-r-lg">Valid Until</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredMembers.map(m => (
                  <tr key={m.id} className="hover:bg-zinc-900/40 transition">
                    <td className="py-3 px-4 font-bold text-white">
                      <div>{m.fullName}</div>
                      <div className="text-[11px] text-zinc-400 font-normal">{m.phone}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">{m.memberId}</td>
                    <td className="py-3 px-4 text-zinc-300">{m.planName}</td>
                    <td className="py-3 px-4 text-zinc-300">{m.assignedTrainerName || 'None'}</td>
                    <td className="py-3 px-4 text-zinc-400 max-w-xs truncate">
                      {m.restrictions && m.restrictions !== 'None' ? (
                        <span className="text-amber-400 font-medium">{m.restrictions}</span>
                      ) : (
                        'None'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                        m.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : m.status === 'EXPIRING_SOON'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-400">{m.membershipExpiry}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MEMBERSHIP PLANS */}
      {activeTab === 'PLANS' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map(p => (
            <div key={p.id} className="p-6 rounded-2xl bg-[#121214] border border-zinc-800 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-white">{p.name}</span>
                  {p.highlight && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-black font-bold">Featured</span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-zinc-400 font-bold">{settings.currency}</span>
                  <span className="text-3xl font-black text-white font-mono">{p.price.toLocaleString()}</span>
                  <span className="text-xs text-zinc-500">/{p.durationMonths} mo</span>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-zinc-400 border-t border-zinc-800 pt-4">
                  {p.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800 text-xs text-zinc-500 flex justify-between">
                <span>Status: {p.isActive ? 'Active' : 'Archived'}</span>
                <span>Order: {p.displayOrder}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: GYM FLOOR ZONES & CAPACITIES */}
      {activeTab === 'ZONES' && (
        <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-xl space-y-4">
          <div className="pb-3 border-b border-zinc-800">
            <h3 className="text-base font-bold text-white uppercase tracking-wide">Configurable Floor Zones</h3>
            <p className="text-xs text-zinc-400">Admin can adjust zone capacity to prevent overcrowding</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map(z => (
              <div key={z.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">{z.name}</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    {z.status}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">{z.description}</p>

                <div className="p-3 rounded-lg bg-black/40 border border-zinc-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Current Slots</span>
                    <strong className="text-white font-mono text-sm">{z.currentOccupancy} / {z.capacity}</strong>
                  </div>

                  {editingZoneId === z.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={newCapacity}
                        onChange={(e) => setNewCapacity(Number(e.target.value))}
                        className="w-16 px-2 py-1 rounded bg-zinc-800 text-white text-xs border border-emerald-500 font-mono"
                      />
                      <button
                        onClick={() => handleSaveZoneCapacity(z.id)}
                        className="p-1 rounded bg-emerald-500 text-black hover:bg-emerald-400"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingZoneId(z.id);
                        setNewCapacity(z.capacity);
                      }}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit Cap</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: WEBSITE CMS EDITOR */}
      {activeTab === 'CMS' && (
        <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-xl space-y-4">
          <div className="pb-3 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wide">Website Content Management System</h3>
              <p className="text-xs text-zinc-400">Edits made here instantly reflect on the public Member Website</p>
            </div>
            {cmsSaved && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> Live Changes Saved
              </span>
            )}
          </div>

          <form onSubmit={handleSaveCMS} className="grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Club Name:
              </label>
              <input
                type="text"
                value={cmsForm.name}
                onChange={(e) => setCmsForm({ ...cmsForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Tagline:
              </label>
              <input
                type="text"
                value={cmsForm.tagline}
                onChange={(e) => setCmsForm({ ...cmsForm, tagline: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Supporting Concept / Subtitle:
              </label>
              <input
                type="text"
                value={cmsForm.supportingConcept}
                onChange={(e) => setCmsForm({ ...cmsForm, supportingConcept: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Announcement Banner:
              </label>
              <input
                type="text"
                value={cmsForm.announcement}
                onChange={(e) => setCmsForm({ ...cmsForm, announcement: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Contact Phone & WhatsApp:
              </label>
              <input
                type="text"
                value={cmsForm.phone}
                onChange={(e) => setCmsForm({ ...cmsForm, phone: e.target.value, whatsapp: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Official Email:
              </label>
              <input
                type="email"
                value={cmsForm.email}
                onChange={(e) => setCmsForm({ ...cmsForm, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Opening Hours:
              </label>
              <input
                type="text"
                value={cmsForm.openingHours}
                onChange={(e) => setCmsForm({ ...cmsForm, openingHours: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Club Address:
              </label>
              <input
                type="text"
                value={cmsForm.address}
                onChange={(e) => setCmsForm({ ...cmsForm, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/10"
              >
                Publish Live to Public Website
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {activeTab === 'AUDIT' && (
        <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-xl space-y-4">
          <div className="pb-3 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wide">Security & Activity Audit Trail</h3>
              <p className="text-xs text-zinc-400">Tamper-evident logs of check-ins, overrides, and management operations</p>
            </div>
            <span className="text-xs text-zinc-500 font-mono">{auditLogs.length} Events</span>
          </div>

          <div className="space-y-2">
            {auditLogs.map(log => (
              <div key={log.id} className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 font-mono font-bold text-[10px]">
                    {log.action}
                  </span>
                  <div>
                    <span className="font-bold text-white">{log.actor}:</span>{' '}
                    <span className="text-zinc-300">{log.details}</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-zinc-500 shrink-0">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-[#121214] border border-zinc-800 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-sm text-white">Enroll New Athlete</h3>
              <button onClick={() => setShowAddMember(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateMember} className="py-4 space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-zinc-400 uppercase font-semibold block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sameer Verma"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 uppercase font-semibold block mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98200 00000"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 uppercase font-semibold block mb-1">Membership Plan</label>
                <select
                  value={newMemberPlan}
                  onChange={(e) => setNewMemberPlan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.name}>{p.name} ({settings.currency}{p.price})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 uppercase font-semibold block mb-1">Assigned Coach</label>
                <select
                  value={newMemberTrainer}
                  onChange={(e) => setNewMemberTrainer(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
                >
                  {trainers.map(t => (
                    <option key={t.id} value={t.fullName}>{t.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 uppercase font-semibold block mb-1">Physical / Medical Restrictions</label>
                <input
                  type="text"
                  placeholder="e.g. Mild lumbar stiffness or None"
                  value={newMemberRestrictions}
                  onChange={(e) => setNewMemberRestrictions(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
                >
                  Create Profile & Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
