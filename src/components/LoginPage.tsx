// src/components/LoginPage.tsx
import { useState } from 'react';
import { auth, googleProvider } from '../firebase/firebase';

const LoginPage = () => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [error, setError] = useState('');

  const loginWithGoogle = async () => {
    try {
      const result = await auth.signInWithPopup(googleProvider);
      setUser(result.user);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const logout = async () => {
    await auth.signOut();
    setUser(null);
  };

  return (
    <div>
      <h2>Login Page</h2>
      {user ? (
        <div>
          <p>Welcome, {user.displayName}</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <div>
          <button onClick={loginWithGoogle}>Login with Google</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      )}
    </div>
  );
};

export default LoginPage;
