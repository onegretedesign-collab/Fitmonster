import React, { useEffect, useState, useRef } from 'react';
import { messaging, getToken, onMessage, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Bell, BellOff, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationManagerProps {
  user: User;
}

export default function NotificationManager({ user }: NotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' ? Notification.permission : 'default'
  );
  const [token, setToken] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const notifiedSessionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!messaging) return;

    // Handle foreground messages from FCM
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received in foreground: ', payload);
      setLastMessage(payload);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    });

    return () => unsubscribe();
  }, []);

  // Listen to training sessions for local reminders
  useEffect(() => {
    const q = query(collection(db, 'training_sessions'), where('uid', '==', user.uid), where('completed', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user.uid]);

  // Periodic check for reminders
  useEffect(() => {
    const checkReminders = () => {
      if (permission !== 'granted') return;

      const now = new Date();
      const currentDay = now.toDateString();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      sessions.forEach(session => {
        if (notifiedSessionsRef.current.has(session.id)) return;

        const sessionDate = new Date(session.date);
        const isToday = sessionDate.toDateString() === currentDay;
        const isTime = session.reminderTime === currentTime;

        if (isToday && isTime) {
          // Trigger browser notification
          new Notification(session.workoutTitle || 'Treino Monster', {
            body: session.reminderMessage || 'Bora treinar, Monstro!',
            icon: '/favicon.ico'
          });

          // Show in-app toast too
          setLastMessage({
            notification: {
              title: session.workoutTitle || 'Treino Monster',
              body: session.reminderMessage || 'Bora treinar, Monstro!'
            }
          });
          setShowToast(true);
          setTimeout(() => setShowToast(false), 10000);

          // Mark as notified for this instance
          notifiedSessionsRef.current.add(session.id);
        }
      });
    };

    const interval = setInterval(checkReminders, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [sessions, permission]);

  const requestPermission = async () => {
    if (!messaging) return;

    try {
      const status = await Notification.requestPermission();
      setPermission(status);

      if (status === 'granted') {
        const fcmToken = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
        });

        if (fcmToken) {
          setToken(fcmToken);
          await updateDoc(doc(db, 'users', user.uid), {
            fcmToken: fcmToken
          });
          console.log('FCM Token saved to Firestore');
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <>
      {/* Foreground Message Toast */}
      <AnimatePresence>
        {showToast && lastMessage && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4"
          >
            <div className="bg-monster-gray border border-monster-green/30 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-start gap-4 backdrop-blur-xl">
              <div className="bg-monster-green/20 p-2 rounded-full">
                <Bell className="w-5 h-5 text-monster-green" />
              </div>
              <div className="flex-1">
                <h4 className="font-black italic uppercase text-sm text-monster-green">
                  {lastMessage.notification?.title || 'Notificação Monster'}
                </h4>
                <p className="text-xs text-white/70 mt-1">
                  {lastMessage.notification?.body}
                </p>
              </div>
              <button 
                onClick={() => setShowToast(false)}
                className="text-white/20 hover:text-white"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permission Request UI (Optional, can be integrated in Profile) */}
      {permission === 'default' && (
        <div className="fixed bottom-24 left-6 right-6 z-50">
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-monster-green text-monster-black p-4 rounded-2xl flex items-center justify-between shadow-[0_0_30px_rgba(204,255,0,0.3)]"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5" />
              <p className="text-xs font-black uppercase italic">Ativar lembretes de treino?</p>
            </div>
            <button 
              onClick={requestPermission}
              className="bg-monster-black text-monster-green px-4 py-2 rounded-xl text-[10px] font-black uppercase"
            >
              ATIVAR
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}
