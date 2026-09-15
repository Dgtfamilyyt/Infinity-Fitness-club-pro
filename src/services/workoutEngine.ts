import { GymZone, UserProfile, WorkoutAssignment } from '../types';

export interface WorkoutRecommendationResult {
  recommendedWorkout: string;
  targetMuscles: string[];
  recommendedZoneId: string;
  recommendedZoneName: string;
  score: number;
  breakdown: {
    programCompatibility: number;
    correctProgramDay: number;
    recoveryScore: number;
    zoneAvailabilityScore: number;
    equipmentReadinessScore: number;
    penalties: number;
  };
  reasons: string[];
  restrictionsFlagged: string[];
  isZoneFull: boolean;
  alternativeOptions: {
    workout: string;
    zoneName: string;
    score: number;
    reason: string;
  }[];
}

export function evaluateWorkoutAssignment(
  member: UserProfile,
  zones: GymZone[],
  recentTrainedMuscles: string[] = ['Lats', 'Biceps']
): WorkoutRecommendationResult {
  const restrictions = member.restrictions?.toLowerCase() || '';
  const goal = member.fitnessGoal?.toLowerCase() || '';
  const reasons: string[] = [];
  const restrictionsFlagged: string[] = [];

  // Flag any restrictions
  if (restrictions && restrictions !== 'none') {
    restrictionsFlagged.push(`Member medical/safety restriction on file: "${member.restrictions}". Trainer oversight required.`);
  }

  // Find candidate workouts based on split
  const candidateWorkouts = [
    {
      title: 'Chest + Triceps Hypertrophy',
      targetMuscles: ['Chest', 'Triceps', 'Front Delts'],
      zoneId: 'zone-chest',
      zoneName: 'Chest Zone',
      programMatch: true,
      dayMatch: true
    },
    {
      title: 'Legs & Core Power',
      targetMuscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
      zoneId: 'zone-legs',
      zoneName: 'Legs & Quads Bay',
      programMatch: true,
      dayMatch: false
    },
    {
      title: 'Back & Rear Delts Pull',
      targetMuscles: ['Lats', 'Rhomboids', 'Rear Delts', 'Biceps'],
      zoneId: 'zone-back',
      zoneName: 'Back & Pull Zone',
      programMatch: true,
      dayMatch: false
    },
    {
      title: 'Shoulder Biomechanics & Conditioning',
      targetMuscles: ['Shoulders', 'Rotator Cuff', 'Upper Traps'],
      zoneId: 'zone-shoulders',
      zoneName: 'Shoulders & Delts',
      programMatch: true,
      dayMatch: false
    },
    {
      title: 'Cardio Engine & Active Recovery',
      targetMuscles: ['Cardiovascular', 'Full Body Conditioning'],
      zoneId: 'zone-cardio',
      zoneName: 'Cardio & HIIT Track',
      programMatch: false,
      dayMatch: false
    }
  ];

  // Score each candidate
  const scoredCandidates = candidateWorkouts.map(candidate => {
    let score = 0;
    let programComp = candidate.programMatch ? 40 : 15;
    let dayComp = candidate.dayMatch ? 30 : 10;
    let recoveryScore = 25;
    let zoneScore = 15;
    let equipScore = 10;
    let penalty = 0;
    let itemReasons: string[] = [];

    // Check muscle recovery
    const overlapsRecent = candidate.targetMuscles.some(m => recentTrainedMuscles.includes(m));
    if (overlapsRecent) {
      recoveryScore = 0;
      penalty += 50;
      itemReasons.push('Muscles trained within past 24h (-50 penalty)');
    } else {
      itemReasons.push('Target muscle groups fully rested and recovered (+25)');
    }

    // Check zone capacity
    const zone = zones.find(z => z.id === candidate.zoneId);
    if (zone) {
      const freeSlots = zone.capacity - zone.currentOccupancy;
      if (freeSlots <= 0) {
        penalty += 60;
        zoneScore = 0;
        itemReasons.push(`${zone.name} is currently at max capacity (${zone.capacity}/${zone.capacity}) (-60 penalty)`);
      } else if (freeSlots === 1) {
        penalty += 10;
        zoneScore = 5;
        itemReasons.push(`${zone.name} is near capacity (${zone.currentOccupancy}/${zone.capacity})`);
      } else {
        zoneScore = 15;
        itemReasons.push(`${zone.name} has optimal available floor space (${freeSlots} slots open)`);
      }
    }

    // Check restriction conflict
    if (restrictions.includes('shoulder') && candidate.title.includes('Shoulder')) {
      penalty += 80;
      itemReasons.push('Direct conflict with recorded shoulder restriction (-80)');
    }

    score = programComp + dayComp + recoveryScore + zoneScore + equipScore - penalty;

    return {
      candidate,
      score,
      breakdown: {
        programCompatibility: programComp,
        correctProgramDay: dayComp,
        recoveryScore,
        zoneAvailabilityScore: zoneScore,
        equipmentReadinessScore: equipScore,
        penalties: penalty
      },
      itemReasons
    };
  });

  // Sort by highest score
  scoredCandidates.sort((a, b) => b.score - a.score);
  const best = scoredCandidates[0];
  const matchedZone = zones.find(z => z.id === best.candidate.zoneId);
  const isZoneFull = matchedZone ? matchedZone.currentOccupancy >= matchedZone.capacity : false;

  const alternativeOptions = scoredCandidates.slice(1).map(c => ({
    workout: c.candidate.title,
    zoneName: c.candidate.zoneName,
    score: c.score,
    reason: c.itemReasons.join('; ')
  }));

  return {
    recommendedWorkout: best.candidate.title,
    targetMuscles: best.candidate.targetMuscles,
    recommendedZoneId: best.candidate.zoneId,
    recommendedZoneName: best.candidate.zoneName,
    score: best.score,
    breakdown: best.breakdown,
    reasons: best.itemReasons,
    restrictionsFlagged,
    isZoneFull,
    alternativeOptions
  };
}
