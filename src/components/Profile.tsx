import React, { useState } from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogOut, User as UserIcon, Shield, Bell, Settings, Sparkles } from 'lucide-react';
import { Card } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';

interface ProfileProps {
  user: User;
  profile: any;
}

const MOTIVATIONAL_MESSAGES = [
  "O único treino ruim é aquele que não aconteceu. Vamos nessa!",
  "A dor de hoje é a força de amanhã. Não pare!",
  "Seu corpo pode aguentar quase tudo. É a sua mente que você tem que convencer.",
  "Não espere por motivação. Cultive a disciplina.",
  "Um monstro não nasce, ele é construído série por série!"
];

export default function Profile({ user, profile }: ProfileProps) {
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  const handleSignOut = () => signOut(auth);

  const testNotification = () => {
    if (Notification.permission === 'granted') {
      const randomMessage = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
      new Notification("Fit Monster", {
        body: randomMessage,
        icon: '/favicon.ico'
      });
    } else {
      alert("Por favor, ative as notificações primeiro.");
    }
  };

  const menuItems = [
    { icon: UserIcon, label: 'Informações Pessoais' },
    { icon: Shield, label: 'Segurança e Privacidade' },
    { 
      icon: Bell, 
      label: 'Notificações', 
      onClick: () => setShowNotificationSettings(!showNotificationSettings) 
    },
    { icon: Settings, label: 'Configurações do App' },
  ];

  return (
    <div className="space-y-8">
      <h2 className="monster-heading text-4xl">MEU <span className="text-monster-green">PERFIL</span></h2>

      <div className="flex flex-col items-center text-center space-y-6 relative">
        <div className="relative">
          <div className="absolute inset-0 bg-monster-green/20 blur-3xl rounded-full" />
          <Avatar className="w-32 h-32 border-4 border-monster-green shadow-[0_0_50px_rgba(204,255,0,0.3)] relative z-10">
            <AvatarImage src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} />
            <AvatarFallback className="bg-monster-gray text-monster-green text-2xl font-black">MT</AvatarFallback>
          </Avatar>
        </div>
        <div>
          <h3 className="monster-heading text-2xl tracking-normal">{profile?.name || 'USUÁRIO MONSTRO'}</h3>
          <p className="text-white/20 text-xs font-black uppercase mt-1 tracking-widest">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="monster-card p-4 text-center">
          <span className="text-2xl font-black text-monster-green">{profile?.height || '--'}</span>
          <p className="text-[10px] text-white/40 uppercase font-bold">Altura (cm)</p>
        </Card>
        <Card className="monster-card p-4 text-center">
          <span className="text-2xl font-black text-monster-green">{profile?.weightInitial || '--'}</span>
          <p className="text-[10px] text-white/40 uppercase font-bold">Inicial (kg)</p>
        </Card>
      </div>

      <Card className="monster-card p-2">
        {menuItems.map((item, idx) => (
          <React.Fragment key={item.label}>
            <button 
              onClick={item.onClick}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors rounded-xl group"
            >
              <div className="flex items-center gap-4">
                <item.icon className="w-5 h-5 text-white/40 group-hover:text-monster-green transition-colors" />
                <span className="font-bold text-sm uppercase tracking-tight">{item.label}</span>
              </div>
            </button>
            {idx < menuItems.length - 1 && <Separator className="bg-white/5 mx-4" />}
          </React.Fragment>
        ))}
      </Card>

      {showNotificationSettings && (
        <Card className="monster-card space-y-4 p-6 border-monster-green/20">
          <div className="flex items-center gap-3 text-monster-green">
            <Sparkles className="w-5 h-5" />
            <h4 className="font-black italic uppercase text-sm">Configurações de Notificação</h4>
          </div>
          <p className="text-[10px] text-white/40 font-bold uppercase">
            Status: {Notification.permission === 'granted' ? 'Ativado' : 'Desativado'}
          </p>
          <div className="space-y-3">
            <button 
              onClick={testNotification}
              className="monster-btn-primary w-full py-2 text-xs flex items-center justify-center gap-2"
            >
              <Bell className="w-4 h-4" /> TESTAR NOTIFICAÇÃO
            </button>
            <p className="text-[8px] text-white/20 text-center uppercase font-bold">
              Isso enviará uma mensagem motivacional agora.
            </p>
          </div>
        </Card>
      )}

      <button 
        onClick={handleSignOut}
        className="monster-btn-danger w-full flex items-center justify-center gap-3 py-4"
      >
        <LogOut className="w-5 h-5" /> SAIR DA CONTA
      </button>
    </div>
  );
}
