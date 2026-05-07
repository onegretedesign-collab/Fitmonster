import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Play, Dumbbell, Target, Trophy, Flame, Clock } from 'lucide-react';
import { Card } from './ui/card';
import WorkoutPlayer from './WorkoutPlayer';

interface GoalDetailsProps {
  user: User;
  goal: string;
  onBack: () => void;
}

const goalContent: any = {
  'Perda de Peso': {
    title: 'Foco em Queima Calórica',
    desc: 'Treinos de alta intensidade e volume para maximizar o gasto energético.',
    tips: ['Mantenha o descanso curto (30-45s)', 'Foque em movimentos compostos', 'Beba muita água durante o treino'],
    muscleGroups: ['Corpo Todo', 'Pernas', 'HIIT/Cardio']
  },
  'Ganho de Músculo': {
    title: 'Hipertrofia Fit Monster',
    desc: 'Foco em tensão mecânica e estresse metabólico para crescimento máximo.',
    tips: ['Controle a descida do peso (excêntrica)', 'Busque a falha técnica', 'Descanse 60-90s entre séries'],
    muscleGroups: ['Peito', 'Costas', 'Braços', 'Ombros']
  },
  'HIIT/Cardio': {
    title: 'Explosão e Condicionamento',
    desc: 'Melhore sua capacidade cardiovascular e resistência.',
    tips: ['Dê 100% nos intervalos ativos', 'Mantenha a postura mesmo cansado', 'Use o monitor cardíaco se possível'],
    muscleGroups: ['Corpo Todo', 'Core']
  },
  'Força': {
    title: 'Poder Absoluto',
    desc: 'Treinos focados em progressão de carga e força máxima.',
    tips: ['Descanse 2-3 minutos entre séries', 'Foque na técnica perfeita', 'Use cargas acima de 80% do seu máximo'],
    muscleGroups: ['Pernas', 'Peito', 'Costas']
  }
};

export default function GoalDetails({ user, goal, onBack }: GoalDetailsProps) {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<any>(null);
  const content = goalContent[goal] || goalContent['Perda de Peso'];

  useEffect(() => {
    const q = query(
      collection(db, 'workouts'),
      where('uid', '==', user.uid),
      where('muscleGroup', 'in', content.muscleGroups)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWorkouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workouts');
    });

    return () => unsubscribe();
  }, [user.uid, goal]);

  return (
    <div className="space-y-8 pb-24">
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 font-bold uppercase text-xs hover:text-monster-green transition-colors">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="space-y-2">
        <h2 className="text-4xl font-black italic uppercase tracking-tighter">{goal}</h2>
        <p className="text-monster-green font-bold uppercase text-xs tracking-widest">{content.title}</p>
      </div>

      <div className="grid gap-4">
        <Card className="monster-card border-monster-green/20 bg-monster-green/5">
          <p className="text-sm text-white/80 leading-relaxed">{content.desc}</p>
        </Card>
        
        <button 
          onClick={() => {
            const el = document.getElementById('workout-selection');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="monster-btn-primary w-full py-4 flex items-center justify-center gap-3 text-lg"
        >
          <Play className="w-5 h-5 fill-current" /> COMEÇAR TREINO AGORA
        </button>
      </div>

      <section className="space-y-4">
        <h3 className="text-xl font-black italic uppercase tracking-tight text-white/60">Dicas Monster</h3>
        <div className="grid gap-3">
          {content.tips.map((tip: string, i: number) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-monster-gray rounded-xl border border-white/5">
              <div className="w-2 h-2 bg-monster-green rounded-full" />
              <p className="text-sm font-bold">{tip}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="workout-selection" className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black italic uppercase tracking-tight text-white/60">Escolha seu Treino</h3>
          <span className="text-[10px] font-bold text-monster-green uppercase tracking-widest">{workouts.length} Disponíveis</span>
        </div>
        <div className="grid gap-4">
          {workouts.map((workout) => (
            <Card 
              key={workout.id} 
              onClick={() => setActiveWorkout(workout)}
              className="monster-card p-5 group cursor-pointer hover:border-monster-green/50 transition-all relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-monster-green/0 group-hover:bg-monster-green/5 transition-colors" />
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-monster-black rounded-xl text-monster-green group-hover:scale-110 transition-transform">
                    <Dumbbell className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-monster-green text-[10px] font-black uppercase tracking-widest">{workout.muscleGroup}</span>
                    <h4 className="text-lg font-black italic uppercase">{workout.title}</h4>
                    <p className="text-[10px] text-white/40 font-bold uppercase mt-1">{workout.exercises?.length || 0} Exercícios</p>
                  </div>
                </div>
                <div className="bg-monster-green/10 p-2 rounded-full text-monster-green group-hover:bg-monster-green group-hover:text-monster-black transition-all">
                  <Play className="w-5 h-5 fill-current" />
                </div>
              </div>
            </Card>
          ))}
          {workouts.length === 0 && (
            <div className="text-center py-12 monster-card border-dashed">
              <p className="text-white/40 text-sm font-bold uppercase">Nenhum treino de {content.muscleGroups.join('/')} encontrado.</p>
              <p className="text-[10px] text-white/20 uppercase mt-2">Crie treinos nestas categorias para vê-los aqui.</p>
            </div>
          )}
        </div>
      </section>

      {activeWorkout && (
        <WorkoutPlayer 
          workout={activeWorkout} 
          user={user} 
          onClose={() => setActiveWorkout(null)} 
        />
      )}
    </div>
  );
}
