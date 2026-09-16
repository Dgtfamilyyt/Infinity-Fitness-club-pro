import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  Dumbbell, 
  UserPlus, 
  Search, 
  Filter, 
  Check, 
  X, 
  AlertTriangle, 
  Edit3, 
  MoreVertical, 
  Lock, 
  Unlock, 
  Trash2, 
  Mail, 
  Phone, 
  Loader2,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { UserProfile, UserRole } from '../../types';
import { dataService } from '../../services/dataService';

interface StaffManagementTabProps {
  staff: UserProfile[];
  trainers: UserProfile[];
  members: UserProfile[];
  currentUser: UserProfile | null;
  onEditTrainer: (trainer: UserProfile) => void;
}

export const StaffManagementTab: React.FC<StaffManagementTabProps> = ({
  staff,
  trainers,
  members,
  currentUser,
  onEditTrainer
}) => {
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'owner' | 'admin' | 'trainer'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Add Staff Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<'trainer' | 'admin' | 'owner'>('trainer');
  const [formSpecialty, setFormSpecialty] = useState('');
  const [formExperience, setFormExperience] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Combine staff and trainers into single deduplicated roster
  const allStaffMap = new Map<string, UserProfile>();
  [...staff, ...trainers].forEach(s => {
    const key = (s.uid || s.id || s.email).toLowerCase();
    if (!allStaffMap.has(key)) {
      allStaffMap.set(key, s);
    }
  });
  const allStaff = Array.from(allStaffMap.values());

  const isOwner = currentUser?.role === 'owner';

  // Key metrics
  const ownersCount = allStaff.filter(s => s.role === 'owner').length;
  const adminsCount = allStaff.filter(s => s.role === 'admin').length;
  const trainersCount = allStaff.filter(s => s.role === 'trainer').length;

  const filteredStaff = allStaff.filter(s => {
    const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' 
      ? true 
      : statusFilter === 'ACTIVE' 
      ? s.isActive !== false 
      : s.isActive === false;

    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(q)) ||
      (s.fitnessGoal && s.fitnessGoal.toLowerCase().includes(q));

    return matchesRole && matchesStatus && matchesSearch;
  });

  const handleToggleStatus = async (staffMember: UserProfile) => {
    // Prevent self-deactivation by owner
    if (currentUser && (staffMember.id === currentUser.id || staffMember.email.toLowerCase() === currentUser.email.toLowerCase())) {
      alert('Security Protection: You cannot deactivate your own active owner account.');
      return;
    }

    const newStatus = staffMember.isActive === false ? true : false;
    const confirmMsg = newStatus
      ? `Activate staff account for ${staffMember.fullName}? They will regain operations clearance.`
      : `Suspend staff account for ${staffMember.fullName}? Their access to staff operations will be immediately revoked.`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(staffMember.id);
    try {
      await dataService.updateStaffStatus(
        staffMember.id, 
        newStatus, 
        currentUser?.fullName || 'Club Director'
      );
    } catch (err: any) {
      console.error('Failed to toggle staff status:', err);
      alert('Error updating status: ' + (err.message || 'Permission denied'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeRole = async (staffMember: UserProfile, newRole: UserRole) => {
    if (!isOwner) {
      alert('Permission Denied: Only Club Owners can modify staff roles.');
      return;
    }

    if (currentUser && (staffMember.id === currentUser.id || staffMember.email.toLowerCase() === currentUser.email.toLowerCase())) {
      alert('Security Protection: You cannot change your own owner role.');
      return;
    }

    if (!window.confirm(`Change role for ${staffMember.fullName} to ${newRole.toUpperCase()}?`)) {
      return;
    }

    setActionLoading(staffMember.id);
    try {
      await dataService.updateStaffRole(
        staffMember.id, 
        newRole, 
        currentUser?.fullName || 'Club Director'
      );
    } catch (err: any) {
      console.error('Failed to change role:', err);
      alert('Error updating role: ' + (err.message || 'Permission denied'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteStaff = async (staffMember: UserProfile) => {
    if (!isOwner) {
      alert('Permission Denied: Only Club Owners can remove staff accounts.');
      return;
    }

    if (currentUser && (staffMember.id === currentUser.id || staffMember.email.toLowerCase() === currentUser.email.toLowerCase())) {
      alert('Security Protection: You cannot remove your own active owner account.');
      return;
    }

    if (!window.confirm(`Permanently remove staff record for ${staffMember.fullName} (${staffMember.email})?`)) {
      return;
    }

    setActionLoading(staffMember.id);
    try {
      await dataService.deleteStaffMember(staffMember.id, currentUser?.fullName || 'Club Director');
    } catch (err: any) {
      console.error('Failed to delete staff member:', err);
      alert('Error removing staff: ' + (err.message || 'Permission denied'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Please enter full name and official email address.');
      return;
    }

    setCreating(true);
    try {
      await dataService.createStaffMember(
        {
          fullName: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          phone: formPhone.trim(),
          role: formRole,
          fitnessGoal: formSpecialty.trim() || undefined,
          experience: formExperience.trim() || undefined,
          trainerNotes: formNotes.trim() || undefined
        },
        currentUser?.fullName || 'Club Director'
      );

      setShowAddModal(false);
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormRole('trainer');
      setFormSpecialty('');
      setFormExperience('');
      setFormNotes('');
    } catch (err: any) {
      console.error('Failed to create staff member:', err);
      setFormError(err.message || 'Failed to create staff account. Verify permissions.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="rounded-2xl bg-[#121214] border border-zinc-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
              FIREBASE AUTHORIZATION & ROLES
            </span>
            <span className="text-xs text-zinc-500 font-mono">{allStaff.length} Staff Accounts</span>
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-wide mt-1">
            Staff & Role Management
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage floor coaches, receptionists, admins, and ownership credentials stored in Firestore.
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/10 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff Account</span>
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#121214] border border-zinc-800 shadow-md">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Total Staff</span>
          <div className="mt-1 text-2xl font-black text-white font-mono">{allStaff.length}</div>
          <div className="mt-1 text-[11px] text-zinc-400">Authorized Personnel</div>
        </div>

        <div className="p-4 rounded-xl bg-[#121214] border border-zinc-800 shadow-md">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Club Owners</span>
          <div className="mt-1 text-2xl font-black text-amber-400 font-mono">{ownersCount}</div>
          <div className="mt-1 text-[11px] text-amber-500/80">Full Executive Clearance</div>
        </div>

        <div className="p-4 rounded-xl bg-[#121214] border border-zinc-800 shadow-md">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Front Desk / Admins</span>
          <div className="mt-1 text-2xl font-black text-cyan-400 font-mono">{adminsCount}</div>
          <div className="mt-1 text-[11px] text-cyan-500/80">Reception & Check-In Lead</div>
        </div>

        <div className="p-4 rounded-xl bg-[#121214] border border-zinc-800 shadow-md">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Floor Coaches</span>
          <div className="mt-1 text-2xl font-black text-emerald-400 font-mono">{trainersCount}</div>
          <div className="mt-1 text-[11px] text-emerald-500/80">Strength & Conditioning</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto text-xs font-bold uppercase tracking-wider">
          {(['ALL', 'owner', 'admin', 'trainer'] as const).map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 ${
                roleFilter === role
                  ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              {role === 'ALL' ? 'All Roles' : role === 'owner' ? 'Owners' : role === 'admin' ? 'Admins' : 'Coaches'}
            </button>
          ))}

          <div className="h-4 w-px bg-zinc-800 shrink-0" />

          {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 ${
                statusFilter === status
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search staff by name, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((staffMember) => {
          const isCurrentUser = currentUser?.id === staffMember.id || 
            (currentUser?.email && staffMember.email && currentUser.email.toLowerCase() === staffMember.email.toLowerCase());
          const isActive = staffMember.isActive !== false;
          const assignedAthletes = members.filter(
            m => m.assignedTrainerId === staffMember.id || m.assignedTrainerName === staffMember.fullName
          ).length;

          const roleColor = staffMember.role === 'owner'
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            : staffMember.role === 'admin'
            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

          const roleIcon = staffMember.role === 'owner'
            ? <ShieldCheck className="w-3 h-3" />
            : staffMember.role === 'admin'
            ? <UserCheck className="w-3 h-3" />
            : <Dumbbell className="w-3 h-3" />;

          return (
            <div
              key={staffMember.id}
              className={`rounded-2xl bg-[#121214] border p-5 flex flex-col justify-between shadow-xl transition relative overflow-hidden ${
                !isActive
                  ? 'border-red-950 bg-red-950/10 opacity-75'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div>
                {/* Header Row: Avatar, Name, Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={staffMember.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}
                        alt={staffMember.fullName}
                        referrerPolicy="no-referrer"
                        className={`w-12 h-12 rounded-xl object-cover border ${
                          isActive ? 'border-zinc-700' : 'border-red-500/50 grayscale'
                        }`}
                      />
                      <span 
                        className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#121214] ${
                          isActive ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                        title={isActive ? 'Active Staff' : 'Suspended Staff'}
                      />
                    </div>

                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-black text-sm text-white truncate">{staffMember.fullName}</h4>
                        {isCurrentUser && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-mono font-bold border mt-1 ${roleColor}`}>
                        {roleIcon}
                        <span className="uppercase">{staffMember.role}</span>
                      </span>
                    </div>
                  </div>

                  {!isActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-500/30">
                      SUSPENDED
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="mt-4 space-y-1 text-xs">
                  <div className="flex items-center gap-2 text-zinc-300 font-mono text-[11px]">
                    <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{staffMember.email}</span>
                  </div>

                  {staffMember.phone && (
                    <div className="flex items-center gap-2 text-zinc-400 font-mono text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span>{staffMember.phone}</span>
                    </div>
                  )}

                  <div className="pt-2 text-xs text-zinc-400 leading-relaxed">
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">Specialty / Title</span>
                    <span className="text-zinc-300 font-medium">
                      {staffMember.fitnessGoal || (staffMember.role === 'owner' ? 'Club Managing Director' : 'Floor Operations')}
                    </span>
                  </div>

                  {staffMember.role === 'trainer' && (
                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">Athletes Assigned:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {assignedAthletes} Members
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Controls */}
              {isOwner && (
                <div className="mt-5 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    {staffMember.role === 'trainer' && (
                      <button
                        onClick={() => onEditTrainer(staffMember)}
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition"
                        title="Edit Coach Profile"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Role selector dropdown */}
                    {!isCurrentUser && (
                      <select
                        value={staffMember.role}
                        onChange={(e) => handleChangeRole(staffMember, e.target.value as UserRole)}
                        disabled={actionLoading === staffMember.id}
                        className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-emerald-500"
                        title="Change Role"
                      >
                        <option value="trainer">Trainer</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isCurrentUser && (
                      <>
                        <button
                          onClick={() => handleToggleStatus(staffMember)}
                          disabled={actionLoading === staffMember.id}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition flex items-center gap-1 ${
                            isActive
                              ? 'bg-red-950/30 border-red-500/40 text-red-400 hover:bg-red-900/40'
                              : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40'
                          }`}
                          title={isActive ? 'Suspend Access' : 'Activate Access'}
                        >
                          {actionLoading === staffMember.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isActive ? (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>Suspend</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3" />
                              <span>Activate</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteStaff(staffMember)}
                          disabled={actionLoading === staffMember.id}
                          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/50 border border-zinc-800 hover:border-red-500/40 text-zinc-500 hover:text-red-400 transition"
                          title="Remove Staff Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Staff Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-[#121214] border border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-white uppercase tracking-wide">Provision Staff Account</h4>
                  <p className="text-xs text-zinc-400">Authorized in Firestore profiles collection</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Singh"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                    Official Email * (Login ID)
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="vikram@infinityfitnessclub.in"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98450 12345"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                  Access Role *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'trainer', label: 'Trainer / Coach', desc: 'Workout programming' },
                    { id: 'admin', label: 'Reception Desk', desc: 'Check-ins & Billing' },
                    { id: 'owner', label: 'Club Owner', desc: 'Full Executive' }
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setFormRole(r.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        formRole === r.id
                          ? 'border-emerald-500 bg-emerald-950/20 text-white'
                          : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <span className="font-bold block text-xs">{r.label}</span>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                  Designation / Specialty
                </label>
                <input
                  type="text"
                  placeholder="e.g. Strength & Conditioning Coach / Front Desk Lead"
                  value={formSpecialty}
                  onChange={(e) => setFormSpecialty(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {formRole === 'trainer' && (
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                    Coaching Experience
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5+ Years (CSCS / ACE Certified)"
                    value={formExperience}
                    onChange={(e) => setFormExperience(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                  Internal Notes & Bio
                </label>
                <textarea
                  rows={2}
                  placeholder="Specializations, floor responsibilities, shift times..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Provision Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
