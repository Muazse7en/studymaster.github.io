
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
                            className="login-input"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            required
                            placeholder=" " 
                        />
                        <label htmlFor="username">Username</label>
                    </div>
                     <div className="login-form-group">
                        <input
                            id="password"
                            className="login-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                            placeholder=" "
                        />
                        <label htmlFor="password">Password</label>
                    </div>
                    {error && <div className="login-error">{error}</div>}
                    <button type="submit" className="liquid-button login-button">
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
