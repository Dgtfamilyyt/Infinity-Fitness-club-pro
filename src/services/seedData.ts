import { 
  UserProfile, 
  PublicTrainer,
  GymZone, 
  MembershipPlan, 
  WorkoutAssignment, 
  ActiveGymSession, 
  AttendanceRecord, 
  PaymentRecord, 
  PersonalRecord,
  GymSettings 
} from '../types';

export const INITIAL_GYM_SETTINGS: GymSettings = {
  id: 'gym-infinity-neelambur',
  name: 'INFINITY FITNESS CLUB',
  slug: 'infinity-neelambur',
  tagline: 'NO LIMITS. JUST PROGRESS.',
  supportingConcept: 'Elite Strength, Conditioning & Crowd-Balanced Training in Neelambur, Coimbatore.',
  phone: '+91 81898 51615',
  altPhone: '+91 70255 56533',
  whatsapp: '+91 81898 51615',
  email: 'contact@infinityfitnessclub.in',
  address: 'No. 1/215, Upstairs Union Bank of India, Avinashi Road, Neelambur, Coimbatore, Tamil Nadu 641062',
  landmark: 'Upstairs Union Bank of India, Avinashi Road',
  area: 'Neelambur',
  city: 'Coimbatore',
  state: 'Tamil Nadu',
  pincode: '641062',
  coordinates: {
    lat: 11.0614441,
    lng: 77.0873855
  },
  googleMapsUrl: 'https://maps.app.goo.gl/Xyt9iQEcfS67D6K5A',
  googleRating: 4.9,
  googleReviewCount: 18,
  openingHours: 'Mon - Sat: 5:30 AM – 10:00 AM & 5:00 PM – 9:30 PM | Sun: 6:00 AM – 10:00 AM',
  morningHours: '5:30 AM – 10:00 AM',
  eveningHours: '5:00 PM – 9:30 PM',
  sundayHours: '6:00 AM – 10:00 AM (Recovery / Open Floor)',
  announcement: '🔥 Welcome to Infinity Fitness Club Neelambur! State-of-the-art strength floor & smart crowd-balanced training.',
  currency: '₹',
  timezone: 'Asia/Kolkata',
  facilities: [
    'Biomechanical Strength Equipment',
    'Smart Crowd-Balanced Zones',
    'Dedicated Olympic Lifting Platforms',
    'High-Performance Conditioning & Cardio Bay',
    'Air-Purified Climate Controlled Training Floor',
    'Certified Personal Trainers & Physiotherapy Guidance',
    'Luxury Showers & Keyless Digital Lockers',
    'Complimentary Electrolyte & Hydration Bar'
  ]
};

