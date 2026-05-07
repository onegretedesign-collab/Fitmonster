import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Plus, Trash2, Dumbbell, Save, X, Flame, Edit2, AlertTriangle } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface WorkoutBuilderProps {
  user: User;
}

export default function WorkoutBuilder({ user }: WorkoutBuilderProps) {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('Full Body');
  const [warmups, setWarmups] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  
  const [newWarmupName, setNewWarmupName] = useState('');
  const [newWarmupSets, setNewWarmupSets] = useState('2');
  const [newWarmupReps, setNewWarmupReps] = useState('15');
  const [newWarmupRest, setNewWarmupRest] = useState('30');

  const [newExName, setNewExName] = useState('');
  const [newExSets, setNewExSets] = useState('3');
  const [newExReps, setNewExReps] = useState('10');
  const [newExWeight, setNewExWeight] = useState('0');
  const [newExDuration, setNewExDuration] = useState('0');
  const [newExRest, setNewExRest] = useState('60');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'workouts'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWorkouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workouts');
    });
    return () => unsubscribe();
  }, [user.uid]);

  const addWarmup = () => {
    setError(null);
    if (!newWarmupName) {
      setError('Dê um nome ao aquecimento.');
      return;
    }
    
    const sets = Number(newWarmupSets);
    const reps = Number(newWarmupReps);
    const rest = Number(newWarmupRest);

    if (isNaN(sets) || sets < 1 || sets > 10) {
      setError('Séries de aquecimento devem ser entre 1 e 10.');
      return;
    }

    setWarmups([...warmups, {
      name: newWarmupName,
      sets,
      reps: isNaN(reps) ? 0 : reps,
      restTime: isNaN(rest) ? 0 : rest
    }]);
    setNewWarmupName('');
    setNewWarmupSets('2');
    setNewWarmupReps('15');
    setNewWarmupRest('30');
  };

  const removeWarmup = (index: number) => {
    setWarmups(warmups.filter((_, i) => i !== index));
  };

  const addExercise = () => {
    setError(null);
    if (!newExName) {
      setError('Dê um nome ao exercício.');
      return;
    }

    const sets = Number(newExSets);
    const reps = Number(newExReps);
    const weight = Number(newExWeight);
    const duration = Number(newExDuration);
    const rest = Number(newExRest);

    if (isNaN(sets) || sets < 1 || sets > 20) {
      setError('Séries devem ser entre 1 e 20.');
      return;
    }

    if (isNaN(reps) && isNaN(duration)) {
      setError('Insira repetições ou duração.');
      return;
    }

    setExercises([...exercises, { 
      name: newExName, 
      sets, 
      reps: isNaN(reps) ? 0 : reps, 
      duration: isNaN(duration) ? 0 : duration,
      restTime: isNaN(rest) ? 0 : rest,
      weight: isNaN(weight) ? 0 : weight 
    }]);
    setNewExName('');
    setNewExSets('3');
    setNewExReps('10');
    setNewExWeight('0');
    setNewExDuration('0');
    setNewExRest('60');
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const editWorkout = (workout: any) => {
    setEditingId(workout.id);
    setTitle(workout.title);
    setMuscleGroup(workout.muscleGroup);
    setWarmups(workout.warmups || []);
    setExercises(workout.exercises || []);
    setIsCreating(true);
  };

  const resetForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setTitle('');
    setMuscleGroup('Full Body');
    setWarmups([]);
    setExercises([]);
  };

  const saveWorkout = async () => {
    setError(null);
    if (!title.trim()) {
      setError('O treino precisa de um título.');
      return;
    }
    if (exercises.length === 0 && warmups.length === 0) {
      setError('Adicione pelo menos um exercício ou aquecimento.');
      return;
    }

    try {
      const workoutData = {
        uid: user.uid,
        title,
        muscleGroup,
        warmups,
        exercises,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'workouts', editingId), workoutData);
      } else {
        await addDoc(collection(db, 'workouts'), {
          ...workoutData,
          createdAt: new Date().toISOString()
        });
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'workouts');
    }
  };

  const deleteWorkout = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'workouts', deleteId));
      setDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'workouts');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Meus <span className="text-monster-green">Treinos</span></h2>
        <button 
          onClick={() => { resetForm(); setIsCreating(true); }}
          className="bg-monster-green text-monster-black p-2 rounded-xl shadow-[0_0_15px_rgba(204,255,0,0.3)]"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {isCreating ? (
        <Card className="monster-card space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black italic uppercase">{editingId ? 'Editar Treino Monster' : 'Novo Treino Monster'}</h3>
            <button onClick={resetForm} className="text-white/40"><X /></button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-white/40">Título do Treino</Label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Destruição de Segunda"
                className="bg-monster-black border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-white/40">Área de Foco</Label>
              <Select onValueChange={setMuscleGroup} value={muscleGroup}>
                <SelectTrigger className="bg-monster-black border-white/10 text-white">
                  <SelectValue placeholder="Selecione o Grupo Muscular" />
                </SelectTrigger>
                <SelectContent className="bg-monster-gray border-white/10 text-white">
                  {["Peito", "Costas", "Pernas", "Ombros", "Braços", "Core", "Corpo Todo"].map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase font-bold text-monster-green">Aquecimento (Warm-up)</Label>
              </div>
              <div className="space-y-3">
                <Input 
                  value={newWarmupName} 
                  onChange={(e) => setNewWarmupName(e.target.value)}
                  placeholder="Nome do aquecimento..."
                  className="bg-monster-black border-white/10 text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[8px] uppercase font-bold text-white/20">Séries</Label>
                    <Input 
                      type="number"
                      value={newWarmupSets} 
                      onChange={(e) => setNewWarmupSets(e.target.value)}
                      className="bg-monster-black border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[8px] uppercase font-bold text-white/20">Reps</Label>
                    <Input 
                      type="number"
                      value={newWarmupReps} 
                      onChange={(e) => setNewWarmupReps(e.target.value)}
                      className="bg-monster-black border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[8px] uppercase font-bold text-white/20">Descanso (seg)</Label>
                    <Input 
                      type="number"
                      value={newWarmupRest} 
                      onChange={(e) => setNewWarmupRest(e.target.value)}
                      className="bg-monster-black border-white/10 text-white"
                    />
                  </div>
                </div>
                <button 
                  onClick={addWarmup} 
                  className="monster-btn-primary w-full py-2 flex items-center justify-center gap-2 bg-white/10 text-white hover:bg-white/20"
                >
                  <Plus className="w-4 h-4" /> ADICIONAR AQUECIMENTO
                </button>
              </div>

              {warmups.length > 0 && (
                <div className="space-y-2">
                  {warmups.map((wu, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-monster-black/40 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <div>
                          <p className="font-bold text-sm text-white">{wu.name}</p>
                          <p className="text-[10px] text-white/40 font-bold uppercase">
                            {wu.sets} séries x {wu.reps} reps
                            {wu.restTime > 0 && ` • ${wu.restTime}s descanso`}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => removeWarmup(idx)} className="text-monster-red/60 hover:text-monster-red transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <Label className="text-[10px] uppercase font-bold text-monster-green">Exercícios Principais</Label>
              <div className="space-y-3">
                <Input 
                  value={newExName} 
                  onChange={(e) => setNewExName(e.target.value)}
                  placeholder="Nome do exercício..."
                  className="bg-monster-black border-white/10 text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[8px] uppercase font-bold text-white/20">Séries</Label>
                    <Input 
                      type="number"
                      value={newExSets} 
                      onChange={(e) => setNewExSets(e.target.value)}
                      className="bg-monster-black border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[8px] uppercase font-bold text-white/20">Reps</Label>
                    <Input 
                      type="number"
                      value={newExReps} 
                      onChange={(e) => setNewExReps(e.target.value)}
                      className="bg-monster-black border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[8px] uppercase font-bold text-white/20">Peso (kg)</Label>
                    <Input 
                      type="number"
                      value={newExWeight} 
                      onChange={(e) => setNewExWeight(e.target.value)}
                      className="bg-monster-black border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[8px] uppercase font-bold text-white/20">Tempo (seg)</Label>
                    <Input 
                      type="number"
                      value={newExDuration} 
                      onChange={(e) => setNewExDuration(e.target.value)}
                      className="bg-monster-black border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[8px] uppercase font-bold text-white/20">Descanso (seg)</Label>
                    <Input 
                      type="number"
                      value={newExRest} 
                      onChange={(e) => setNewExRest(e.target.value)}
                      className="bg-monster-black border-white/10 text-white"
                    />
                  </div>
                </div>
                <button 
                  onClick={addExercise} 
                  className="monster-btn-primary w-full py-2 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> ADICIONAR EXERCÍCIO
                </button>
              </div>

              <ScrollArea className="h-48 pr-4">
                <div className="space-y-3">
                  {exercises.map((ex, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-monster-black rounded-xl border border-white/5">
                      <div className="flex items-center gap-3 text-white">
                        <Dumbbell className="w-4 h-4 text-monster-green" />
                        <div>
                          <p className="font-bold text-sm">{ex.name}</p>
                          <p className="text-[10px] text-white/40 font-bold uppercase">
                            {ex.sets} séries x {ex.duration > 0 ? `${ex.duration}s` : `${ex.reps} reps`} 
                            {ex.weight > 0 && ` • ${ex.weight}kg`}
                            {ex.restTime > 0 && ` • ${ex.restTime}s descanso`}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => removeExercise(idx)} className="text-monster-red/60 hover:text-monster-red transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {error && (
              <div className="p-3 bg-monster-red/10 border border-monster-red/30 rounded-xl text-monster-red text-xs font-black uppercase tracking-widest animate-pulse flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button 
              onClick={saveWorkout}
              className="monster-btn-primary w-full flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" /> {editingId ? 'ATUALIZAR TREINO' : 'SALVAR TREINO'}
            </button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workouts.map((workout) => (
            <Card key={workout.id} className="monster-card p-5 group flex items-start justify-between">
              <div>
                <span className="text-monster-green text-[10px] font-black uppercase tracking-widest">{workout.muscleGroup}</span>
                <h4 className="text-xl font-black italic uppercase mt-1 text-white">{workout.title}</h4>
                <p className="text-white/40 text-xs mt-2 font-bold uppercase">{workout.exercises.length} Exercícios</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => editWorkout(workout)}
                  className="text-white/10 hover:text-monster-green transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setDeleteId(workout.id)}
                  className="text-white/10 hover:text-monster-red transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </Card>
          ))}
          {workouts.length === 0 && (
            <div className="text-center py-12 opacity-20">
              <Dumbbell className="w-12 h-12 mx-auto mb-4 text-white" />
              <p className="font-bold uppercase tracking-widest text-white">Nenhum treino encontrado</p>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-monster-gray border-white/10 text-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-monster-red mb-2">
              <AlertTriangle className="w-6 h-6" />
              <AlertDialogTitle className="monster-heading text-2xl">DELETAR TREINO?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-white/60 font-medium">
              Você tem certeza que deseja excluir permanentemente este treino? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel 
              variant="secondary"
              size="default"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white rounded-xl"
            >
              CANCELAR
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteWorkout}
              className="bg-monster-red text-white hover:bg-monster-red/80 font-black rounded-xl"
            >
              CONFIRMAR EXCLUSÃO
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
