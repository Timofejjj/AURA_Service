'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api';

export default function AuthPage() {
    const router = useRouter();
    const [isLoginMode, setIsLoginMode] = useState(true);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        username: '',
    });

    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loginMutation = useMutation({
        mutationFn: authApi.login,
        onSuccess: () => {
            router.push('/records');
        },
        onError: (error: any) => {
            const msg = error.response?.data?.error || 'Ошибка при входе';
            setErrorMessage(msg);
        },
    });

    const registerMutation = useMutation({
        mutationFn: authApi.register,
        onSuccess: () => {
            alert('Регистрация успешна! Теперь войдите в систему.');
            setIsLoginMode(true);
            setErrorMessage(null);
        },
        onError: (error: any) => {
            const msg = error.response?.data?.error || 'Ошибка при регистрации';
            setErrorMessage(msg);
        },
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (isLoginMode) {
            loginMutation.mutate({
                email: formData.email,
                password: formData.password,
            });
        } else {
            registerMutation.mutate({
                email: formData.email,
                password: formData.password,
                username: formData.username,
            });
        }
    };

    const isLoading = loginMutation.isPending || registerMutation.isPending;

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-white px-6">
            <div className="pointer-events-none absolute top-0 left-0 h-64 w-64 rounded-full bg-blue-600/5 blur-[100px]" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-pink-500/5 blur-[100px]" />

            <div className="z-10 w-full max-w-[340px]">
                <div className="mb-12 text-center">
                    <h1 className="text-5xl font-black text-black tracking-tight">
                        Aura
                    </h1>
                    <p className="mt-4 text-lg font-medium text-gray-400">
                        {isLoginMode ? 'С возвращением!' : 'Начните путь к продуктивности'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {!isLoginMode && (
                        <div className="group relative">
                            <input
                                id="username"
                                name="username"
                                type="text"
                                placeholder="Имя пользователя"
                                required={!isLoginMode}
                                value={formData.username}
                                onChange={handleChange}
                                className="w-full rounded-2xl border-2 border-transparent bg-gray-100 px-5 py-4 text-base font-medium text-black placeholder:text-gray-400 focus:border-[#0511E9] focus:bg-white focus:outline-none transition-all"
                            />
                        </div>
                    )}

                    <div className="group relative">
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="Email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full rounded-2xl border-2 border-transparent bg-gray-100 px-5 py-4 text-base font-medium text-black placeholder:text-gray-400 focus:border-[#0511E9] focus:bg-white focus:outline-none transition-all"
                        />
                    </div>

                    <div className="group relative">
                        <input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="Пароль"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full rounded-2xl border-2 border-transparent bg-gray-100 px-5 py-4 text-base font-medium text-black placeholder:text-gray-400 focus:border-[#0511E9] focus:bg-white focus:outline-none transition-all"
                        />
                    </div>

                    {errorMessage && (
                        <div className="mt-2 rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-600">
                            {errorMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`mt-4 flex w-full items-center justify-center rounded-3xl py-4 text-lg font-bold text-white shadow-lg shadow-blue-900/20 transition-transform active:scale-95
                            ${isLoading ? 'opacity-70 cursor-wait' : 'hover:opacity-90'}
                        `}
                        style={{
                            background: 'linear-gradient(180deg, #030A83 0%, #0511E9 100%)'
                        }}
                    >
                        {isLoading ? 'Обработка...' : isLoginMode ? 'Войти' : 'Создать аккаунт'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500">
                        {isLoginMode ? 'Впервые здесь?' : 'Уже есть аккаунт?'}
                    </p>
                    <button
                        onClick={() => {
                            setIsLoginMode(!isLoginMode);
                            setErrorMessage(null);
                        }}
                        className="mt-1 text-base font-bold text-[#0511E9] hover:underline"
                    >
                        {isLoginMode ? 'Зарегистрироваться' : 'Войти в систему'}
                    </button>
                </div>
            </div>
        </div>
    );
}