export const INITIAL_ZONES: GymZone[] = [
  {
    id: 'zone-chest',
    name: 'Chest Zone',
    description: 'Flat, incline, decline barbell benches, dumbbell racks & pec fly stations',
    capacity: 6,
    currentOccupancy: 3,
    associatedMuscles: ['Chest', 'Triceps', 'Front Delts'],
    equipment: ['Olympic Bench Press', 'Incline Dumbbell Bench', 'Cable Crossover', 'Pec Deck'],
    displayOrder: 1,
    status: 'AVAILABLE'
  },
  {
    id: 'zone-back',
    name: 'Back & Pull Zone',
    description: 'Deadlift platforms, lat pulldowns, seated cable rows & T-bar stations',
    capacity: 6,
    currentOccupancy: 5,
    associatedMuscles: ['Lats', 'Rhomboids', 'Traps', 'Biceps'],
    equipment: ['Deadlift Platform', 'Dual Lat Pulldown', 'Seated Cable Row', 'Chest-Supported Row'],
    displayOrder: 2,
    status: 'BUSY'
  },
  {
    id: 'zone-legs',
    name: 'Legs & Quads Bay',
    description: 'Power cages, leg press, hack squat, hamstring curls & calf raises',
    capacity: 6,
    currentOccupancy: 2,
    associatedMuscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
    equipment: ['Squat Rack', '45-Degree Leg Press', 'Linear Hack Squat', 'Prone Leg Curl'],
    displayOrder: 3,
    status: 'AVAILABLE'
  },
  {
    id: 'zone-shoulders',
    name: 'Shoulders & Delts',
    description: 'Overhead press stations, lateral raise machines & dumbbell bays',
    capacity: 5,
    currentOccupancy: 1,
    associatedMuscles: ['Shoulders', 'Rotator Cuff', 'Upper Traps'],
    equipment: ['Military Press Stand', 'Lateral Raise Machine', 'Adjustable Dumbbell Bench'],
    displayOrder: 4,
    status: 'AVAILABLE'
  },
  {
    id: 'zone-arms',
    name: 'Arms & Isolation',
    description: 'Preacher curl benches, dual cable towers, dip stations & skull crusher bays',
    capacity: 5,
    currentOccupancy: 4,
    associatedMuscles: ['Biceps', 'Triceps', 'Forearms'],
    equipment: ['Preacher Curl Station', 'Dual Cable Stack', 'Dip Bars', 'EZ-Bar Station'],
    displayOrder: 5,
    status: 'BUSY'
  },
  {
    id: 'zone-cardio',
    name: 'Cardio & HIIT Track',
    description: 'Curved woodway treadmills, assault bikes, concept2 rowers & stairmasters',
    capacity: 10,
    currentOccupancy: 4,
    associatedMuscles: ['Cardiovascular', 'Full Body Conditioning'],
    equipment: ['Woodway Curve', 'Concept2 Rower', 'Assault AirBike', 'Matrix StairMaster'],
    displayOrder: 6,
    status: 'AVAILABLE'
  }
];

export const INITIAL_PLANS: MembershipPlan[] = [
  {
    id: 'plan-monthly',
    name: 'Monthly Pro',
    durationMonths: 1,
    price: 3499,
    features: [
      'Full Gym Floor & Zone Access',
      'Smart Crowd-Aware Workout Program',
      'Locker & Shower Access',
      'Attendance & PR Tracking'
    ],
    isActive: true,
    highlight: false,
    displayOrder: 1
  },
  {
    id: 'plan-quarterly',
    name: 'Quarterly Transformation',
    durationMonths: 3,
    price: 8999,
    discount: 'Save 15%',
    features: [
      'Everything in Monthly',
      '1x Weekly Certified Trainer Check-In',
      'Body Composition & Progress Review',
      'Priority Workout Slot Reservation'
    ],
    isActive: true,
    highlight: false,
    displayOrder: 2
  },
  {
    id: 'plan-half-yearly',
    name: 'Half-Yearly Elite',
    durationMonths: 6,
    price: 15999,
    discount: 'Most Popular',
    features: [
      'Everything in Quarterly',
      'Dedicated Assigned Trainer',
      'Personalized Injury/Mobility Protocol',
      'Guest Passes (2 per month)',
      'Complimentary Post-Workout Shakes (12x)'
    ],
    isActive: true,
    highlight: true,
    displayOrder: 3
  },
  {
    id: 'plan-annual',
    name: 'Annual Infinity VIP',
    durationMonths: 12,
    price: 27999,
    discount: 'Best Value (Save 35%)',
    features: [
      'All-Inclusive Unlimited VIP Access',
      'Dedicated Head Trainer Oversight',
      'Custom Biomechanical Assessments',
      'Unlimited Guest Passes',
      'Freeze Membership up to 45 Days',
      'Official Infinity Performance Kit'
    ],
    isActive: true,
    highlight: false,
    displayOrder: 4
  }
];

