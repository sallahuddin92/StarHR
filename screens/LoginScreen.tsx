import React, { useState } from 'react';
import { api, ApiError } from '../src/lib/api';

interface LoginScreenProps {
    onLoginSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // The api.auth.login method handles token storage automatically
            const response = await api.auth.login({ identifier, password });

            if (response.token) {
                // Store user info for UI purposes
                localStorage.setItem('user', JSON.stringify(response.user));
                onLoginSuccess();
            } else {
                throw new Error('Login failed - no token received');
            }
        } catch (err) {
            const message = err instanceof ApiError ? err.message :
                err instanceof Error ? err.message : 'Login failed';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
            <div className="w-full max-w-md p-8">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-[#181811] dark:text-white mb-2">StarHR</h1>
                    <p className="text-[#8c8b5f]">Enterprise HR Portal</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-[#181811] dark:text-white mb-2">
                            Employee ID or Email
                        </label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full h-12 px-4 rounded-xl border border-[#e6e6db] dark:border-[#3a3a30] bg-white dark:bg-surface-dark text-[#181811] dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="e.g. EMP001 or admin@starhr.my"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#181811] dark:text-white mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-12 px-4 rounded-xl border border-[#e6e6db] dark:border-[#3a3a30] bg-white dark:bg-surface-dark text-[#181811] dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-xl bg-primary hover:bg-[#eae605] text-black font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className="mt-8 p-4 rounded-xl bg-[#f8f8f5] dark:bg-[#23220f] border border-[#e6e6db] dark:border-[#3a3a30]">
                    <p className="text-xs text-[#8c8b5f] mb-3 font-medium uppercase tracking-wider">Available Demo Accounts</p>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center p-2 rounded hover:bg-white dark:hover:bg-slate-800 cursor-pointer" onClick={() => { setIdentifier('EMP-001'); setPassword('password123'); }}>
                            <span className="font-bold text-slate-700 dark:text-slate-300">HR ADMIN</span>
                            <span className="font-mono text-slate-500">EMP-001 / password123</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded hover:bg-white dark:hover:bg-slate-800 cursor-pointer" onClick={() => { setIdentifier('EMP-004'); setPassword('password123'); }}>
                            <span className="font-bold text-slate-700 dark:text-slate-300">MANAGER</span>
                            <span className="font-mono text-slate-500">EMP-004 / password123</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded hover:bg-white dark:hover:bg-slate-800 cursor-pointer" onClick={() => { setIdentifier('EMP-002'); setPassword('password123'); }}>
                            <span className="font-bold text-slate-700 dark:text-slate-300">WORKER</span>
                            <span className="font-mono text-slate-500">EMP-002 / password123</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
