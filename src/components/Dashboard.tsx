import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Activity, Flame, Clock, ChevronRight, Play, Trophy, TrendingUp, Repeat, X, Trash2, RotateCcw } from 'lucide-react';
import { Card } from './ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid 
} from 'recharts';
import WorkoutPlayer from './WorkoutPlayer';
import GoalDetails from './GoalDetails';

interface DashboardProps {
  user: User;
  profile: any;
}

export default function Dashboard({ user, profile }: DashboardProps) {
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [customWorkout, setCustomWorkout] = useState<any>(null);
  const [isChangingWorkout, setIsChangingWorkout] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<any>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    // Buscar treinos
    const qWorkouts = query(
      collection(db, 'workouts'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubWorkouts = onSnapshot(qWorkouts, (snapshot) => {
      const workouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentWorkouts(workouts);
      
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = days[new Date().getDay()];
      
      const muscleGroupMap: Record<string, string> = {
        'Peito/Ombro': 'Chest',
        'Costas/Braço': 'Back',
        'Pernas': 'Legs',
        'Core': 'Core',
        'Full Body': 'Full Body'
      };

      // Get translated focus areas
      const userFocusGroups = profile?.focus?.map((f: string) => muscleGroupMap[f] || f) || [];
      
      const dayMap: any = {
        'Monday': 'Legs',
        'Tuesday': 'Chest',
        'Wednesday': 'Back',
        'Thursday': 'Shoulders',
        'Friday': 'Arms',
        'Saturday': 'Full Body',
        'Sunday': 'Descanso'
      };
      
      let targetGroup = dayMap[today];
      
      // If user has preferred focus areas, try to find a workout that matches one of them first
      let suggested = workouts.find((w: any) => userFocusGroups.includes(w.muscleGroup));
      
      // If no match found in focus areas, fallback to the dayMap target
      if (!suggested) {
        suggested = workouts.find((w: any) => w.muscleGroup === targetGroup);
      }
      
      // Still nothing? just pick the most recent one
      if (!suggested && workouts.length > 0) {
        suggested = workouts[0];
      }
      
      setTodayWorkout(suggested);
    });

    // Buscar sessões para estatísticas
    const qSessions = query(
      collection(db, 'training_sessions'),
      where('uid', '==', user.uid),
      where('completed', '==', true),
      orderBy('date', 'asc')
    );

    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubWorkouts();
      unsubSessions();
    };
  }, [user.uid]);

  // Processar dados para o gráfico de frequência semanal
  const getFrequencyData = () => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('pt-BR', { weekday: 'short' });
      return { day: dateStr.toUpperCase(), count: 0, date: d.toISOString().split('T')[0] };
    }).reverse();

    sessions.forEach(s => {
      const sessionDate = s.date.split('T')[0];
      const dayData = last7Days.find(d => d.date === sessionDate);
      if (dayData) dayData.count += 1;
    });

    return last7Days;
  };

  // Processar dados para o gráfico de consistência (Volume/Minutos)
  const getConsistencyData = () => {
    const dataByDate: any = {};
    sessions.slice(-10).forEach(s => {
      const date = new Date(s.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!dataByDate[date]) {
        dataByDate[date] = { date, volume: 0, calories: 0 };
      }
      dataByDate[date].volume += s.durationMinutes || 0;
      dataByDate[date].calories += s.caloriesBurned || 0;
    });
    return Object.values(dataByDate);
  };

  const totalCalories = sessions.reduce((acc, s) => acc + (s.caloriesBurned || 0), 0);
  const totalMinutes = sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const totalWorkouts = sessions.length;
  const notifiedSessionsRef = React.useRef<Set<string>>(new Set());

  const deleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'training_sessions', sessionId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'training_sessions');
    }
  };

  const repeatWorkout = async (e: React.MouseEvent, session: any) => {
    e.stopPropagation();
    if (!session.workoutId) return;
    
    // Try to find the workout in the current list
    const existing = recentWorkouts.find(w => w.id === session.workoutId);
    if (existing) {
      setActiveWorkout(existing);
    } else {
      // If not in list, try fetching it directly
      try {
        const workoutDoc = await getDoc(doc(db, 'workouts', session.workoutId));
        if (workoutDoc.exists()) {
          setActiveWorkout({ id: workoutDoc.id, ...workoutDoc.data() });
        } else {
          alert('Este treino original foi excluído da biblioteca.');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'workouts');
      }
    }
  };

  const stats = [
    { label: 'Calorias', value: totalCalories > 1000 ? `${(totalCalories/1000).toFixed(1)}k` : totalCalories, icon: Flame, color: 'text-orange-500' },
    { label: 'Treinos', value: totalWorkouts, icon: Trophy, color: 'text-monster-green' },
    { label: 'Minutos', value: totalMinutes, icon: Clock, color: 'text-blue-500' },
  ];

  if (selectedGoal) {
    return <GoalDetails user={user} goal={selectedGoal} onBack={() => setSelectedGoal(null)} />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Status do Monstro</p>
          <h2 className="monster-heading text-4xl">
            OLÁ, <span className="text-monster-green italic">{profile?.name?.split(' ')[0] || 'MONSTRO'}</span>
          </h2>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-monster-green/20 blur-xl rounded-full" />
          <img 
            src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
            className="w-16 h-16 rounded-3xl border-2 border-monster-green relative z-10 p-0.5"
            alt="Profile"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="monster-card p-4 flex flex-col items-center justify-center border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-12 h-12 bg-white/5 rounded-bl-3xl translate-x-4 -translate-y-4 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" />
            <stat.icon className={`w-4 h-4 mb-3 ${stat.color}`} />
            <span className="text-2xl font-black font-heading italic">{stat.value}</span>
            <span className="text-[8px] text-white/20 uppercase font-black tracking-widest mt-1">{stat.label}</span>
          </Card>
        ))}
      </div>

      {/* Progress Charts Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-monster-green rounded-full" />
            <h3 className="monster-heading text-2xl tracking-tight">ANALÍTICA <span className="text-monster-green">FIT MONSTER</span></h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Frequency Bar Chart */}
          <Card className="monster-card p-6 border-white/5 bg-monster-gray/50">
            <h4 className="text-[10px] font-black uppercase text-white/20 mb-6 tracking-[0.2em] flex items-center gap-2">
              <Activity className="w-3 h-3 text-monster-green" /> Frequência Semanal
            </h4>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getFrequencyData()}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ccff00" stopOpacity={1} />
                      <stop offset="100%" stopColor="#ccff00" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#ffffff20', fontSize: 10, fontWeight: 900 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #ccff0030', borderRadius: '16px' }}
                    itemStyle={{ color: '#ccff00', fontSize: 12, fontWeight: 900 }}
                    cursor={{ fill: '#ffffff05' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="url(#barGradient)" 
                    radius={[6, 6, 0, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Consistency Line Chart */}
          <Card className="monster-card p-6 border-white/5 bg-monster-gray/50">
            <h4 className="text-[10px] font-black uppercase text-white/20 mb-6 tracking-[0.2em] flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-monster-blue" /> Volume de Treino (Min)
            </h4>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getConsistencyData()}>
                  <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#ffffff20', fontSize: 10, fontWeight: 900 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #00d1ff30', borderRadius: '16px' }}
                    itemStyle={{ color: '#00d1ff', fontSize: 12, fontWeight: 900 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="volume" 
                    stroke="#00d1ff" 
                    strokeWidth={4}
                    dot={{ fill: '#00d1ff', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                    filter="url(#glow)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </section>


      {/* Today's Workout */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black italic uppercase tracking-tight">Treino de Hoje</h3>
          {recentWorkouts.length > 0 && (
            <button 
              onClick={() => setIsChangingWorkout(!isChangingWorkout)}
              className="text-[10px] font-black text-monster-green uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity"
            >
              {isChangingWorkout ? (
                <><X className="w-3 h-3" /> CANCELAR</>
              ) : (
                <><Repeat className="w-3 h-3" /> TROCAR TREINO</>
              )}
            </button>
          )}
        </div>
        
        {isChangingWorkout ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300 mb-6">
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2">Escolha na sua biblioteca:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentWorkouts.map((workout) => (
                <Card 
                  key={workout.id}
                  onClick={() => {
                    setCustomWorkout(workout);
                    setIsChangingWorkout(false);
                  }}
                  className={`monster-card p-4 flex items-center justify-between cursor-pointer border-white/5 transition-all ${
                    (customWorkout?.id || todayWorkout?.id) === workout.id ? 'border-monster-green/50 bg-monster-green/5' : 'hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-monster-gray flex items-center justify-center overflow-hidden shrink-0">
                      <img 
                        src={`https://picsum.photos/seed/${workout.muscleGroup}/100/100`} 
                        className="w-full h-full object-cover opacity-50"
                        alt="MG"
                      />
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-sm uppercase truncate">{workout.title}</h4>
                      <p className="text-[10px] text-monster-green font-bold uppercase">{workout.muscleGroup}</p>
                    </div>
                  </div>
                  {(customWorkout?.id || todayWorkout?.id) === workout.id && (
                    <span className="text-[8px] font-black bg-monster-green text-monster-black px-2 py-0.5 rounded uppercase shrink-0">
                      {customWorkout?.id === workout.id ? 'ESCOLHIDO' : 'SUGERIDO'}
                    </span>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ) : (customWorkout || todayWorkout) ? (
          <Card 
            onClick={() => setActiveWorkout(customWorkout || todayWorkout)}
            className="monster-card overflow-hidden relative group cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-monster-black to-transparent z-10" />
            <img 
              src={`https://picsum.photos/seed/${(customWorkout || todayWorkout).muscleGroup}/800/400`} 
              className="w-full h-48 object-cover opacity-50 group-hover:scale-110 transition-transform duration-500"
              alt="Workout"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-4 right-4 z-20">
              {customWorkout && (
                <span className="bg-monster-blue text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg">
                  Personalizado
                </span>
              )}
            </div>
            <div className="absolute bottom-0 left-0 p-6 z-20 w-full">
              <div className="flex items-end justify-between">
                <div>
                  <span className="bg-monster-green text-monster-black text-[10px] font-black px-2 py-0.5 rounded uppercase mb-2 inline-block">
                    {(customWorkout || todayWorkout).muscleGroup}
                  </span>
                  <h4 className="text-2xl font-black italic uppercase">{(customWorkout || todayWorkout).title}</h4>
                </div>
                <div className="bg-monster-green p-3 rounded-full text-monster-black shadow-[0_0_20px_rgba(204,255,0,0.4)]">
                  <Play className="w-6 h-6 fill-current" />
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="monster-card p-8 text-center border-dashed border-white/5">
            <p className="text-white/40 mb-4 text-sm font-bold italic uppercase">Nenhum treino sugerido para hoje.</p>
            <p className="text-[10px] text-white/20 uppercase font-bold">Crie treinos para diferentes grupos musculares para receber sugestões.</p>
          </Card>
        )}
      </section>

      {/* Workout Player Modal */}
      {activeWorkout && (
        <WorkoutPlayer 
          workout={activeWorkout} 
          user={user} 
          onClose={() => setActiveWorkout(null)} 
        />
      )}

      {/* Categories */}
      <section>
        <h3 className="text-xl font-black italic uppercase tracking-tight mb-4 text-white/60 text-sm">Objetivos de Treino</h3>
        <div className="grid grid-cols-2 gap-4">
          {['Perda de Peso', 'Ganho de Músculo', 'HIIT/Cardio', 'Força'].map((goal) => (
            <Card 
              key={goal} 
              onClick={() => setSelectedGoal(goal)}
              className="monster-card p-4 flex items-center justify-between hover:border-monster-green/50 transition-colors cursor-pointer group"
            >
              <span className="font-bold uppercase text-xs tracking-tight">{goal}</span>
              <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-monster-green transition-colors" />
            </Card>
          ))}
        </div>
      </section>

      {/* History Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black italic uppercase tracking-tight">Histórico Recente</h3>
        </div>
        <div className="space-y-3">
          {[...sessions].reverse().slice(0, 3).map((session, idx) => (
            <Card key={session.id || idx} className="monster-card p-4 flex items-center justify-between group/card relative overflow-hidden">
              <div className="flex items-center gap-4 relative z-10">
                <div className="p-2 bg-monster-green/10 rounded-lg">
                  <Activity className="w-5 h-5 text-monster-green" />
                </div>
                <div>
                  <h4 className="font-bold text-sm uppercase truncate max-w-[120px]">{session.workoutTitle || 'Treino Concluído'}</h4>
                  <p className="text-[10px] text-white/40 font-bold uppercase">
                    {new Date(session.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="flex gap-4 text-right mr-4">
                  <div>
                    <p className="text-sm font-black text-monster-green">{session.durationMinutes}m</p>
                    <p className="text-[8px] text-white/40 uppercase font-bold">Tempo</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-black text-monster-green">{session.caloriesBurned}</p>
                    <p className="text-[8px] text-white/40 uppercase font-bold">Kcal</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => repeatWorkout(e, session)}
                    className="p-2 bg-monster-blue/10 text-monster-blue rounded-lg hover:bg-monster-blue hover:text-monster-black transition-all"
                    title="Repetir Treino"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => deleteSession(e, session.id)}
                    className="p-2 bg-monster-red/10 text-monster-red rounded-lg hover:bg-monster-red hover:text-white transition-all"
                    title="Excluir Histórico"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
          {sessions.length === 0 && (
            <p className="text-center text-white/20 py-4 italic text-sm font-bold uppercase">Nenhum histórico disponível.</p>
          )}
        </div>
      </section>
    </div>
  );
}