export const INITIAL_TRAINERS: UserProfile[] = [
  {
    id: 'trainer-rahul',
    email: 'rahul.sharma@infinityfitnessclub.in',
    fullName: 'Rahul Sharma',
    phone: '+91 98112 00111',
    role: 'trainer',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80',
    experience: 'Master Coach & Physique Athlete',
    fitnessGoal: 'Head Strength & Physique Coach',
    trainerNotes: 'Specializes in hypertrophy, biomechanics, functional strength periodization, and injury prevention.'
  },
  {
    id: 'trainer-priya',
    email: 'priya.verma@infinityfitnessclub.in',
    fullName: 'Priya Verma',
    phone: '+91 98112 00222',
    role: 'trainer',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=150&auto=format&fit=crop&q=80',
    experience: 'Athlete',
    fitnessGoal: 'Functional Mobility & Fat Loss Specialist',
    trainerNotes: 'Expert in corrective exercise, postural rehabilitation, and high-intensity conditioning.'
  },
  {
    id: 'trainer-vikram',
    email: 'vikram.singh@infinityfitnessclub.in',
    fullName: 'Vikram Singh',
    phone: '+91 98112 00333',
    role: 'trainer',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    experience: 'Athlete',
    fitnessGoal: 'Powerlifting & Athletic Performance Coach',
    trainerNotes: 'National powerlifter, focus on deadlift/squat technique and CNS recovery.'
  }
];

export const INITIAL_PUBLIC_TRAINERS: PublicTrainer[] = [
  {
    id: 'trainer-rahul',
    displayName: 'Rahul Sharma',
    avatarUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80',
    specialty: 'Head Strength & Physique Coach',
    experience: 'Master Coach & Physique Athlete',
    bio: 'Specializes in hypertrophy, biomechanics, functional strength periodization, and injury prevention.',
    displayOrder: 1,
    isPublic: true,
    gymId: 'infinity-neelambur'
  },
  {
    id: 'trainer-priya',
    displayName: 'Priya Verma',
    avatarUrl: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=600&auto=format&fit=crop&q=80',
    specialty: 'Functional Mobility & Fat Loss Specialist',
    experience: 'Certified Mobility & Conditioning Coach',
    bio: 'Expert in corrective exercise, postural rehabilitation, and high-intensity athletic conditioning.',
    displayOrder: 2,
    isPublic: true,
    gymId: 'infinity-neelambur'
  },
  {
    id: 'trainer-vikram',
    displayName: 'Vikram Singh',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    specialty: 'Powerlifting & Athletic Performance Coach',
    experience: 'National Powerlifter & Strength Specialist',
    bio: 'Focuses on powerlifting discipline, maximal biomechanical efficiency, and nervous system recovery.',
    displayOrder: 3,
    isPublic: true,
    gymId: 'infinity-neelambur'
  }
];

export const INITIAL_STAFF: UserProfile[] = [
  {
    id: 'admin-reception',
    email: 'reception@infinityfitnessclub.in',
    fullName: 'Sunita Rao',
    phone: '+91 98112 00444',
    role: 'admin',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    fitnessGoal: 'Front Desk Lead & Member Experience Coordinator'
  },
  {
    id: 'owner-dgtfamily',
    email: 'dgtfamilyyt8@gmail.com',
    fullName: 'Karan Singhania (Club Owner)',
    phone: '+91 98112 00555',
    role: 'owner',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    fitnessGoal: 'Club Founder & Managing Director'
  }
];

