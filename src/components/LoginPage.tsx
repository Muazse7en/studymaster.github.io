
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
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            required
                        />
                    </div>
                     <div className="login-form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </div>
                    {error && <p className="login-error">{error}</p>}
                    <button type="submit" className="btn btn-primary login-button">
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
