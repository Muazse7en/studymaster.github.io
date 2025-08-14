import React, { useState } from 'react';

const LoginPage = ({ onLogin, error }: { onLogin: (username: string, pass: string) => void; error: string | null; }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(username, password);
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
                            id="username"
                            type="text"
                            className="login-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Username"
                            autoComplete="username"
                            required
                        />
                         <label htmlFor="username">Username</label>
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