export const INITIAL_MEMBERS: UserProfile[] = [
  {
    id: 'member-arun',
    email: 'arun.patel@gmail.com',
    fullName: 'Arun Patel',
    phone: '+91 98201 11223',
    role: 'member',
    isActive: true,
    memberId: 'IFC-1001',
    qrToken: 'IFC1.7a3f89e2c41b6d05e82a93f147c2b5d6e8a0f91234b5c6d7e8f9a0b1c2d3e4f5',
    status: 'ACTIVE',
    membershipPlanId: 'plan-half-yearly',
    planName: 'Half-Yearly Elite',
    membershipStart: '2026-06-01',
    membershipExpiry: '2026-12-01',
    assignedTrainerId: 'trainer-rahul',
    assignedTrainerName: 'Rahul Sharma',
    fitnessGoal: 'Hypertrophy & Muscle Gain',
    experience: 'Intermediate',
    workoutFrequency: 5,
    preferredTime: '6:00 PM',
    emergencyContact: '+91 98201 99999',
    height: 178,
    weight: 76.5,
    restrictions: 'Mild right shoulder impingement on heavy overhead press',
    trainerNotes: 'Monitor overhead pressing angle; emphasize incline neutral grip dumbbells.',
    attendanceStreak: 14,
    workoutStreak: 6
  },
  {
    id: 'member-neha',
    email: 'neha.kapoor@gmail.com',
    fullName: 'Neha Kapoor',
    phone: '+91 98202 22334',
    role: 'member',
    isActive: true,
    memberId: 'IFC-1002',
    qrToken: 'IFC1.8b4e90f3d52c7e16f93b04a258d3c6e7f9b1a02345c6d7e8f9a0b1c2d3e4f5a6',
    status: 'ACTIVE',
    membershipPlanId: 'plan-annual',
    planName: 'Annual Infinity VIP',
    membershipStart: '2026-01-15',
    membershipExpiry: '2027-01-15',
    assignedTrainerId: 'trainer-priya',
    assignedTrainerName: 'Priya Verma',
    fitnessGoal: 'Functional Tone & Stamina',
    experience: 'Advanced',
    workoutFrequency: 4,
    preferredTime: '7:30 AM',
    restrictions: 'None',
    trainerNotes: 'Consistent athlete, responding well to supersets.',
    attendanceStreak: 21,
    workoutStreak: 12
  },
  {
    id: 'member-rohit',
    email: 'rohit.sharma88@gmail.com',
    fullName: 'Rohit Deshmukh',
    phone: '+91 98203 33445',
    role: 'member',
    isActive: true,
    memberId: 'IFC-1003',
    qrToken: 'IFC1.9c5f01a4e63d8f27a04c15b369e4d7f8a0c2b13456d7e8f9a0b1c2d3e4f5a6b7',
    status: 'ACTIVE',
    membershipPlanId: 'plan-quarterly',
    planName: 'Quarterly Transformation',
    membershipStart: '2026-07-10',
    membershipExpiry: '2026-10-10',
    assignedTrainerId: 'trainer-vikram',
    assignedTrainerName: 'Vikram Singh',
    fitnessGoal: 'Strength & Powerlifting',
    experience: 'Intermediate',
    workoutFrequency: 4,
    preferredTime: '6:30 PM',
    restrictions: 'Lower back stiffness after long sitting hours',
    trainerNotes: 'Prioritize glute/hamstring activation before deadlifts.',
    attendanceStreak: 8,
    workoutStreak: 4
  },
  {
    id: 'member-anjali',
    email: 'anjali.nair@gmail.com',
    fullName: 'Anjali Nair',
    phone: '+91 98204 44556',
    role: 'member',
    isActive: true,
    memberId: 'IFC-1004',
    qrToken: 'IFC1.0d6a12b5f74e9a38b15d26c470f5e8a9b1d3c24567e8f9a0b1c2d3e4f5a6b7c8',
    status: 'EXPIRING_SOON',
    membershipPlanId: 'plan-monthly',
    planName: 'Monthly Pro',
    membershipStart: '2026-08-18',
    membershipExpiry: '2026-09-18',
    assignedTrainerId: 'trainer-priya',
    assignedTrainerName: 'Priya Verma',
    fitnessGoal: 'Weight Loss & Cardiovascular Health',
    experience: 'Beginner',
    workoutFrequency: 3,
    preferredTime: '8:00 AM',
    attendanceStreak: 5,
    workoutStreak: 3
  },
  {
    id: 'member-kabir',
    email: 'kabir.mehta@gmail.com',
    fullName: 'Kabir Mehta',
    phone: '+91 98205 55667',
    role: 'member',
    isActive: true,
    memberId: 'IFC-1005',
    qrToken: 'IFC1.1e7b23c6a85f0b49c26e37d581a6f9bac2e4d35678f9a0b1c2d3e4f5a6b7c8d9',
    status: 'ACTIVE',
    membershipPlanId: 'plan-annual',
    planName: 'Annual Infinity VIP',
    membershipStart: '2026-03-01',
    membershipExpiry: '2027-03-01',
    assignedTrainerId: 'trainer-rahul',
    assignedTrainerName: 'Rahul Sharma',
    fitnessGoal: 'Bodybuilding & Aesthetics',
    experience: 'Advanced',
    workoutFrequency: 6,
    preferredTime: '5:30 PM',
    attendanceStreak: 34,
    workoutStreak: 18
  },
  {
    id: 'member-riya',
    email: 'riya.sen@gmail.com',
    fullName: 'Riya Sen',
    phone: '+91 98206 66778',
    role: 'member',
    isActive: true,
    memberId: 'IFC-1006',
    qrToken: 'IFC1.2f8c34d7b96a1c50d37f48e692b70acbd3f5e46789a0b1c2d3e4f5a6b7c8d9e0',
    status: 'ACTIVE',
    membershipPlanId: 'plan-quarterly',
    planName: 'Quarterly Transformation',
    membershipStart: '2026-08-01',
    membershipExpiry: '2026-11-01',
    assignedTrainerId: 'trainer-priya',
    assignedTrainerName: 'Priya Verma',
    fitnessGoal: 'Core Strength & Posture',
    experience: 'Intermediate',
    workoutFrequency: 3,
    preferredTime: '6:00 PM',
    attendanceStreak: 9,
    workoutStreak: 5
  },
  {
    id: 'member-aditya',
    email: 'aditya.joshi@gmail.com',
    fullName: 'Aditya Joshi',
    phone: '+91 98207 77889',
    role: 'member',
    isActive: true,
    memberId: 'IFC-1007',
    qrToken: 'IFC1.3a9d45e8ca7b2d61e48059f703c81bdce406f57890b1c2d3e4f5a6b7c8d9e0f1',
    status: 'TRIAL',
    membershipPlanId: 'plan-monthly',
    planName: 'Trial Experience',
    membershipStart: '2026-09-12',
    membershipExpiry: '2026-09-19',
    assignedTrainerId: 'trainer-rahul',
    assignedTrainerName: 'Rahul Sharma',
    fitnessGoal: 'General Fitness',
    experience: 'Beginner',
    workoutFrequency: 3,
    preferredTime: '7:00 PM',
    attendanceStreak: 2,
    workoutStreak: 2
  },
  {
    id: 'member-siddharth',
    email: 'siddharth.m@gmail.com',
    fullName: 'Siddharth Malhotra',
    phone: '+91 98208 88990',
    role: 'member',
    isActive: false,
    memberId: 'IFC-1008',
    qrToken: 'IFC1.4b0e56f9db8c3e72f5916a0814d92cedf517068901c2d3e4f5a6b7c8d9e0f1a2',
    status: 'EXPIRED',
    membershipPlanId: 'plan-monthly',
    planName: 'Monthly Pro',
    membershipStart: '2026-08-01',
    membershipExpiry: '2026-09-01',
    assignedTrainerId: 'trainer-vikram',
    assignedTrainerName: 'Vikram Singh',
    fitnessGoal: 'Muscle Mass',
    experience: 'Intermediate',
    workoutFrequency: 4,
    attendanceStreak: 0,
    workoutStreak: 0
  },
  {
    id: 'member-tanvi',
    email: 'tanvi.b@gmail.com',
    fullName: 'Tanvi Bhatia',
    phone: '+91 98209 99001',
    role: 'member',
    isActive: true,
    memberId: 'IFC-1009',
    qrToken: 'IFC1.5c1f670aec9d4f8306a27b1925ea3df00628179012d3e4f5a6b7c8d9e0f1a2b3',
    status: 'FROZEN',
    membershipPlanId: 'plan-annual',
    planName: 'Annual Infinity VIP',
    membershipStart: '2026-02-10',
    membershipExpiry: '2027-02-10',
    assignedTrainerId: 'trainer-priya',
    assignedTrainerName: 'Priya Verma',
    fitnessGoal: 'Mobility & Recovery',
    experience: 'Intermediate',
    restrictions: 'Medical leave - travel for 3 weeks',
    attendanceStreak: 12,
    workoutStreak: 0
  },
  {
    id: 'member-dev',
    email: 'dev.kumar@gmail.com',
    fullName: 'Devendra Kumar',
    phone: '+91 98210 10102',
    role: 'member',
    isActive: true,
    memberId: 'IFC-1010',
    qrToken: 'IFC1.6d20781bfd0e509417b38c2a36fb4e011739280123e4f5a6b7c8d9e0f1a2b3c4',
    status: 'ACTIVE',
    membershipPlanId: 'plan-half-yearly',
    planName: 'Half-Yearly Elite',
    membershipStart: '2026-05-15',
    membershipExpiry: '2026-11-15',
    assignedTrainerId: 'trainer-vikram',
    assignedTrainerName: 'Vikram Singh',
    fitnessGoal: 'Squat & Bench PRs',
    experience: 'Advanced',
    workoutFrequency: 5,
    preferredTime: '6:00 PM',
    attendanceStreak: 19,
    workoutStreak: 8
  },
  // Additional members to reach 25 diverse members
  ...Array.from({ length: 15 }, (_, i) => {
    const num = 1011 + i;
    const names = [
      'Gaurav Shah', 'Meera Rao', 'Sameer Saxena', 'Kavita Chawla', 'Varun Dhawan',
      'Pooja Hegde', 'Manish Reddy', 'Swati Mishra', 'Kunal Roy', 'Divya Khurana',
      'Nikhil Basu', 'Shreya Ghoshal', 'Alok Pandey', 'Isha Singhania', 'Chetan Bhagat'
    ];
    const statuses: ('ACTIVE' | 'ACTIVE' | 'ACTIVE' | 'EXPIRING_SOON' | 'ACTIVE')[] = [
      'ACTIVE', 'ACTIVE', 'ACTIVE', 'EXPIRING_SOON', 'ACTIVE'
    ];
    const plans = ['Monthly Pro', 'Quarterly Transformation', 'Half-Yearly Elite', 'Annual Infinity VIP'];
    const trainers = ['Rahul Sharma', 'Priya Verma', 'Vikram Singh'];
    return {
      id: `member-${num}`,
      email: `member.${num}@infinityfitnessclub.in`,
      fullName: names[i % names.length],
      phone: `+91 98${num} 00000`,
      role: 'member' as const,
      isActive: true,
      memberId: `IFC-${num}`,
      qrToken: `IFC_TOKEN_SEC_${num}_XYZ`,
      status: statuses[i % statuses.length],
      membershipPlanId: 'plan-quarterly',
      planName: plans[i % plans.length],
      membershipStart: '2026-07-01',
      membershipExpiry: '2026-10-01',
      assignedTrainerId: i % 3 === 0 ? 'trainer-rahul' : i % 3 === 1 ? 'trainer-priya' : 'trainer-vikram',
      assignedTrainerName: trainers[i % trainers.length],
      fitnessGoal: i % 2 === 0 ? 'Hypertrophy & Strength' : 'Fat Loss & Conditioning',
      experience: (i % 3 === 0 ? 'Beginner' : i % 3 === 1 ? 'Intermediate' : 'Advanced') as any,
      workoutFrequency: 4,
      preferredTime: '6:00 PM',
      attendanceStreak: Math.floor(Math.random() * 20) + 1,
      workoutStreak: Math.floor(Math.random() * 8) + 1
    };
  })
];

