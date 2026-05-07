import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import AuthScreen from './components/AuthScreen';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import WorkoutBuilder from './components/WorkoutBuilder';
import CalendarView from './components/CalendarView';
import HealthStats from './components/HealthStats';
import Profile from './components/Profile';
import Onboarding from './components/Onboarding';
import NotificationManager from './components/NotificationManager';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Clean up previous profile listener if it exists
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        unsubProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          } else {
            const initialProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              name: currentUser.displayName,
              photoURL: currentUser.photoURL,
              weightInitial: 0,
              height: 0,
              targetWeight: 0,
              glycemicTarget: 0,
              onboardingComplete: false,
              createdAt: new Date().toISOString()
            };
            try {
              await setDoc(userDocRef, initialProfile);
              setUserProfile(initialProfile);
            } catch (err) {
              console.error("Error creating initial profile:", err);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile sync error:", error);
          handleFirestoreError(error, OperationType.GET, 'users');
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-monster-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-monster-green border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (userProfile && !userProfile.onboardingComplete) {
    return <Onboarding user={user} onComplete={() => {}} />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} profile={userProfile} />;
      case 'workouts':
        return <WorkoutBuilder user={user} />;
      case 'calendar':
        return <CalendarView user={user} profile={userProfile} />;
      case 'health':
        return <HealthStats user={user} profile={userProfile} />;
      case 'profile':
        return <Profile user={user} profile={userProfile} />;
      default:
        return <Dashboard user={user} profile={userProfile} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <NotificationManager user={user} />
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderTab()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
