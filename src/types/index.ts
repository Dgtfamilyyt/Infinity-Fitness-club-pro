export type UserRole = 'member' | 'trainer' | 'admin' | 'owner';

export type MemberStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'FROZEN' | 'TRIAL';

export type ZoneStatus = 'AVAILABLE' | 'BUSY' | 'FULL';

export interface UserProfile {
  id: string;
  uid?: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string;
  memberId?: string; // e.g. IFC-1024
  qrToken?: string;  // Opaque secure token e.g. IFC_SEC_8f93...
  status?: MemberStatus;
  membershipPlanId?: string;
  planName?: string;
  membershipStart?: string;
  membershipExpiry?: string;
  assignedTrainerId?: string;
  assignedTrainerName?: string;
  fitnessGoal?: string;
  experience?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Athlete';
  workoutFrequency?: number; // days per week
  preferredTime?: string;
  emergencyContact?: string;
  height?: number; // cm
  weight?: number; // kg
  restrictions?: string;
  trainerNotes?: string;
  attendanceStreak?: number;
  workoutStreak?: number;
  createdAt?: string;
}

export interface GymZone {
  id: string;
  name: string;
  description: string;
  capacity: number;
  currentOccupancy: number;
  associatedMuscles: string[];
  equipment: string[];
  displayOrder: number;
  status: ZoneStatus;
}

export interface MembershipPlan {
  id: string;
  name: string;
  durationMonths: number;
  price: number;
  features: string[];
  discount?: string;
  isActive: boolean;
  highlight: boolean;
  displayOrder: number;
}

export interface ExerciseItem {
  id: string;
  name: string;
  targetMuscles: string[];
  sets: number;
  reps: string;
  restSeconds: number;
  equipment: string;
  instructions: string;
  completed?: boolean;
  notes?: string;
}

export interface WorkoutAssignment {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  title: string;
  targetMuscles: string[];
  zoneId: string;
  zoneName: string;
  trainerId?: string;
  trainerName?: string;
  timeSlot?: string;
  exercises: ExerciseItem[];
  completionPercentage: number;
  isCompleted: boolean;
  isOverride?: boolean;
  overrideReason?: string;
  assignedBy?: string;
  createdAt?: string;
}

export interface ActiveGymSession {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar?: string;
  memberStatus: MemberStatus;
  arrival: string; // ISO string or format
  workoutName: string;
  zoneId: string;
  zoneName: string;
  trainerName?: string;
  method: 'QR' | 'MEMBER_ID' | 'MANUAL';
  checkedInBy?: string;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  arrival: string;
  exit?: string;
  durationMinutes?: number;
  workoutName: string;
  zoneName: string;
  method: 'QR' | 'MEMBER_ID' | 'MANUAL';
  date: string;
}

export interface PaymentRecord {
  id: string;
  memberId: string;
  memberName: string;
  planName: string;
  amount: number;
  paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Other';
  reference: string;
  date: string;
  recordedBy: string;
  notes?: string;
}

export interface PersonalRecord {
  id: string;
  memberId: string;
  exercise: string;
  weightKg: number;
  reps: number;
  previousWeightKg?: number;
  improvementPercentage?: number;
  date: string;
  verifiedBy?: string;
}

export interface GymSettings {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  supportingConcept: string;
  phone: string;
  altPhone?: string;
  whatsapp: string;
  email: string;
  address: string;
  landmark?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  googleMapsUrl?: string;
  googleRating?: number;
  googleReviewCount?: number;
  openingHours: string;
  morningHours?: string;
  eveningHours?: string;
  sundayHours?: string;
  announcement: string;
  currency: string;
  timezone: string;
  facilities: string[];
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  targetEntity: string;
  targetId: string;
  timestamp: string;
  details?: string;
}