export const INITIAL_ACTIVE_SESSIONS: ActiveGymSession[] = [
  {
    id: 'session-1',
    memberId: 'member-arun',
    memberName: 'Arun Patel',
    memberStatus: 'ACTIVE',
    arrival: '6:10 PM',
    workoutName: 'Chest & Triceps Hypertrophy',
    zoneId: 'zone-chest',
    zoneName: 'Chest Zone',
    trainerName: 'Rahul Sharma',
    method: 'QR',
    checkedInBy: 'Front Desk QR Reader'
  },
  {
    id: 'session-2',
    memberId: 'member-kabir',
    memberName: 'Kabir Mehta',
    memberStatus: 'ACTIVE',
    arrival: '5:45 PM',
    workoutName: 'Upper Body Blast',
    zoneId: 'zone-chest',
    zoneName: 'Chest Zone',
    trainerName: 'Rahul Sharma',
    method: 'QR',
    checkedInBy: 'Front Desk QR Reader'
  },
  {
    id: 'session-3',
    memberId: 'member-dev',
    memberName: 'Devendra Kumar',
    memberStatus: 'ACTIVE',
    arrival: '6:05 PM',
    workoutName: 'Deadlift & Posterior Chain',
    zoneId: 'zone-back',
    zoneName: 'Back & Pull Zone',
    trainerName: 'Vikram Singh',
    method: 'QR',
    checkedInBy: 'Vikram Singh (Trainer)'
  },
  {
    id: 'session-4',
    memberId: 'member-riya',
    memberName: 'Riya Sen',
    memberStatus: 'ACTIVE',
    arrival: '6:00 PM',
    workoutName: 'Lat & Pull-Down Focus',
    zoneId: 'zone-back',
    zoneName: 'Back & Pull Zone',
    trainerName: 'Priya Verma',
    method: 'MEMBER_ID',
    checkedInBy: 'Reception Manual'
  },
  {
    id: 'session-5',
    memberId: 'member-rohit',
    memberName: 'Rohit Deshmukh',
    memberStatus: 'ACTIVE',
    arrival: '6:15 PM',
    workoutName: 'Barbell Row & Bicep Peak',
    zoneId: 'zone-back',
    zoneName: 'Back & Pull Zone',
    trainerName: 'Vikram Singh',
    method: 'QR',
    checkedInBy: 'Front Desk QR Reader'
  }
];

