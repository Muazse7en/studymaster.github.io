import React, { useState } from 'react';

const LoginPage = ({ onLogin, error }: { onLogin: (email: string, pass: string) => void; error: string | null; }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(email, password);
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-content">
                    <h1>Study Master</h1>
                    <p>Your AI-powered study partner</p>
                </div>
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="login-form-group">
                        <input
                            id="email"
                            type="email"
                            className="login-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            autoComplete="email"
                            required
                        />
                         <label htmlFor="email">Email</label>
                    </div>
                     <div className="login-form-group">
                        <input
                            id="password"
                            type="password"
                            className="login-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            autoComplete="current-password"
                            required
                        />
                         <label htmlFor="password">Password</label>
                    </div>
                    {error && <p className="login-error">{error}</p>}
                    <button type="submit" className="login-button liquid-button">
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;