/**
 * Exercise Mapper Service
 * Relaciona nomes populares (Brasil) com tipos oficiais do ecossistema Google.
 */

export interface ExerciseDefinition {
  id: string;
  usualName: string;
  googleFitType: string;
}

export const EXERCISE_DICTIONARY: ExerciseDefinition[] = [
  { id: 'chest_01', usualName: 'Supino Reto', googleFitType: 'chest_press' },
  { id: 'chest_02', usualName: 'Supino Inclinado', googleFitType: 'chest_press' },
  { id: 'leg_01', usualName: 'Agachamento Livre', googleFitType: 'squat' },
  { id: 'leg_02', usualName: 'Leg Press 45°', googleFitType: 'leg_press' },
  { id: 'back_01', usualName: 'Puxada Alta', googleFitType: 'lat_pulldown' },
  { id: 'back_02', usualName: 'Remada Curvada', googleFitType: 'row' },
  { id: 'arm_01', usualName: 'Rosca Direta', googleFitType: 'bicep_curl' },
  { id: 'shoulder_01', usualName: 'Elevação Lateral', googleFitType: 'lateral_raise' },
];

export const getGoogleFitExerciseType = (name: string): string => {
  const normalized = name.toLowerCase().trim();
  const found = EXERCISE_DICTIONARY.find(ex => 
    ex.usualName.toLowerCase() === normalized || ex.id === normalized
  );
  return found?.googleFitType || 'strength_training';
};