export const INITIAL_TODAY_WORKOUT_ARUN: WorkoutAssignment = {
  id: 'wa-arun-today',
  memberId: 'member-arun',
  memberName: 'Arun Patel',
  date: new Date().toISOString().split('T')[0],
  title: 'Chest + Triceps Hypertrophy',
  targetMuscles: ['Pectorals', 'Anterior Delts', 'Triceps Brachii'],
  zoneId: 'zone-chest',
  zoneName: 'Chest Zone',
  trainerId: 'trainer-rahul',
  trainerName: 'Rahul Sharma',
  timeSlot: '6:00 PM – 7:00 PM',
  completionPercentage: 40,
  isCompleted: false,
  isOverride: false,
  exercises: [
    {
      id: 'ex-1',
      name: 'Flat Barbell Bench Press',
      targetMuscles: ['Chest', 'Triceps'],
      sets: 4,
      reps: '10, 8, 8, 6',
      restSeconds: 90,
      equipment: 'Olympic Barbell & Flat Bench',
      instructions: 'Retract scapulae, touch lower sternum under control, drive upward explosively.',
      completed: true,
      notes: 'Clean reps at 80kg'
    },
    {
      id: 'ex-2',
      name: 'Incline Dumbbell Press',
      targetMuscles: ['Upper Chest', 'Front Delts'],
      sets: 3,
      reps: '10-12',
      restSeconds: 75,
      equipment: '30° Incline Bench & Dumbbells',
      instructions: 'Keep elbows at 45 degree angle to protect right shoulder joint.',
      completed: true,
      notes: '28kg pairs'
    },
    {
      id: 'ex-3',
      name: 'Cable Pec Fly (Mid-Pulley)',
      targetMuscles: ['Chest'],
      sets: 3,
      reps: '12-15',
      restSeconds: 60,
      equipment: 'Dual Cable Cross Stack',
      instructions: 'Squeeze pecs hard at midline for a 1-second peak contraction.',
      completed: false,
      notes: ''
    },
    {
      id: 'ex-4',
      name: 'Overhead Tricep Rope Extension',
      targetMuscles: ['Triceps Long Head'],
      sets: 4,
      reps: '12',
      restSeconds: 60,
      equipment: 'Cable Stack with Rope Attachment',
      instructions: 'Keep elbows pinned forward, full stretch behind neck.',
      completed: false,
      notes: ''
    },
    {
      id: 'ex-5',
      name: 'Close-Grip Tricep Pushdown',
      targetMuscles: ['Triceps Lateral Head'],
      sets: 3,
      reps: '15',
      restSeconds: 45,
      equipment: 'Straight Bar Cable',
      instructions: 'Lock out fully at the bottom with knuckles pressed down.',
      completed: false,
      notes: ''
    }
  ]
};

