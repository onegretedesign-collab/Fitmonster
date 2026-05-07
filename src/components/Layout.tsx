import React from 'react';
import { motion } from 'motion/react';
import { Home, Calendar, Activity, User, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Início' },
    { id: 'workouts', icon: Plus, label: 'Treinos' },
    { id: 'calendar', icon: Calendar, label: 'Agenda' },
    { id: 'health', icon: Activity, label: 'Saúde' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ];

  return (
    <div className="min-h-screen bg-monster-black pb-32">
      <main className="max-w-md mx-auto p-6">
        {children}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 z-50">
        <div className="max-w-md mx-auto bg-monster-black/80 backdrop-blur-2xl border border-white/5 px-6 py-3 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-monster-green/30 to-transparent" />
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex flex-col items-center gap-1 transition-all group",
                  isActive ? "text-monster-green scale-110" : "text-white/20 hover:text-white/40"
                )}
              >
                <div className={cn(
                  "p-2 rounded-2xl transition-all relative",
                  isActive && "bg-monster-green/5"
                )}>
                  {isActive && (
                    <motion.div 
                      layoutId="nav-bg"
                      className="absolute inset-0 bg-monster-green/10 rounded-2xl blur-sm"
                    />
                  )}
                  <Icon className="w-6 h-6 relative z-10" />
                </div>
                <span className={cn(
                  "text-[8px] uppercase font-black tracking-widest transition-opacity",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
