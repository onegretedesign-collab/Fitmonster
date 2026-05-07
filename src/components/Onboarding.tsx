import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { ChevronRight, ChevronLeft, Dumbbell, Target, Calendar, Trophy } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';

interface OnboardingProps {
  user: any;
  onComplete: () => void;
}

const DEFAULT_EXERCISES: Record<string, any[]> = {
  'Peito/Ombro': [
    { name: 'Supino Reto', sets: 4, reps: 10, weight: 20, restTime: 60 },
    { name: 'Desenvolvimento Militar', sets: 3, reps: 12, weight: 10, restTime: 60 },
    { name: 'Flexão de Braços', sets: 3, reps: 15, weight: 0, restTime: 45 },
  ],
  'Costas/Braço': [
    { name: 'Remada Curvada', sets: 4, reps: 10, weight: 15, restTime: 60 },
    { name: 'Rosca Direta', sets: 3, reps: 12, weight: 8, restTime: 45 },
    { name: 'Tríceps Corda', sets: 3, reps: 12, weight: 10, restTime: 45 },
  ],
  'Pernas': [
    { name: 'Agachamento Livre', sets: 4, reps: 12, weight: 20, restTime: 90 },
    { name: 'Leg Press', sets: 3, reps: 15, weight: 60, restTime: 60 },
    { name: 'Afundo', sets: 3, reps: 12, weight: 0, restTime: 60 },
  ],
  'Core': [
    { name: 'Prancha Abdominal', sets: 3, reps: 0, duration: 45, restTime: 30 },
    { name: 'Abdominal Supra', sets: 3, reps: 20, weight: 0, restTime: 30 },
    { name: 'Elevação de Pernas', sets: 3, reps: 15, weight: 0, restTime: 30 },
  ],
  'Full Body': [
    { name: 'Burpees', sets: 3, reps: 12, weight: 0, restTime: 60 },
    { name: 'Mountain Climbers', sets: 3, reps: 0, duration: 30, restTime: 30 },
    { name: 'Agachamento com Salto', sets: 3, reps: 15, weight: 0, restTime: 45 },
  ],
};