export const INITIAL_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay-101',
    memberId: 'member-arun',
    memberName: 'Arun Patel',
    planName: 'Half-Yearly Elite',
    amount: 15999,
    paymentMethod: 'UPI',
    reference: 'UPI/2026/0601/99281',
    date: '2026-06-01',
    recordedBy: 'Admin Reception',
    notes: 'Paid via GPay UPI'
  },
  {
    id: 'pay-102',
    memberId: 'member-neha',
    memberName: 'Neha Kapoor',
    planName: 'Annual Infinity VIP',
    amount: 27999,
    paymentMethod: 'Card',
    reference: 'POS/HDFC/882190',
    date: '2026-01-15',
    recordedBy: 'Admin Reception',
    notes: 'Credit card swipe'
  },
  {
    id: 'pay-103',
    memberId: 'member-rohit',
    memberName: 'Rohit Deshmukh',
    planName: 'Quarterly Transformation',
    amount: 8999,
    paymentMethod: 'UPI',
    reference: 'UPI/2026/0710/11823',
    date: '2026-07-10',
    recordedBy: 'Admin Reception',
    notes: 'Paid via PhonePe'
  },
  {
    id: 'pay-104',
    memberId: 'member-kabir',
    memberName: 'Kabir Mehta',
    planName: 'Annual Infinity VIP',
    amount: 27999,
    paymentMethod: 'Bank Transfer',
    reference: 'IMPS/NEFT/0029188',
    date: '2026-03-01',
    recordedBy: 'Owner Desk',
    notes: 'Direct bank transfer'
  }
];

