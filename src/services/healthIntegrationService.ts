/**
 * HealthIntegrationService
 * Camada de abstração para comunicação com Health Connect (Android) ou Google Fit (Web/Cloud)
 */

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
      // Simulação de chamada para bridge nativa
      // return await window.AndroidHealthConnect.requestPermissions();
      return SyncStatus.CONNECTED;
    }

    // Fallback para Web (Simulação ou Google Fit REST API)
    return new Promise((resolve) => {
      setTimeout(() => resolve(SyncStatus.CONNECTED), 1500);
    });
  }

  /**
   * Sincroniza um treino de musculação com o Google Fit / Health Connect.
   * Utiliza um identificador único para evitar duplicação e aplica override de calorias.
   */
  public async syncStrengthWorkout(session: {
    id: string;
    title: string;
    durationMinutes: number;
    caloriesBurned: number;
    startTime: Date;
    endTime: Date;
  }): Promise<boolean> {
    const syncId = `fit_monster_session_${session.id}`;
    console.log('Syncing Strength Workout with Idempotency ID:', syncId);
    console.log('Applying Manual Calories Override:', session.caloriesBurned);
    
    // Na Bridge Nativa Android, isso chamaria o StrengthWorkoutRepository.saveWeightliftingSession()
    // passando o 'syncId' para o Metadata.clientRecordId
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[Health Connect] Treino "${session.title}" (${session.caloriesBurned} kcal) sincronizado.`);
        resolve(true);
      }, 1500);
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
