importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDn1m6oqE8Jld6KT32PHVewbbub90_vZIU",
  authDomain: "gen-lang-client-0824774704.firebaseapp.com",
  projectId: "gen-lang-client-0824774704",
  storageBucket: "gen-lang-client-0824774704.firebasestorage.app",
  messagingSenderId: "529310332011",
  appId: "1:529310332011:web:404aba7a6cbcdf5d5a2d2e"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