export const INITIAL_PERSONAL_RECORDS: PersonalRecord[] = [
  {
    id: 'pr-1',
    memberId: 'member-arun',
    exercise: 'Barbell Bench Press',
    weightKg: 85,
    reps: 6,
    previousWeightKg: 75,
    improvementPercentage: 13.3,
    date: '2026-09-08',
    verifiedBy: 'Rahul Sharma (Trainer)'
  },
  {
    id: 'pr-2',
    memberId: 'member-arun',
    exercise: 'Incline Dumbbell Press',
    weightKg: 32,
    reps: 8,
    previousWeightKg: 28,
    improvementPercentage: 14.2,
    date: '2026-08-28',
    verifiedBy: 'Rahul Sharma (Trainer)'
  },
  {
    id: 'pr-3',
    memberId: 'member-arun',
    exercise: 'Overhead Barbell Strict Press',
    weightKg: 55,
    reps: 8,
    previousWeightKg: 50,
    improvementPercentage: 10.0,
    date: '2026-08-14',
    verifiedBy: 'Rahul Sharma (Trainer)'
  }
];

export const INITIAL_ATTENDANCE_LOGS: AttendanceRecord[] = [
  {
    id: 'att-1',
    memberId: 'member-arun',
    memberName: 'Arun Patel',
    arrival: '6:02 PM',
    exit: '7:18 PM',
    durationMinutes: 76,
    workoutName: 'Back & Biceps Pull Day',
    zoneName: 'Back & Pull Zone',
    method: 'QR',
    date: '2026-09-14'
  },
  {
    id: 'att-2',
    memberId: 'member-arun',
    memberName: 'Arun Patel',
    arrival: '6:15 PM',
    exit: '7:25 PM',
    durationMinutes: 70,
    workoutName: 'Legs Quads & Calves Heavy',
    zoneName: 'Legs & Quads Bay',
    method: 'QR',
    date: '2026-09-13'
  },
  {
    id: 'att-3',
    memberId: 'member-arun',
    memberName: 'Arun Patel',
    arrival: '6:08 PM',
    exit: '7:12 PM',
    durationMinutes: 64,
    workoutName: 'Shoulder Biomechanics & Core',
    zoneName: 'Shoulders & Delts',
    method: 'QR',
    date: '2026-09-11'
  },
  {
    id: 'att-4',
    memberId: 'member-arun',
    memberName: 'Arun Patel',
    arrival: '5:58 PM',
    exit: '7:05 PM',
    durationMinutes: 67,
    workoutName: 'Arms & High-Intensity Conditioning',
    zoneName: 'Arms & Isolation',
    method: 'QR',
    date: '2026-09-09'
  }
];
