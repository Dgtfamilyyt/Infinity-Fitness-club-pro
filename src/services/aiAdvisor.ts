import { GoogleGenAI } from '@google/genai';

export async function consultWorkoutSafetyAdvisor(params: {
  memberName: string;
  memberGoal: string;
  experience: string;
  restrictions: string;
  proposedWorkout: string;
  zoneName: string;
  query: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || (typeof window !== 'undefined' ? (window as any).__GEMINI_API_KEY__ : '');
  
  if (!apiKey) {
    return `[Advisory Note]: Trainer review is required. For ${params.memberName} with "${params.restrictions}", recommend avoiding heavy locked-out loads and substituting overhead pressing with low-incline dumbbell press with neutral grip. Ensure warm-up with rotator cuff band external rotations.`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are the Head Biomechanics & Athletic Performance Advisor at Infinity Fitness Club.
Member Profile:
- Name: ${params.memberName}
- Goal: ${params.memberGoal}
- Experience: ${params.experience}
- Reported Medical/Physical Restrictions: ${params.restrictions || 'None'}
- Proposed Workout & Zone: ${params.proposedWorkout} in ${params.zoneName}

Trainer Query: ${params.query}

IMPORTANT SAFETY RULES:
- Never diagnose medical conditions or claim medical authority.
- Provide practical exercise biomechanics adjustments, exercise substitutions, angle modifications, set/rep tempo recommendations, and warm-up protocols.
- Provide a clear, structured recommendation that gym trainers can immediately execute on the floor.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: 'HIGH' as any,
        }
      }
    });

    return response.text || 'No response generated from safety advisor.';
  } catch (err: any) {
    console.error('Error generating AI safety advice:', err);
    return `[Safety Protocol]: Member has restriction "${params.restrictions}". Standard substitution protocol: Replace overhead barbell movements with seated neutral grip dumbbell press (30-45 degree incline), 3x12 reps, RPE 7. Incorporate band pull-aparts and face pulls prior to pressing.`;
  }
}
