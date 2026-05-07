import React from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { motion } from 'motion/react';
import { Dumbbell } from 'lucide-react';

export default function AuthScreen() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-monster-black p-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md flex flex-col items-center text-center"
      >
        <div className="mb-8">
          <div className="p-5 bg-monster-green rounded-full shadow-[0_0_40px_rgba(204,255,0,0.3)] inline-block">
            <Dumbbell className="w-12 h-12 text-monster-black" />
          </div>
        </div>

        <h1 className="monster-heading text-6xl md:text-7xl mb-3">
          BEFIT <span className="text-monster-green italic">MONSTER</span>
        </h1>
        
        <p className="text-white/20 mb-12 max-w-xs font-black uppercase text-[10px] tracking-[0.3em]">
          ALTA PERFORMANCE PARA O CORPO DE ELITE
        </p>

        <div className="w-full flex justify-center">
          <button
            onClick={handleLogin}
            className="monster-btn-primary w-full max-w-[320px] flex items-center justify-center gap-4 py-5 shadow-[0_15px_40px_rgba(204,255,0,0.2)]"
          >
            <div className="bg-monster-black p-1 rounded-full">
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale invert" alt="Google" />
            </div>
            <span className="tracking-tight">LOGAR COMO MONSTRO</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
