import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, orderBy, limit } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Scale, Droplets, TrendingUp, Plus, Calculator, Smartphone, RefreshCw, Activity, Flame, Heart } from 'lucide-react';
import { healthService, SyncStatus, HealthData } from '../services/healthIntegrationService';
import { cn } from '../lib/utils';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HealthStatsProps {
  user: User;
  profile: any;
}

export default function HealthStats({ user, profile }: HealthStatsProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [weight, setWeight] = useState('');
  const [glucose, setGlucose] = useState('');
  const [height, setHeight] = useState(profile?.height || '');
  const [imc, setImc] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.NOT_CONNECTED);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleConnect = async () => {
    setIsSyncing(true);
    const status = await healthService.connect();
    setSyncStatus(status);
    if (status === SyncStatus.CONNECTED) {
      const data = await healthService.fetchDailyStats();
      setHealthData(data);
    }
    setIsSyncing(false);
  };

  const handleRefresh = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const data = await healthService.fetchDailyStats();
    setHealthData(data);
    setTimeout(() => setIsSyncing(false), 1000);
  };

  useEffect(() => {
    const q = query(
      collection(db, 'health_logs'),
      where('uid', '==', user.uid),
      orderBy('date', 'asc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        formattedDate: new Date(doc.data().date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }));
      setLogs(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'health_logs');
    });

    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    if (weight && height) {
      const h = parseFloat(height) / 100;
      const w = parseFloat(weight);
      if (h > 0 && w > 0) {
        setImc(parseFloat((w / (h * h)).toFixed(1)));
      }
    }
  }, [weight, height]);

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!weight && !glucose) {
      setError('Insira ao menos um valor para salvar.');
      return;
    }

    const w = weight ? parseFloat(weight) : null;
    const g = glucose ? parseFloat(glucose) : null;

    if (w !== null && (isNaN(w) || w < 20 || w > 500)) {
      setError('Peso inválido (20kg - 500kg).');
      return;
    }

    if (g !== null && (isNaN(g) || g < 20 || g > 600)) {
      setError('Glicemia inválida (20 - 600 mg/dL).');
      return;
    }

    try {
      await addDoc(collection(db, 'health_logs'), {
        uid: user.uid,
        weight: w,
        glucose: g,
        date: new Date().toISOString()
      });
      setWeight('');
      setGlucose('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'health_logs');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Monitor de <span className="text-monster-green">Saúde</span></h2>
        
        {syncStatus === SyncStatus.CONNECTED && (
          <button 
            onClick={handleRefresh}
            disabled={isSyncing}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 bg-monster-green/5 text-monster-green rounded-lg text-[10px] font-black uppercase tracking-widest border border-monster-green/20 transition-all",
              isSyncing && "animate-pulse"
            )}
          >
            <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin")} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        )}
      </div>

      {/* Health Connect / Google Fit Integration */}
      <Card className={cn(
          "monster-card relative overflow-hidden transition-all duration-500",
          syncStatus === SyncStatus.CONNECTED ? "border-monster-green/30" : "border-white/5"
      )}>
        {syncStatus !== SyncStatus.CONNECTED ? (
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-16 h-16 bg-gradient-to-br from-monster-green to-monster-blue rounded-2xl flex items-center justify-center mb-4 shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
              <Smartphone className="w-8 h-8 text-monster-black" />
            </div>
            <h3 className="font-heading font-black italic uppercase text-xl mb-2">Google Fit & Health Connect</h3>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest max-w-[200px] mb-6">
              Sincronize seus passos, calorias e batimentos cardíacos automaticamente.
            </p>
            <button 
              onClick={handleConnect}
              disabled={isSyncing}
              className="monster-btn-primary py-3 px-8 text-xs flex items-center gap-2"
            >
              {isSyncing ? (
                <>CONECTANDO... <RefreshCw className="w-4 h-4 animate-spin" /></>
              ) : (
                <>CONECTAR AGORA <Smartphone className="w-4 h-4" /></>
              )}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
              <div className="p-2 bg-monster-green/20 rounded-lg mb-2">
                <Activity className="w-5 h-5 text-monster-green" />
              </div>
              <p className="text-xl font-black italic">{healthData?.steps || 0}</p>
              <p className="text-[8px] text-white/40 font-black uppercase tracking-widest">Passos Hoje</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
              <div className="p-2 bg-orange-500/20 rounded-lg mb-2">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-xl font-black italic">{healthData?.calories || 0} kcal</p>
              <p className="text-[8px] text-white/40 font-black uppercase tracking-widest">Calorias Ativas</p>
            </div>
            {healthData?.heartRate && (
              <div className="col-span-2 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-red-500 animate-pulse" />
                  <span className="text-[10px] text-white/60 font-black uppercase tracking-widest">Frequência Cardíaca</span>
                </div>
                <span className="text-xl font-black italic">{healthData.heartRate} <span className="text-[10px]">BPM</span></span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* IMC Calculator */}
      <Card className="monster-card">
        <div className="flex items-center gap-3 mb-6">
          <Calculator className="w-6 h-6 text-monster-green" />
          <h3 className="font-black italic uppercase">Calculadora de IMC</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-white/40">Peso (kg)</Label>
            <Input 
              type="number" 
              value={weight} 
              onChange={(e) => setWeight(e.target.value)}
              className="bg-monster-black border-white/10 focus:border-monster-green transition-colors"
              placeholder="0.0"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-white/40">Altura (cm)</Label>
            <Input 
              type="number" 
              value={height} 
              onChange={(e) => setHeight(e.target.value)}
              className="bg-monster-black border-white/10 focus:border-monster-green transition-colors"
              placeholder="175"
            />
          </div>
        </div>
        {imc && (
          <div className="p-4 bg-monster-green/10 border border-monster-green/20 rounded-xl flex items-center justify-between">
            <span className="text-sm font-bold uppercase">Seu IMC</span>
            <span className="text-2xl font-black text-monster-green">{imc}</span>
          </div>
        )}
      </Card>

      {/* Quick Add Log */}
      <Card className="monster-card">
        <form onSubmit={handleAddLog} className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Plus className="w-6 h-6 text-monster-green" />
            <h3 className="font-black italic uppercase">Registrar Vitais</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-white/40">Glicemia (mg/dL)</Label>
              <Input 
                type="number" 
                value={glucose} 
                onChange={(e) => setGlucose(e.target.value)}
                className="bg-monster-black border-white/10 focus:border-monster-green transition-colors"
                placeholder="90"
              />
            </div>
            {error && (
              <div className="col-span-2 text-monster-red text-[10px] font-bold uppercase animate-pulse">
                {error}
              </div>
            )}
            <div className="flex items-end">
              <button type="submit" className="monster-btn-primary w-full py-2.5">SALVAR</button>
            </div>
          </div>
        </form>
      </Card>

      {/* Weight Chart */}
      <Card className="monster-card p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-monster-green" />
            <h3 className="font-black italic uppercase">Evolução de Peso</h3>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={logs.filter(l => l.weight)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="formattedDate" 
                stroke="#666" 
                fontSize={10} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#666" 
                fontSize={10} 
                tickLine={false}
                axisLine={false}
                domain={['dataMin - 5', 'dataMax + 5']}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ color: '#CCFF00', fontWeight: 'bold' }}
              />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#CCFF00" 
                strokeWidth={3} 
                dot={{ fill: '#CCFF00', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Glucose Chart */}
      <Card className="monster-card p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Droplets className="w-6 h-6 text-blue-500" />
            <h3 className="font-black italic uppercase">Evolução de Glicemia</h3>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={logs.filter(l => l.glucose)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="formattedDate" 
                stroke="#666" 
                fontSize={10} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#666" 
                fontSize={10} 
                tickLine={false}
                axisLine={false}
                domain={['dataMin - 10', 'dataMax + 10']}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ color: '#3B82F6', fontWeight: 'bold' }}
              />
              <Line 
                type="monotone" 
                dataKey="glucose" 
                stroke="#3B82F6" 
                strokeWidth={3} 
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
