# Arquitetura de Integração: Health Connect (Android 2026)

Este guia descreve a arquitetura profissional para integrar o aplicativo Monster Gym com o ecossistema de saúde do Google, utilizando o **Health Connect SDK** (substituto da Fitness API).

## 1. Configuração no Google Cloud Console

Para que qualquer integração funcione:
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto ou selecione um existente.
3. No painel **APIs e Serviços**, ative a **Google Fit API** (mesmo usando Health Connect, o backend de sincronização cloud utiliza essa base).
4. Em **Tela de Consentimento OAuth**, configure os escopos de sensibilidade.
5. Em **Credenciais**, crie um **ID do cliente OAuth 2.0** para Android.
   - Você precisará do **Nome do Pacote** do seu app (ex: `com.monstergym.app`).
   - Você precisará do **Hush SHA-1** do seu certificado de assinatura (debug e release).

---

## 2. Configuração de Escopos

No seu arquivo `AndroidManifest.xml`, você deve declarar o suporte ao Health Connect e os escopos:

```xml
<activity-alias
    android:name="ViewPermissionUsageActivity"
    android:exported="true"
    android:targetActivity=".MainActivity"
    android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
    <intent-filter>
        <action android:name="android.health.connect.action.VIEW_PERMISSION_USAGE" />
        <category android:name="android.intent.category.DEFAULT" />
    </intent-filter>
</activity-alias>
```

**Escopos Necessários:**
- `HealthPermission.getReadPermission(StepsRecord::class)`
- `HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class)`
- `HealthPermission.getReadPermission(HeartRateRecord::class)`
- `HealthPermission.getWritePermission(ExerciseSessionRecord::class)` (Para sessões de musculação)

---

## 3. FitnessManager (Kotlin) - Implementação Profissional

```kotlin
package com.monstergym.app.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.ZonedDateTime

class FitnessManager(private val context: Context) {

    private val healthConnectClient by lazy { HealthConnectClient.getOrCreate(context) }

    // Pilar 2: Gerenciador de Conexão e Permissões
    suspend fun hasAllPermissions(): Boolean {
        val permissions = setOf(
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
            HealthPermission.getWritePermission(ExerciseSessionRecord::class)
        )
        return healthConnectClient.permissionController.getGrantedPermissions().containsAll(permissions)
    }

    // Pilar 3: Registro de Treino (Musculação)
    suspend fun writeWorkoutSession(
        startTime: Instant,
        endTime: Instant,
        calories: Double,
        title: String
    ) {
        val workoutRecord = ExerciseSessionRecord(
            startTime = startTime,
            startZoneOffset = ZonedDateTime.now().offset,
            endTime = endTime,
            endZoneOffset = ZonedDateTime.now().offset,
            exerciseType = ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING, // Musculação
            title = title,
            notes = "Treino sincronizado via Monster Gym App"
        )

        val caloriesRecord = TotalCaloriesBurnedRecord(
            startTime = startTime,
            startZoneOffset = ZonedDateTime.now().offset,
            endTime = endTime,
            endZoneOffset = ZonedDateTime.now().offset,
            energy = androidx.health.connect.client.units.Energy.kilocalories(calories)
        )

        healthConnectClient.insertRecords(listOf(workoutRecord, caloriesRecord))
    }

    // Pilar 4: Leitura de Resumo Diário
    suspend fun readDailyStats(startTime: Instant, endTime: Instant): DailyHealthStats {
        val stepsRequest = healthConnectClient.readRecords(
            ReadRecordsRequest(
                StepsRecord::class,
                timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
            )
        )
        
        val totalSteps = stepsRequest.records.sumOf { it.count }
        
        val caloriesRequest = healthConnectClient.readRecords(
            ReadRecordsRequest(
                TotalCaloriesBurnedRecord::class,
                timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
            )
        )
        val totalCalories = caloriesRequest.records.sumOf { it.energy.inKilocalories }

        return DailyHealthStats(totalSteps, totalCalories)
    }
}

data class DailyHealthStats(val steps: Long, val calories: Double)
```

