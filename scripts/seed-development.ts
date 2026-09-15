/**
 * Infinity Fitness Club - Controlled Development Seed & Migration Script
 * 
 * Usage:
 *   npx tsx scripts/seed-development.ts
 * 
 * This script seeds production-grade operational entities directly into Firestore
 * with proper cryptographic QR token hashes, memberships, zones, plans, and profiles.
 * It is completely isolated from production UI and only runs when explicitly invoked.
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  INITIAL_GYM_SETTINGS, 
  INITIAL_ZONES, 
  INITIAL_PLANS, 
  INITIAL_TRAINERS, 
  INITIAL_STAFF, 
  INITIAL_MEMBERS, 
  INITIAL_ACTIVE_SESSIONS, 
  INITIAL_TODAY_WORKOUT_ARUN, 
  INITIAL_PAYMENTS, 
  INITIAL_PERSONAL_RECORDS 
} from '../src/services/seedData';
import { hashQrToken } from '../src/services/qrService';

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

async function runSeed() {
  console.log('🚀 [Seed] Beginning Infinity Fitness Club Firestore seeding...');

  try {
    // 1. Seed Gym Floor Zones & Capacities
    console.log('🏋️ Seeding Gym Floor Zones & Capacities...');
    for (const zone of INITIAL_ZONES) {
      await setDoc(doc(db, 'gym_zones', zone.id), {
        ...zone,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    // 3. Seed Membership Plans
    console.log('📋 Seeding Membership Plans...');
    for (const plan of INITIAL_PLANS) {
      await setDoc(doc(db, 'membership_plans', plan.id), {
        ...plan,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    // 4. Seed Staff & Trainers
    console.log('🛡️ Seeding Staff & Trainer Profiles...');
    for (const trainer of INITIAL_TRAINERS) {
      await setDoc(doc(db, 'profiles', trainer.id), {
        ...trainer,
        gymId: 'infinity-neelambur',
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    for (const staffMember of INITIAL_STAFF) {
      await setDoc(doc(db, 'profiles', staffMember.id), {
        ...staffMember,
        gymId: 'infinity-neelambur',
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    // 5. Seed Member Profiles & QR Tokens
    console.log('🎟️ Seeding Members, Cryptographic QR Tokens, and Memberships...');
    for (const member of INITIAL_MEMBERS) {
      await setDoc(doc(db, 'profiles', member.id), {
        ...member,
        gymId: 'infinity-neelambur',
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Hash QR token and map in qr_tokens
      if (member.qrToken) {
        const tokenHash = await hashQrToken(member.qrToken);
        if (tokenHash) {
          await setDoc(doc(db, 'qr_tokens', tokenHash), {
            memberUid: member.id,
            memberId: member.memberId || 'IFC-1001',
            gymId: 'infinity-neelambur',
            active: member.status === 'ACTIVE',
            version: 'IFC1',
            createdAt: serverTimestamp()
          }, { merge: true });
        }
      }

      // Create membership record
      await setDoc(doc(db, 'memberships', `mem_${member.id}`), {
        gymId: 'infinity-neelambur',
        memberUid: member.id,
        planId: member.membershipPlanId || 'plan-quarterly',
        planName: member.planName || 'Quarterly Transformation',
        status: member.status || 'ACTIVE',
        startDate: member.membershipStart || '2026-06-01',
        expiryDate: member.membershipExpiry || '2026-12-01',
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    // 6. Seed Workout Assignment
    console.log('💪 Seeding Sample Workout Assignment...');
    await setDoc(doc(db, 'workout_assignments', INITIAL_TODAY_WORKOUT_ARUN.id), {
      ...INITIAL_TODAY_WORKOUT_ARUN,
      gymId: 'infinity-neelambur',
      updatedAt: serverTimestamp()
    }, { merge: true });

    // 7. Seed Payments
    console.log('💳 Seeding Verified Payments...');
    for (const pay of INITIAL_PAYMENTS) {
      await setDoc(doc(db, 'payments', pay.id), {
        ...pay,
        gymId: 'infinity-neelambur',
        createdAt: serverTimestamp()
      }, { merge: true });
    }

    // 8. Seed Personal Records
    console.log('🏆 Seeding Personal Records...');
    for (const pr of INITIAL_PERSONAL_RECORDS) {
      await setDoc(doc(db, 'personal_records', pr.id), {
        ...pr,
        gymId: 'infinity-neelambur',
        createdAt: serverTimestamp()
      }, { merge: true });
    }

    // 9. Initial Audit Log
    console.log('📝 Seeding Initial Audit Log...');
    await setDoc(doc(db, 'audit_logs', `audit_init_${Date.now()}`), {
      id: `audit_init_${Date.now()}`,
      actor: 'Dev Migration Script',
      action: 'BOOTSTRAP_DATABASE',
      targetEntity: 'System',
      targetId: 'infinity-neelambur',
      details: 'Populated official club records and floor configurations in Firestore.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: serverTimestamp()
    });

    // 10. Seed Gym Settings (Final step: closes bootstrap door)
    console.log('📍 Seeding Gym Settings and finalizing bootstrap...');
    await setDoc(doc(db, 'gyms', 'infinity-neelambur'), {
      ...INITIAL_GYM_SETTINGS,
      updatedAt: serverTimestamp()
    }, { merge: true });

    console.log('✅ [Seed] Firestore seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ [Seed] Error during seeding:', error);
    process.exit(1);
  }
}

runSeed();
