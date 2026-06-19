import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import apiClient from '../../shared/lib/apiClient';
import { useAuth } from '../../shared/ui/AuthContext';
import styles from './LoginPage.module.css';

export function LoginPage() {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [formError, setFormError] = useState('');
    const navigate = useNavigate();
    const { refresh } = useAuth();

    const { mutate, isPending } = useMutation({
        mutationFn: (creds: { login: string; password: string }) => apiClient.post('/auth', creds),
        onSuccess: async () => {
            await refresh();
            navigate('/admin', { replace: true });
        },
        onError: (err) => {
            if (axios.isAxiosError(err) && err.response?.status === 401) {
                setFormError('Неверный логин или пароль');
            } else if (axios.isAxiosError(err) && err.response?.status === 429) {
                setFormError('Слишком много попыток. Подождите минуту.');
            } else {
                setFormError('Не удалось войти. Попробуйте позже.');
            }
        },
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (login.trim().length < 3) return setFormError('Логин: минимум 3 символа');
        if (password.length < 6) return setFormError('Пароль: минимум 6 символов');
        setFormError('');
        mutate({ login, password });
    };

    return (
        <div className={styles.page}>
            <form onSubmit={handleSubmit} noValidate className={styles.card}>
                <h1 className={styles.title}>Вход в админ-панель</h1>

                <label htmlFor="login-login" className="sr-only">Логин</label>
                <input
                    id="login-login"
                    className={styles.input}
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder="Логин"
                    autoComplete="username"
                    aria-describedby={formError ? 'login-error' : undefined}
                    required
                />

                <label htmlFor="login-password" className="sr-only">Пароль</label>
                <input
                    id="login-password"
                    className={styles.input}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Пароль"
                    autoComplete="current-password"
                    aria-describedby={formError ? 'login-error' : undefined}
                    required
                />

                <button type="submit" className={styles.button} disabled={isPending}>
                    {isPending ? 'Вход…' : 'Войти'}
                </button>

                {formError && <p id="login-error" className={styles.error} role="alert">{formError}</p>}
            </form>
        </div>
    );
}
