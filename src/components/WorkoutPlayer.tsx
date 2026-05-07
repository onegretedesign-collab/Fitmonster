import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { cn } from '../lib/utils';
import { CheckCircle2, Clock, Flame, ChevronRight, Play, Pause, FastForward, X, Trophy } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { healthService } from '../services/healthIntegrationService';
import { Smartphone, Check } from 'lucide-react';

interface WorkoutPlayerProps {
  workout: any;
  user: any;
  onClose: () => void;
}

const playBeep = (frequency = 440, duration = 0.1) => {
  try {
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn('Audio context not supported or blocked', e);
  }
};

export default function WorkoutPlayer({ workout, user, onClose }: WorkoutPlayerProps) {
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [currentSetIdx, setCurrentSetIdx] = useState(1);
  const [isFinished, setIsFinished] = useState(false);
  const [isSyncingHealth, setIsSyncingHealth] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [startTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [hasStartedSet, setHasStartedSet] = useState(false);

  const allExercises = [
    ...(workout.warmups || []).map((w: any) => ({ ...w, isWarmup: true })),
    ...workout.exercises.map((e: any) => ({ ...e, isWarmup: false }))
  ];

  const currentExercise = allExercises[currentExerciseIdx];
  const sets = Number(currentExercise.sets || 1);
  const duration = Number(currentExercise.duration || 0);
  const restTime = Number(currentExercise.restTime || 0);

  useEffect(() => {
    let interval: any;
    if (isTimerActive && !isTimerPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          if (next <= 3 && next > 0) playBeep(880, 0.05); // Beep on last 3 seconds
          return next;
        });
      }, 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      setIsTimerActive(false);
      setIsTimerPaused(false);
      playBeep(440, 0.3);
      if (isResting) {
        setIsResting(false);
        setCurrentSetIdx(prev => prev + 1);
      } else {
        // Exercise duration ended, auto-complete set
        handleSetComplete();
      }
    }
    return () => clearInterval(interval);
  }, [isTimerActive, isTimerPaused, timeLeft]);

  const togglePause = () => {
    setIsTimerPaused(!isTimerPaused);
  };

  const skipTimer = () => {
    setTimeLeft(0);
    // The handleSetComplete or progression will be handled by the useEffect on timeLeft === 0
  };

  const startSet = () => {
    if (duration > 0 && timeLeft === 0 && hasStartedSet) {
      handleSetComplete();
      return;
    }

    if (duration > 0) {
      setTimeLeft(duration);
      setIsTimerActive(true);
      setIsTimerPaused(false);
      setIsResting(false);
      setHasStartedSet(true);
      playBeep(660, 0.1);
    } else {
      handleSetComplete();
    }
  };

  const handleSetComplete = () => {
    setHasStartedSet(false);
    if (currentSetIdx < sets) {
      if (restTime > 0) {
        setTimeLeft(restTime);
        setIsResting(true);
        setIsTimerActive(true);
        playBeep(330, 0.2);
      } else {
        setCurrentSetIdx(prev => prev + 1);
      }
    } else {
      if (currentExerciseIdx < allExercises.length - 1) {
        setCurrentExerciseIdx(prev => prev + 1);
        setCurrentSetIdx(1);
        setIsResting(false);
        setIsTimerActive(false);
      } else {
        setIsFinished(true);
        finishWorkout();
      }
    }
  };

  const skipRest = () => {
    setIsResting(false);
    setIsTimerActive(false);
    setTimeLeft(0);
    setCurrentSetIdx(prev => prev + 1);
  };

  const finishWorkout = async () => {
    const endTime = Date.now();
    const durationMinutes = Math.round((endTime - startTime) / 60000);
    const caloriesBurned = durationMinutes * 7;

    try {
      const docRef = await addDoc(collection(db, 'training_sessions'), {
        uid: user.uid,
        workoutId: workout.id || 'generated',
        workoutTitle: workout.title,
        date: new Date().toISOString(),
        durationMinutes,
        caloriesBurned,
        completed: true
      });

      // Sincronização com ecossistema de Saúde (Google Fit / Health Connect)
      // Usamos o ID do Firestore para garantir idempotência (anti-duplicação)
      setIsSyncingHealth(true);
      const success = await healthService.syncStrengthWorkout({
        id: docRef.id,
        title: workout.title,
        durationMinutes,
        caloriesBurned,
        startTime: new Date(startTime),
        endTime: new Date(endTime)
      });
      setSyncSuccess(success);
      setIsSyncingHealth(false);

    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'training_sessions');
      setIsSyncingHealth(false);
    }
  };

  if (isFinished) {
    return (
      <div className="fixed inset-0 bg-monster-black z-[60] flex items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="monster-card w-full max-w-sm text-center space-y-6 py-12"
        >
          <div className="w-20 h-20 bg-monster-green rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(204,255,0,0.4)]">
            <Trophy className="w-10 h-10 text-monster-black" />
          </div>
          <div>
            <h2 className="text-3xl font-black italic uppercase italic tracking-tighter">Treino <span className="text-monster-green">Concluído!</span></h2>
            <p className="text-white/40 font-bold uppercase text-xs mt-2">Você é um monstro!</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-monster-black rounded-xl border border-white/5">
              <p className="text-2xl font-black text-monster-green">{Math.round((Date.now() - startTime) / 60000)}</p>
              <p className="text-[10px] text-white/40 font-bold uppercase">Minutos</p>
            </div>
            <div className="p-4 bg-monster-black rounded-xl border border-white/5">
              <p className="text-2xl font-black text-monster-green">{Math.round((Date.now() - startTime) / 60000) * 7}</p>
              <p className="text-[10px] text-white/40 font-bold uppercase">Calorias</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 py-4 bg-white/5 rounded-2xl border border-white/5">
            {isSyncingHealth ? (
              <div className="flex items-center gap-3 animate-pulse">
                <Smartphone className="w-5 h-5 text-monster-blue animate-bounce" />
                <span className="text-[10px] font-black uppercase text-monster-blue">Sincronizando Google Fit...</span>
              </div>
            ) : syncSuccess ? (
              <div className="flex items-center gap-3 text-monster-green">
                <Check className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase">Sincronizado com Google Fit</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-white/20">
                <Smartphone className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase">Aguardando Sincronização</span>
              </div>
            )}
          </div>

          <button onClick={onClose} className="monster-btn-primary w-full">VOLTAR AO INÍCIO</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-monster-black z-[60] flex flex-col">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-white/5">
        <div>
          <h3 className="text-xs font-black text-monster-green uppercase tracking-widest">{workout.muscleGroup}</h3>
          <h2 className="text-xl font-black italic uppercase">{workout.title}</h2>
        </div>
        <button onClick={onClose} className="text-white/20 hover:text-white"><X /></button>
      </div>

      {/* Progress Bar Section */}
      <div className="px-6 py-2 bg-monster-black/50">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
            Exercícios Concluídos
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-monster-green">
            {currentExerciseIdx} / {allExercises.length}
          </span>
        </div>
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(currentExerciseIdx / allExercises.length) * 100}%` }}
            className="h-full bg-monster-green shadow-[0_0_10px_rgba(204,255,0,0.5)] transition-all duration-500"
          />
        </div>
        <p className="text-center text-[8px] font-bold uppercase text-white/20 mt-2 tracking-tighter">
          {allExercises.length - currentExerciseIdx} exercícios restantes para completar o treino
        </p>
      </div>

      {/* Exercise Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={isResting ? 'rest' : `${currentExerciseIdx}-${currentSetIdx}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full space-y-6 md:space-y-12 py-4 flex-1 flex flex-col justify-center"
          >
            {isResting ? (
              <div className="space-y-4 md:space-y-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-monster-green/20 blur-3xl rounded-full" />
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-monster-green flex items-center justify-center mx-auto relative z-10 bg-monster-black">
                    <span className="text-4xl md:text-6xl font-heading font-black text-monster-green italic">{timeLeft}s</span>
                  </div>
                </div>
                <div>
                  <h2 className="monster-heading text-3xl md:text-4xl">DESCANSO <span className="text-monster-green">ATIVO</span></h2>
                  <p className="text-white/20 font-black uppercase text-[10px] tracking-widest mt-2 md:mt-4">PRÓXIMA SÉRIE: {currentSetIdx + 1}</p>
                </div>
                <button 
                  onClick={skipRest}
                  className="monster-btn-secondary py-3 px-8 text-xs h-auto"
                >
                  PULAR DESCANSO
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center justify-center gap-2 md:gap-3">
                    {currentExercise.isWarmup && (
                      <span className="px-3 py-1 md:px-4 md:py-1.5 bg-monster-blue text-monster-black text-[8px] md:text-[10px] font-black uppercase rounded-full italic tracking-tighter">
                        AQUECIMENTO
                      </span>
                    )}
                    <span className="px-3 py-1 md:px-4 md:py-1.5 bg-monster-green text-monster-black text-[8px] md:text-[10px] font-black uppercase rounded-full italic tracking-tighter shadow-[0_0_15px_rgba(204,255,0,0.3)]">
                      SÉRIE {currentSetIdx} / {sets}
                    </span>
                  </div>
                  <h1 className="monster-heading text-3xl md:text-6xl tracking-tighter leading-none px-2">{currentExercise.name}</h1>
                </div>

                <div className="flex flex-wrap justify-center gap-4 max-w-md mx-auto w-full">
                  <div className={cn(
                    "monster-card border-white/5 p-4 flex-1 min-w-[100px] flex flex-col items-center transition-all duration-300",
                    isTimerActive && !isResting ? "bg-monster-green/10 border-monster-green/50 shadow-[0_0_20px_rgba(204,255,0,0.2)]" : "bg-white/5"
                  )}>
                    <p className={cn(
                      "text-3xl font-heading font-black italic transition-colors",
                      isTimerActive && !isResting ? "text-monster-green" : "text-monster-green"
                    )}>
                      {duration > 0 ? (isTimerActive || hasStartedSet ? timeLeft : duration) : currentExercise.reps}
                    </p>
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">
                      {duration > 0 ? (isTimerPaused ? 'PAUSADO' : 'Segundos') : 'Reps'}
                    </p>
                  </div>
                  
                  {currentExercise.weight > 0 && (
                    <div className="monster-card bg-white/5 border-white/5 p-4 flex-1 min-w-[100px] flex flex-col items-center">
                      <p className="text-3xl font-heading font-black text-monster-green italic">{currentExercise.weight}</p>
                      <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">Carga (kg)</p>
                    </div>
                  )}

                  {currentExercise.restTime > 0 && (
                    <div className="monster-card bg-white/5 border-white/5 p-4 flex-1 min-w-[100px] flex flex-col items-center">
                      <p className="text-3xl font-heading font-black text-monster-green italic">{currentExercise.restTime}s</p>
                      <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">Descanso</p>
                    </div>
                  )}
                </div>

                <div className="w-full max-w-sm md:max-w-md aspect-video bg-monster-gray rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 flex items-center justify-center mx-auto overflow-hidden relative shadow-2xl">
                  <img 
                    src={`https://picsum.photos/seed/${currentExercise.name}/800/450`} 
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                    alt={currentExercise.name}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-monster-black/80 to-transparent" />
                  {!isTimerActive && duration > 0 && !hasStartedSet && (
                    <div className="bg-monster-green p-3 md:p-5 rounded-full relative z-10 shadow-[0_0_30px_rgba(204,255,0,0.5)]">
                      <Play className="w-6 h-6 md:w-10 md:h-10 text-monster-black fill-current" />
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-4 md:p-8 border-t border-white/5 bg-monster-black/90 backdrop-blur-3xl shrink-0">
        {!isResting && (
          <>
            {isTimerActive ? (
              <div className="flex gap-3 md:gap-4">
                <button 
                  onClick={togglePause}
                  className="monster-btn-secondary flex-1 flex items-center justify-center gap-3 py-4 md:py-6"
                >
                  {isTimerPaused ? (
                    <><Play className="w-5 h-5 md:w-6 md:h-6 fill-current" /> RETOMAR</>
                  ) : (
                    <><Pause className="w-5 h-5 md:w-6 md:h-6 fill-current" /> PAUSAR</>
                  )}
                </button>
                <button 
                  onClick={skipTimer}
                  className="bg-white/5 text-white p-4 md:p-6 rounded-xl md:rounded-2xl hover:bg-white/10 transition-all border border-white/5"
                >
                  <FastForward className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>
            ) : (
              <button 
                onClick={startSet}
                className="monster-btn-primary w-full flex items-center justify-center gap-3 md:gap-4 py-4 md:py-6 text-lg md:text-xl h-auto"
              >
                { (duration === 0 || (duration > 0 && hasStartedSet)) ? (
                  currentExerciseIdx === allExercises.length - 1 && currentSetIdx === sets ? (
                    <>FINALIZAR TREINO <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" /></>
                  ) : (
                    <>SÉRIE CONCLUÍDA <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" /></>
                  )
                ) : (
                  <>INICIAR SÉRIE <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" /></>
                )}
              </button>
            )}
          </>
        )}
      </div>

    </div>
  );
}
