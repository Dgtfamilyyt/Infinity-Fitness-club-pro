export type UserRole = 'member' | 'trainer' | 'admin' | 'owner';

export type MemberStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'FROZEN' | 'TRIAL';

export type ZoneStatus = 'AVAILABLE' | 'BUSY' | 'FULL';

export interface UserProfile {
  id: string;
  uid?: string;
  authUid?: string | null;
  authLinked?: boolean;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  gymId?: string;
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
  experience?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Athlete' | string;
  workoutFrequency?: number; // days per week
  preferredTime?: string;
  emergencyContact?: string;
  height?: number; // cm
  weight?: number; // kg
  restrictions?: string;
  trainerNotes?: string;
  attendanceStreak?: number;
  workoutStreak?: number;
  preRegistrationDocId?: string;
  createdAt?: string;
}

export interface PreRegistrationLink {
  emailHash: string;
  emailNormalized: string;
  profileDocId: string;
  gymId: string;
  role: UserRole;
  authUid?: string | null;
  authLinked: boolean;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
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
  memberUid?: string;
  gymId?: string;
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
  memberUid?: string;
  memberName: string;
  memberAvatar?: string;
  memberStatus: MemberStatus;
  planName?: string;
  arrival: string; // Time or ISO format e.g. "06:45 PM"
  arrivedAtMs?: number;
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
  memberUid?: string;
  memberName: string;
  arrival: string;
  arrivedAtMs?: number;
  exit?: string;
  exitedAtMs?: number;
  durationMinutes?: number;
  workoutName: string;
  zoneName: string;
  method: 'QR' | 'MEMBER_ID' | 'MANUAL';
  date: string;
  checkedInBy?: string;
  checkedOutBy?: string;
}

export interface QrTokenRecord {
  memberUid: string;
  memberId: string;
  gymId: string;
  active: boolean;
  createdAt: string;
  revokedAt?: string | null;
  version: string; // 'IFC1'
}

export type CheckInStatus = 
  | 'SUCCESS' 
  | 'ALREADY_CHECKED_IN' 
  | 'MEMBERSHIP_EXPIRED' 
  | 'MEMBERSHIP_FROZEN' 
  | 'CHECK_IN_REFUSED' 
  | 'TRAINER_REVIEW_REQUIRED' 
  | 'ZONE_CAPACITY_REASSIGNED';

export interface CheckInResult {
  success: boolean;
  status: CheckInStatus;
  message: string;
  session?: ActiveGymSession;
  member?: UserProfile;
  recommendation?: any;
  alternativeAssigned?: boolean;
  restrictionsFlagged?: string[];
}

export interface CheckOutResult {
  success: boolean;
  message: string;
  session?: ActiveGymSession;
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
