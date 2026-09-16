import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { WorkoutAssignment, ExerciseItem } from '../types';
import { INITIAL_TODAY_WORKOUT_ARUN } from './seedData';
import { auditService } from './auditService';
import { DEFAULT_GYM_ID } from './gymSettingsService';

const WORKOUT_COLLECTION = 'workout_assignments';
const OVERRIDES_COLLECTION = 'workout_overrides';

export const workoutService = {
  async getWorkoutForMember(memberId: string, date: string): Promise<WorkoutAssignment | null> {
    try {
      const q = query(
        collection(db, WORKOUT_COLLECTION),
        where('memberId', '==', memberId),
        where('date', '==', date)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { ...snap.docs[0].data(), id: snap.docs[0].id } as WorkoutAssignment;
      }
      // If member is Arun and date is today, return initial
      if (memberId.includes('arun')) {
        return INITIAL_TODAY_WORKOUT_ARUN;
      }
      return null;
    } catch (error) {
      console.warn('Failed to load workout assignment from Firestore:', error);
      return memberId.includes('arun') ? INITIAL_TODAY_WORKOUT_ARUN : null;
    }
  },

  subscribeWorkoutForMember(
    memberId: string, 
    date: string, 
    callback: (workout: WorkoutAssignment | null) => void
  ): () => void {
    const q = query(
      collection(db, WORKOUT_COLLECTION),
      where('memberId', '==', memberId),
      where('date', '==', date)
    );

    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          callback({ ...snap.docs[0].data(), id: snap.docs[0].id } as WorkoutAssignment);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.warn('Workout assignment snapshot listener error:', error);
        callback(null);
      }
    );
  },

  async toggleExerciseComplete(
    assignmentId: string, 
    exerciseId: string, 
    currentWorkout: WorkoutAssignment
  ): Promise<void> {
    const path = `${WORKOUT_COLLECTION}/${assignmentId}`;
    try {
      const updatedExercises = currentWorkout.exercises.map(ex => {
        if (ex.id === exerciseId) {
          return { ...ex, completed: !ex.completed };
        }
        return ex;
      });

      const completedCount = updatedExercises.filter(e => e.completed).length;
      const totalCount = updatedExercises.length;
      const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      const isCompleted = completedCount === totalCount && totalCount > 0;

      const ref = doc(db, WORKOUT_COLLECTION, assignmentId);
      await setDoc(ref, {
        ...currentWorkout,
        id: assignmentId,
        gymId: DEFAULT_GYM_ID,
        exercises: updatedExercises,
        completionPercentage,
        isCompleted,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async assignWorkout(workout: WorkoutAssignment, assignedBy: string): Promise<void> {
    const id = workout.id || `wa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const path = `${WORKOUT_COLLECTION}/${id}`;
    try {
      const ref = doc(db, WORKOUT_COLLECTION, id);
      await setDoc(ref, {
        ...workout,
        id,
        gymId: DEFAULT_GYM_ID,
        assignedBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      await auditService.logAuditEvent(
        assignedBy,
        'ASSIGN_WORKOUT',
        'WorkoutAssignment',
        id,
        `Assigned ${workout.title} to member ${workout.memberName} for ${workout.date}`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async recordWorkoutOverride(override: {
    assignmentId: string;
    memberId: string;
    memberName: string;
    trainerName: string;
    originalWorkout: string;
    newWorkout: string;
    reason: string;
  }): Promise<void> {
    const id = `override_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      const ref = doc(db, OVERRIDES_COLLECTION, id);
      await setDoc(ref, {
        ...override,
        id,
        gymId: DEFAULT_GYM_ID,
        createdAt: serverTimestamp()
      });

      // Also update the workout assignment if present
      if (override.assignmentId) {
        const waRef = doc(db, WORKOUT_COLLECTION, override.assignmentId);
        await updateDoc(waRef, {
          isOverride: true,
          overrideReason: `${override.newWorkout} - ${override.reason} (Approved by ${override.trainerName})`,
          updatedAt: serverTimestamp()
        });
      }

      await auditService.logAuditEvent(
        override.trainerName,
        'WORKOUT_OVERRIDE',
        'WorkoutOverride',
        id,
        `Overrode workout for ${override.memberName}: ${override.reason}`
      );
    } catch (error) {
      console.warn('Workout override log error:', error);
    }
  }
};
