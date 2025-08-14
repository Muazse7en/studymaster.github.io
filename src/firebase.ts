import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCg_xY2OyssHmrV_Ifnwucrl_btGQkPbiE",
  authDomain: "studymaster-app-5acd7.firebaseapp.com",
  projectId: "studymaster-app-5acd7",
  storageBucket: "studymaster-app-5acd7.firebasestorage.app",
  messagingSenderId: "794826408507",
  appId: "1:794826408507:web:e3a34e762b9f428121921e",
  measurementId: "G-R9DZ2PRC0P"
};

// Initialize Firebase, checking if it's already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Export auth service
export const auth = firebase.auth();