export default function Onboarding({ user, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    goal: '',
    level: '',
    daysPerWeek: 3,
    focus: [] as string[],
    weightInitial: '',
    height: ''
  });

  const [error, setError] = useState<string | null>(null);

  const goals = [
    { id: 'Perda de Peso', label: 'Perda de Peso', icon: Target },
    { id: 'Ganho de Músculo', label: 'Ganho de Músculo', icon: Dumbbell },
    { id: 'HIIT/Cardio', label: 'HIIT/Cardio', icon: Activity },
    { id: 'Força', label: 'Força', icon: Trophy },
  ];

  const levels = [
    { id: 'Iniciante', label: 'Iniciante (0-6 meses)', desc: 'ESTOU COMEÇANDO AGORA' },
    { id: 'Intermediário', label: 'Intermediário (6-24 meses)', desc: 'JÁ TREINO COM FREQUÊNCIA' },
    { id: 'Avançado', label: 'Avançado (2+ anos)', desc: 'TREINO PESADO HÁ ANOS' },
  ];

  const focusAreas = [
    { id: 'Peito/Ombro', label: 'Peito e Ombros' },
    { id: 'Costas/Braço', label: 'Costas e Braços' },
    { id: 'Pernas', label: 'Pernas Completas' },
    { id: 'Core', label: 'Abdômen e Core' },
    { id: 'Full Body', label: 'Corpo Inteiro' },
  ];

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const toggleFocus = (id: string) => {
    setFormData(prev => ({
      ...prev,
      focus: prev.focus.includes(id) 
        ? prev.focus.filter(f => f !== id)
        : [...prev.focus, id]
    }));
  };

  const handleFinish = async () => {
    setError(null);
    const weight = Number(formData.weightInitial);
    const height = Number(formData.height);

    if (isNaN(weight) || weight < 20 || weight > 500) {
      setError('Peso inválido (20kg - 500kg)');
      return;
    }
    if (isNaN(height) || height < 50 || height > 250) {
      setError('Altura inválida (50cm - 250cm)');
      return;
    }

    setIsGenerating(true);
    try {
      // 1. Update user profile
      await updateDoc(doc(db, 'users', user.uid), {
        ...formData,
        weightInitial: weight,
        height: height,
        onboardingComplete: true
      });

      // 2. Generate initial workouts based on focus areas
      for (const areaId of formData.focus) {
        const exercises = DEFAULT_EXERCISES[areaId] || [];
        const muscleGroupMap: Record<string, string> = {
          'Peito/Ombro': 'Chest',
          'Costas/Braço': 'Back',
          'Pernas': 'Legs',
          'Core': 'Core',
          'Full Body': 'Full Body'
        };

        const workoutData = {
          uid: user.uid,
          title: `Plano Inicial: ${areaId}`,
          muscleGroup: muscleGroupMap[areaId] || 'Full Body',
          exercises: exercises,
          warmups: [
            { name: 'Polichinelos', sets: 2, reps: 30, restTime: 30 },
            { name: 'Mobilidade Articular', sets: 1, reps: 10, restTime: 0 }
          ],
          createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'workouts'), workoutData);
      }

      onComplete();
    } catch (error) {
      console.error("Erro ao salvar onboarding:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-monster-black z-50 flex flex-col p-6 overflow-y-auto font-sans">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        {/* Progress Bar */}
        <div className="flex gap-2 mb-12">
          {[1, 2, 3, 4, 5].map(i => (
            <div 
              key={i} 
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-monster-green shadow-[0_0_10px_rgba(204,255,0,0.5)]' : 'bg-white/5'}`} 
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h2 className="monster-heading text-5xl">QUAL O SEU <br/><span className="text-monster-green italic">Objetivo?</span></h2>
                <p className="text-white/20 mt-4 font-black uppercase text-[10px] tracking-[0.2em]">Personalize sua jornada monster</p>
              </div>
              <div className="grid gap-3">
                {goals.map(g => (
                  <button
                    key={g.id}
                    onClick={() => { setFormData({ ...formData, goal: g.id }); handleNext(); }}
                    className={`monster-card p-6 flex items-center justify-between group transition-all duration-300 ${formData.goal === g.id ? 'border-monster-green bg-monster-green/5' : 'hover:border-monster-green/30'}`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`p-3 rounded-xl transition-colors ${formData.goal === g.id ? 'bg-monster-green text-monster-black shadow-[0_0_15px_rgba(204,255,0,0.3)]' : 'bg-white/5 text-white/30 group-hover:text-white'}`}>
                        <g.icon className="w-6 h-6" />
                      </div>
                      <span className="font-heading font-bold uppercase italic tracking-tight text-xl">{g.label}</span>
                    </div>
                    <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${formData.goal === g.id ? 'text-monster-green' : 'text-white/10'}`} />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h2 className="monster-heading text-5xl">SEU NÍVEL DE <br/><span className="text-monster-green italic">Experiência?</span></h2>
              </div>
              <div className="grid gap-3">
                {levels.map(l => (
                  <button
                    key={l.id}
                    onClick={() => { setFormData({ ...formData, level: l.id }); handleNext(); }}
                    className={`monster-card p-6 text-left group transition-all duration-300 ${formData.level === l.id ? 'border-monster-green bg-monster-green/5' : 'hover:border-monster-green/30'}`}
                  >
                    <p className="font-heading font-black italic uppercase text-2xl tracking-tighter">{l.label}</p>
                    <p className="text-white/20 text-[10px] font-black tracking-widest uppercase mt-1">{l.desc}</p>
                  </button>
                ))}
              </div>
              <button onClick={handleBack} className="text-white/20 font-black uppercase text-[10px] flex items-center gap-2 tracking-widest hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h2 className="monster-heading text-5xl">QUANTOS DIAS <br/><span className="text-monster-green italic">Por semana?</span></h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[2, 3, 4, 5, 6, 7].map(d => (
                  <button
                    key={d}
                    onClick={() => { setFormData({ ...formData, daysPerWeek: d }); handleNext(); }}
                    className={`monster-card p-6 text-center transition-all duration-300 ${formData.daysPerWeek === d ? 'border-monster-green bg-monster-green text-monster-black shadow-[0_0_20px_rgba(204,255,0,0.3)]' : 'hover:border-monster-green/30'}`}
                  >
                    <span className="text-4xl font-heading font-black italic">{d} DIAS</span>
                  </button>
                ))}
              </div>
              <button onClick={handleBack} className="text-white/20 font-black uppercase text-[10px] flex items-center gap-2 tracking-widest hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h2 className="monster-heading text-5xl">ÁREA DE <br/><span className="text-monster-green italic">Foco?</span></h2>
                <p className="text-white/20 mt-2 font-black uppercase text-[10px]">Escolha uma ou mais áreas</p>
              </div>
              <div className="grid gap-3">
                {focusAreas.map(f => (
                  <button
                    key={f.id}
                    onClick={() => toggleFocus(f.id)}
                    className={`monster-card p-6 text-left group transition-all duration-300 ${formData.focus.includes(f.id) ? 'border-monster-green bg-monster-green/5' : 'hover:border-monster-green/30'}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-heading font-black italic uppercase text-2xl tracking-tighter">{f.label}</p>
                      {formData.focus.includes(f.id) && (
                        <div className="w-6 h-6 bg-monster-green rounded-full flex items-center justify-center">
                          <ChevronRight className="w-4 h-4 text-monster-black rotate-90" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="pt-4 space-y-4">
                <button 
                  onClick={handleNext}
                  disabled={formData.focus.length === 0}
                  className="monster-btn-primary w-full py-6 text-xl disabled:opacity-20"
                >
                  CONTINUAR
                </button>
                <button onClick={handleBack} className="w-full text-white/20 font-black uppercase text-[10px] flex items-center justify-center gap-2 tracking-widest hover:text-white transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </button>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div 
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h2 className="monster-heading text-5xl">QUASE <br/><span className="text-monster-green italic">Lá, Monstro!</span></h2>
                <p className="text-white/20 mt-4 font-black uppercase text-[10px] tracking-[0.2em]">Últimos detalhes do seu perfil</p>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-white/40 ml-4">Peso Atual (kg)</Label>
                  <Input 
                    type="number"
                    value={formData.weightInitial}
                    onChange={(e) => setFormData({ ...formData, weightInitial: e.target.value })}
                    className="bg-monster-gray border-white/5 h-20 text-3xl font-heading font-black rounded-3xl px-8 focus:border-monster-green transition-colors focus:ring-0"
                    placeholder="00.0"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-white/40 ml-4">Altura (cm)</Label>
                  <Input 
                    type="number"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className="bg-monster-gray border-white/5 h-20 text-3xl font-heading font-black rounded-3xl px-8 focus:border-monster-green transition-colors focus:ring-0"
                    placeholder="175"
                  />
                </div>
              </div>
              
              {error && (
                <div className="text-monster-red text-[10px] font-black uppercase text-center animate-pulse tracking-widest">
                  {error}
                </div>
              )}

              <div className="pt-8 space-y-6">
                <button 
                  onClick={handleFinish}
                  disabled={!formData.weightInitial || !formData.height || isGenerating}
                  className="monster-btn-primary w-full py-6 text-xl disabled:opacity-20 disabled:grayscale"
                >
                  {isGenerating ? 'GERANDO PLANO MONSTRO...' : 'GERAR PLANO MONSTRO'}
                </button>
                <button onClick={handleBack} className="w-full text-white/20 font-black uppercase text-[10px] flex items-center justify-center gap-2 tracking-widest hover:text-white transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Voltar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Helper icon for HIIT
function Activity(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}