---

## 5. Mapeamento Específico para Musculação (Strength Training)

Para que o Google Fit reconheça o treino como "Musculação" e não apenas uma atividade genérica, utilizamos o `EXERCISE_TYPE_STRENGTH_TRAINING`. Além disso, grandes apps de fitness usam um `clientRecordId` para evitar duplicidade.

### Mapeamento de Atributos:
- **Atividade Principal:** `ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING`
- **Energia (Calorias):** Registrada como `TotalCaloriesBurnedRecord`.
- **Frequência Cardíaca:** Se disponível via wearable, deve ser injetada como `HeartRateRecord` (list of samples).

### Estratégia Anti-Duplicidade (Idempotência):
Use o ID único do treino gerado no seu banco local (ex: UUID) como o `clientRecordId` do Health Connect.
```kotlin
val metadata = Metadata(clientRecordId = "monster_gym_session_$localWorkoutUuid")
```

---

## 6. StrengthWorkoutRepository (Kotlin/Clean Architecture)

```kotlin
class StrengthWorkoutRepository(private val healthConnectClient: HealthConnectClient) {

    /**
     * Salva uma sessão de musculação protegendo contra duplicidade.
     */
    suspend fun saveWeightliftingSession(
        startTime: Instant,
        endTime: Instant,
        calories: Double,
        workoutTitle: String,
        localId: String
    ): Boolean {
        try {
            // 1. Definição da Sessão
            val sessionRecord = ExerciseSessionRecord(
                startTime = startTime,
                startZoneOffset = ZonedDateTime.now().offset,
                endTime = endTime,
                endZoneOffset = ZonedDateTime.now().offset,
                exerciseType = ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING,
                title = workoutTitle,
                metadata = Metadata(clientRecordId = "monster_session_$localId")
            )

            // 2. Registro de Calorias (Override manual do App)
            val caloriesRecord = TotalCaloriesBurnedRecord(
                startTime = startTime,
                startZoneOffset = ZonedDateTime.now().offset,
                endTime = endTime,
                endZoneOffset = ZonedDateTime.now().offset,
                energy = Energy.kilocalories(calories),
                metadata = Metadata(clientRecordId = "monster_cal_$localId")
            )

            // Escrita em Lote
            healthConnectClient.insertRecords(listOf(sessionRecord, caloriesRecord))
            return true
        } catch (e: Exception) {
            Log.e("StrengthRepo", "Erro ao salvar treino", e)
            return false
        }
    }
}
```

---

### 4. O Diferencial dos Grandes Apps

### Segmentação por Exercício
Em vez de registrar apenas "1 hora de academia", os apps de elite registram "Sessão de Musculação" e, dentro dela, segmentos. O Health Connect permite associar metadados específicos de cada exercício. No Android, você pode usar `ExerciseSegment` dentro da sessão.

### Cálculo de Calorias Próprio
O Google Fit/Health Connect nem sempre calcula bem as calorias de musculação. O Fit Monster calcula isso baseado no volume (séries x reps x carga). Sempre envie o valor calculado pelo app como um dado manual (Override), garantindo que sua lógica seja a fonte da verdade.

### Modo Offline e Idempotência
Garanta que, se o aluno terminar o treino sem sinal, o app armazene o treino localmente. No Health Connect, sempre use o `clientRecordId` (Ex: `monster_session_$DOC_ID`) para que mesmo em múltiplas tentativas de sincronização, o dado nunca seja duplicado no ecossistema do Google.

### Sincronização em Background (WorkManager)
Não chame a sincronização diretamente da UI para processos longos. Use um `CoroutineWorker`:

```kotlin
class HealthSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val fitnessManager = FitnessManager(applicationContext)
        // Lógica de sincronização total
        return Result.success()
    }
}
```

### Health Connect como Ponte Única
Desde 2025, o Health Connect centraliza os dados. Se o usuário usa um Galaxy Watch, o dado vai para o Samsung Health, que espelha no Health Connect, e você lê de lá. Isso evita integrações individuais com cada fabricante.
