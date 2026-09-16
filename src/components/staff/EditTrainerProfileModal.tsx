import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Camera, 
  Check, 
  User, 
  Phone, 
  Award, 
  Sparkles, 
  FileText,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { UserProfile } from '../../types';

interface EditTrainerProfileModalProps {
  trainer: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTrainer: UserProfile) => Promise<void> | void;
}

// Curated high-performance fitness coach avatar presets
const PRESET_AVATARS = [
  {
    label: 'Hypertrophy & Physique (Gym Selfie)',
    url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'High-Intensity Strength Coach',
    url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Athletic Conditioning Specialist',
    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80'
  },
  {
    label: 'Functional Mobility Specialist',
    url: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=600&auto=format&fit=crop&q=80'
  }
];

export const EditTrainerProfileModal: React.FC<EditTrainerProfileModalProps> = ({
  trainer,
  isOpen,
  onClose,
  onSave
}) => {
  const [fullName, setFullName] = useState(trainer.fullName || '');
  const [phone, setPhone] = useState(trainer.phone || '');
  const [fitnessGoal, setFitnessGoal] = useState(trainer.fitnessGoal || 'Head Strength & Conditioning Coach');
  const [experience, setExperience] = useState(trainer.experience || 'Master Coach (8+ Yrs)');
  const [trainerNotes, setTrainerNotes] = useState(
    trainer.trainerNotes || 'Specializes in hypertrophy, biomechanics, functional strength periodization, and injury prevention.'
  );
  const [avatarUrl, setAvatarUrl] = useState(
    trainer.avatarUrl || 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80'
  );

  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Process and optimize uploaded image to a clean web data URL
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      // Downscale to 600x600 maximum to ensure optimal performance and lightweight storage
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setAvatarUrl(compressedDataUrl);
          setPhotoSuccessMsg('Photo uploaded and optimized successfully!');
          setTimeout(() => setPhotoSuccessMsg(null), 3500);
        } else {
          setAvatarUrl(result);
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updated: UserProfile = {
        ...trainer,
        fullName: fullName.trim() || trainer.fullName,
        phone: phone.trim(),
        fitnessGoal: fitnessGoal.trim(),
        experience: experience.trim(),
        trainerNotes: trainerNotes.trim(),
        avatarUrl: avatarUrl.trim()
      };

      await onSave(updated);
      onClose();
    } catch (err: any) {
      console.error('Failed to update trainer profile:', err);
      alert('Failed to save trainer profile: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-[#121214] border border-zinc-800 text-white shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white uppercase tracking-wide">
                Edit Trainer Profile
              </h3>
              <p className="text-xs text-zinc-400">
                Update coaching photo, clinical credentials, and floor profile
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 text-xs">
          
          {/* Section 1: Profile Photo & Uploader */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase font-extrabold tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                Coaching Avatar & Photo
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">PNG, JPG, WEBP or URL</span>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 items-center">
              {/* Photo Preview */}
              <div className="sm:col-span-1 flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-center">
                <div className="relative group">
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    referrerPolicy="no-referrer"
                    className="w-28 h-28 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-xl"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 text-[11px] font-bold text-white transition cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Upload</span>
                  </button>
                </div>
                <span className="text-[10px] text-zinc-400 font-medium mt-2">Active Floor Photo</span>
              </div>

              {/* Upload Dropzone */}
              <div className="sm:col-span-2">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-4 rounded-2xl border-2 border-dashed transition cursor-pointer text-center flex flex-col items-center justify-center gap-2 ${
                    dragActive
                      ? 'border-emerald-400 bg-emerald-950/20'
                      : 'border-zinc-700 bg-zinc-900/50 hover:border-emerald-500/50 hover:bg-zinc-900'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-emerald-400">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block">
                      Click to upload trainer screenshot / photo
                    </span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5">
                      or drag and drop your gym photo file here
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                    Auto-optimized to square avatar
                  </span>
                </div>

                {photoSuccessMsg && (
                  <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                    <Check className="w-3.5 h-3.5" />
                    <span>{photoSuccessMsg}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Image URL fallback */}
            <div>
              <label className="text-[11px] text-zinc-400 font-semibold block mb-1">
                Or Paste Image Direct Web URL:
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Preset Avatars */}
            <div>
              <label className="text-[11px] text-zinc-400 font-semibold block mb-1.5">
                Quick Preset Athletic Avatars:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_AVATARS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvatarUrl(preset.url);
                      setPhotoSuccessMsg(`Selected: ${preset.label}`);
                      setTimeout(() => setPhotoSuccessMsg(null), 3000);
                    }}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition ${
                      avatarUrl === preset.url
                        ? 'border-emerald-500 bg-emerald-950/30'
                        : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-lg object-cover shrink-0"
                    />
                    <span className="text-[10px] text-zinc-300 font-medium truncate">
                      {preset.label.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4 space-y-4">
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Credentials & Floor Information
            </span>

            {/* Form Fields Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-zinc-400 uppercase font-semibold block mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Coach Full Name"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 uppercase font-semibold block mb-1">
                  Contact Phone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98112 00111"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 uppercase font-semibold block mb-1">
                  Specialization / Designation *
                </label>
                <div className="relative">
                  <Award className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={fitnessGoal}
                    onChange={(e) => setFitnessGoal(e.target.value)}
                    placeholder="e.g. Head Strength & Physique Coach"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 uppercase font-semibold block mb-1">
                  Coaching Experience Level
                </label>
                <div className="relative">
                  <Sparkles className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g. Master Coach (8+ Yrs)"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] text-zinc-400 uppercase font-semibold block mb-1">
                  Coaching Bio & Floor Philosophy
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <textarea
                    rows={3}
                    value={trainerNotes}
                    onChange={(e) => setTrainerNotes(e.target.value)}
                    placeholder="Specializes in hypertrophy, biomechanics, functional strength periodization, and injury prevention."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500 leading-relaxed"
                  />
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Displayed publicly on the floor coaches section and in assigned athletes' training logs.
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-emerald-500/10 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Trainer Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
