/**
 * HealthIntegrationService
 * Camada de abstração para comunicação com Health Connect (Android) ou Google Fit (Web/Cloud)
 */

import { getGoogleFitExerciseType } from './exerciseMapper';

export enum SyncStatus {
  NOT_CONNECTED = 'NOT_CONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface HealthData {
  steps: number;
  calories: number;
  heartRate?: number;
  lastSync: string;
}

class HealthIntegrationService {
  private static instance: HealthIntegrationService;
  
  private constructor() {}

  public static getInstance(): HealthIntegrationService {
    if (!HealthIntegrationService.instance) {
      HealthIntegrationService.instance = new HealthIntegrationService();
    }
    return HealthIntegrationService.instance;
  }

  /**
   * Verifica se o ambiente suporta conexão nativa (Android WebView/Capacitor)
   */
  public isNativeSupportAvailable(): boolean {
    // @ts-ignore - Verifica se existe a bridge injetada pelo Android
    return typeof window !== 'undefined' && (!!window.AndroidHealthConnect || !!window.Capacitor);
  }

  /**
   * Solicita permissões e conecta ao Health Connect
   */
  public async connect(): Promise<SyncStatus> {
    console.log('Solicitando conexão com Health Connect...');
    
    if (this.isNativeSupportAvailable()) {
      return SyncStatus.CONNECTED;
    }

    return new Promise((resolve) => {
      setTimeout(() => resolve(SyncStatus.CONNECTED), 1500);
    });
  }

  /**
   * Sincroniza um treino customizado, mapeando os nomes dos exercícios
   * usuais para os tipos oficiais do Google Fit.
   */
  public async syncCustomWorkout(workout: {
    id: string;
    title: string;
    exercises: string[]; // Lista de nomes como 'Supino Reto', 'Leg Press'
    durationMinutes: number;
    caloriesBurned: number;
    startTime: Date;
    endTime: Date;
  }): Promise<boolean> {
    // Mapeia os exercícios para os tipos do Google
    const mappedExTypes = workout.exercises.map(ex => getGoogleFitExerciseType(ex));
    
    console.log('--- SYNC CUSTOM WORKOUT ---');
    console.log(`Title: ${workout.title}`);
    console.log(`Idempotency ID: monster_gym_${workout.id}`);
    console.log('Mapped Exercise Types for Google Fit:', mappedExTypes);
    
    // Na Bridge Nativa:
    // NativeBridge.insertStrengthSession(
    //    workout.startTime, 
    //    workout.endTime, 
    //    mappedExTypes, 
    //    workout.caloriesBurned
    // );
    
    return true;
  }

  public async syncStrengthWorkout(session: {
    id: string;
    title: string;
    durationMinutes: number;
    caloriesBurned: number;
    startTime: Date;
    endTime: Date;
  }): Promise<boolean> {
    console.log('Syncing Strength Workout with Idempotency ID:', `monster_gym_${session.id}`);
    
    // Na Bridge Nativa Android, isso chamaria o StrengthWorkoutRepository.saveWeightliftingSession()
    // simulando uma chamada de bridge assíncrona
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[Health Connect] Treino "${session.title}" sincronizado com sucesso.`);
        resolve(true);
      }, 1000);
    });
  }

  /**
   * Lê dados diários
   */
  public async fetchDailyStats(): Promise<HealthData> {
    // Simulação de retorno de dados do Health Connect
    return {
      steps: 8432,
      calories: 450,
      heartRate: 72,
      lastSync: new Date().toISOString()
    };
  }
}

export const healthService = HealthIntegrationService.getInstance();
