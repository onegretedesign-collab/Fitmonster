import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, CheckCircle2, Clock, Plus, Trash2, Bell, Dumbbell, Sparkles, X, ChevronRight } from 'lucide-react';
import { Card } from './ui/card';
import { Calendar } from './ui/calendar';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '../lib/utils';

interface CalendarViewProps {
  user: User;
  profile: any;
}

export default function CalendarView({ user, profile }: CalendarViewProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>('');
  const [reminderTime, setReminderTime] = useState<string>('08:00');
  const [reminderMessage, setReminderMessage] = useState<string>('Bora treinar, Monstro! Sem desculpas.');
  const [isScheduling, setIsScheduling] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [planDays, setPlanDays] = useState<number[]>([]); // 0-6
  const [planGroups, setPlanGroups] = useState<string[]>([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const muscleGroups = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full Body"];
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  useEffect(() => {
    const qSessions = query(collection(db, 'training_sessions'), where('uid', '==', user.uid));
    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'training_sessions');
    });

    const qWorkouts = query(collection(db, 'workouts'), where('uid', '==', user.uid));
    const unsubWorkouts = onSnapshot(qWorkouts, (snapshot) => {
      setWorkouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubSessions();
      unsubWorkouts();
    };
  }, [user.uid]);

  const handleSchedule = async () => {
    if (!date || !selectedWorkoutId) return;
    const workout = workouts.find(w => w.id === selectedWorkoutId);
    if (!workout) return;

    try {
      await addDoc(collection(db, 'training_sessions'), {
        uid: user.uid,
        workoutId: selectedWorkoutId,
        workoutTitle: workout.title,
        date: date.toISOString(),
        completed: false,
        reminderTime,
        reminderMessage
      });
      setIsScheduling(false);
      setSelectedWorkoutId('');
      setReminderMessage('Bora treinar, Monstro! Sem desculpas.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'training_sessions');
    }
  };

  const handleAutoSchedule = async () => {
    if (planDays.length === 0 || planGroups.length === 0) return;
    setIsGeneratingPlan(true);

    try {
      const today = new Date();
      // Schedule for next 2 weeks (14 days)
      for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dayOfWeek = d.getDay();

        if (planDays.includes(dayOfWeek)) {
          // Calculate which group to use based on index of scheduled day
          const scheduledDayIdx = planDays.indexOf(dayOfWeek);
          // Just cycle through planGroups
          const groupIdx = (i + scheduledDayIdx) % planGroups.length;
          const targetGroup = planGroups[groupIdx];

          const workout = workouts.find(w => w.muscleGroup === targetGroup) || (workouts.length > 0 ? workouts[0] : null);

          if (workout) {
            await addDoc(collection(db, 'training_sessions'), {
              uid: user.uid,
              workoutId: workout.id,
              workoutTitle: workout.title,
              date: d.toISOString(),
              completed: false,
              reminderTime: '08:00',
              reminderMessage: `Dia de ${workout.muscleGroup}! Sem moleza!`
            });
          }
        }
      }
      setIsPlanning(false);
      setPlanDays([]);
      setPlanGroups([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'training_sessions');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const deleteSession = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'training_sessions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'training_sessions');
    }
  };

  const completedDates = sessions
    .filter(s => s.completed)
    .map(s => new Date(s.date));

  const scheduledDates = sessions
    .filter(s => !s.completed)
    .map(s => new Date(s.date));

  const selectedDateSessions = sessions.filter(s => {
    if (!date) return false;
    const sDate = new Date(s.date);
    return sDate.toDateString() === date.toDateString();
  });

  return (
    <div className="space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Agenda de <span className="text-monster-green">Treinos</span></h2>
        <button 
          onClick={() => setIsPlanning(!isPlanning)}
          className="flex items-center gap-2 px-4 py-2 bg-monster-green/10 text-monster-green rounded-xl font-black text-[10px] uppercase tracking-widest border border-monster-green/20 hover:bg-monster-green hover:text-monster-black transition-all"
        >
          {isPlanning ? <X className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          {isPlanning ? 'FECHAR PLANEJADOR' : 'PLANEJAR SEMANA'}
        </button>
      </div>

      <AnimatePresence>
        {isPlanning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="monster-card p-6 bg-monster-gray/50 border-monster-green/30 space-y-8">
              <div>
                <h4 className="monster-heading text-xl mb-4">PLANEJADOR <span className="text-monster-green">MONSTER</span></h4>
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest leading-relaxed">
                  Gere um cronograma automático de 2 semanas baseado nas partes que você deseja focar.
                </p>
              </div>

              {/* Day Selection */}
              <div className="space-y-4">
                <Label className="text-[10px] uppercase font-black text-monster-green ml-2">Escolha os dias de Treino</Label>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day, idx) => (
                    <button
                      key={day}
                      onClick={() => setPlanDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx])}
                      className={cn(
                        "h-12 rounded-xl font-black text-xs transition-all border",
                        planDays.includes(idx) 
                          ? "bg-monster-green text-monster-black border-monster-green shadow-[0_0_10px_rgba(204,255,0,0.3)]" 
                          : "bg-monster-black border-white/5 text-white/40"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Part Selection */}
              <div className="space-y-4">
                <Label className="text-[10px] uppercase font-black text-monster-green ml-2">Escolha as partes do corpo</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {muscleGroups.map((group) => (
                    <button
                      key={group}
                      onClick={() => setPlanGroups(prev => prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group])}
                      className={cn(
                        "py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all border",
                        planGroups.includes(group) 
                          ? "bg-monster-blue text-white border-monster-blue shadow-[0_0_10px_rgba(0,209,255,0.3)]" 
                          : "bg-monster-black border-white/5 text-white/40"
                      )}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleAutoSchedule}
                disabled={planDays.length === 0 || planGroups.length === 0 || isGeneratingPlan}
                className="monster-btn-primary w-full py-4 text-sm flex items-center justify-center gap-2"
              >
                {isGeneratingPlan ? (
                  <>GERANDO PLANO...</>
                ) : (
                  <>GERAR CRONOGRAMA AUTOMÁTICO <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="monster-card p-4 bg-monster-gray">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border-none text-white w-full"
          modifiers={{ 
            completed: completedDates,
            scheduled: scheduledDates,
            selected: date ? [date] : []
          }}
          modifiersStyles={{
            completed: { backgroundColor: '#CCFF00', color: '#000', fontWeight: 'bold', borderRadius: '50%' },
            scheduled: { border: '2px solid #CCFF00', color: '#CCFF00', fontWeight: 'bold', borderRadius: '50%' },
            selected: { backgroundColor: '#CCFF00', color: '#000', fontWeight: 'bold', borderRadius: '50%' }
          }}
        />
      </Card>

      {date && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black italic uppercase tracking-tight text-white/60">
              {date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
            </h3>
            <button 
              onClick={() => setIsScheduling(!isScheduling)}
              className="p-2 bg-monster-green text-monster-black rounded-xl shadow-[0_0_15px_rgba(204,255,0,0.3)]"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <AnimatePresence>
            {isScheduling && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Card className="monster-card p-6 space-y-6 border-monster-green/20">
                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase font-bold text-white/40">Selecionar Treino</Label>
                    <ScrollArea className="h-48 pr-4">
                      <div className="grid gap-3">
                        {workouts.map((w) => (
                          <button
                            key={w.id}
                            onClick={() => setSelectedWorkoutId(w.id)}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                              selectedWorkoutId === w.id 
                                ? "bg-monster-green text-monster-black border-monster-green shadow-[0_0_15px_rgba(204,255,0,0.2)]" 
                                : "bg-monster-black border-white/5 text-white hover:border-monster-green/30"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Dumbbell className={`w-4 h-4 ${selectedWorkoutId === w.id ? 'text-monster-black' : 'text-monster-green'}`} />
                              <div>
                                <p className="font-bold text-sm uppercase leading-none">{w.title}</p>
                                <p className={`text-[8px] font-bold uppercase mt-1 ${selectedWorkoutId === w.id ? 'text-monster-black/60' : 'text-white/40'}`}>
                                  {w.muscleGroup}
                                </p>
                              </div>
                            </div>
                            {selectedWorkoutId === w.id && <CheckCircle2 className="w-4 h-4" />}
                          </button>
                        ))}
                        {workouts.length === 0 && (
                          <p className="text-center text-white/20 py-4 text-xs font-bold uppercase">Crie um treino primeiro</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-white/40">Horário</Label>
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-monster-green" />
                        <Input 
                          type="time" 
                          value={reminderTime}
                          onChange={(e) => setReminderTime(e.target.value)}
                          className="bg-monster-black border-white/10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-white/40">Lembrete</Label>
                      <Input 
                        type="text" 
                        value={reminderMessage}
                        onChange={(e) => setReminderMessage(e.target.value)}
                        placeholder="Mensagem do lembrete"
                        className="bg-monster-black border-white/10 text-xs"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleSchedule}
                    disabled={!selectedWorkoutId}
                    className="monster-btn-primary w-full disabled:opacity-50"
                  >
                    AGENDAR TREINO
                  </button>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {selectedDateSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-monster-gray rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${session.completed ? 'bg-monster-green/10' : 'bg-blue-500/10'}`}>
                    {session.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-monster-green" />
                    ) : (
                      <Bell className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm uppercase">{session.workoutTitle}</p>
                    <div className="flex items-center gap-2">
                      <p className={`text-[10px] font-bold uppercase ${session.completed ? 'text-monster-green' : 'text-blue-500'}`}>
                        {session.completed ? 'Concluído' : 'Agendado'}
                      </p>
                      {session.reminderTime && !session.completed && (
                        <p className="text-[10px] text-white/40 font-bold uppercase flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {session.reminderTime}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => deleteSession(session.id)}
                  className="text-white/10 hover:text-monster-red transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {selectedDateSessions.length === 0 && (
              <p className="text-center text-white/20 py-8 italic text-sm">Nenhuma atividade para este dia.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
