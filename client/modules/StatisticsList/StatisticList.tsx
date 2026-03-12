'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import RecordSlider from '@/components/sliders/RecordSlider';
import SuggestionSlider from '@/components/sliders/SuggestionSlider';
import TrackerSlider from '@/components/sliders/TrackerSlider';
import ReportCard from './components/ReportCard';

import { thoughtsApi, sessionsApi } from '@/api';

const trackers = [
    { id: 1, trackerName: 'Шаги', trackerStats: '10000' },
    { id: 2, trackerName: 'Вода', trackerStats: '1,5 л' },
    { id: 3, trackerName: 'Сон', trackerStats: '7 ч' },
];

const StatisticsList = () => {
    const { data: thoughts, isLoading: isThoughtsLoading } = useQuery({
        queryKey: ['thoughts', 'list', { limit: 100 }],
        queryFn: () => thoughtsApi.getAll({ limit: 100 }),
        staleTime: 1000 * 60 * 5,
    });

    const { data: sessions, isLoading: isSessionsLoading } = useQuery({
        queryKey: ['work-sessions', 'list', { limit: 10 }],
        queryFn: () => sessionsApi.getWorkSessions({ limit: 10 }),
        staleTime: 1000 * 60 * 5,
    });

    const processedRecords = useMemo(() => {
        if (!thoughts || thoughts.length === 0) {
            return [];
        }

        const counts = thoughts.reduce((acc, t) => {
            const type = t.type_thought || 'Разное';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts).map(([title, count], index) => ({
            id: index,
            title: title,
            count: count,
        }));
    }, [thoughts]);

    const processedTasks = useMemo(() => {
        if (!sessions || sessions.length === 0) {
            return [];
        }

        return sessions.map((session) => ({
            id: session.session_id,
            text: session.work_type || session.pre_session_text || 'Сессия',
        }));
    }, [sessions]);

    return (
        <div className={'mt-24 flex flex-col items-center w-full'}>
            <h2 className={'flex w-full justify-start text-2xl font-bold px-4'}>
                Статистика
            </h2>

            <div className={'mt-3 h-[91px] min-h-[91px] w-full min-w-[361px]'}>
                <ReportCard />
            </div>

            <TrackerSlider trackers={trackers} />

            <h2 className={'mt-8 flex w-full justify-start text-2xl font-bold px-4'}>
                Задачи
            </h2>

            {isSessionsLoading ? (
                <div className="mt-4 flex h-64 w-full items-center justify-center text-gray-400">
                    Загрузка задач...
                </div>
            ) : processedTasks.length > 0 ? (
                <SuggestionSlider suggestions={processedTasks} />
            ) : (
                <div className="mt-4 px-4 text-gray-400">
                    Нет активных задач
                </div>
            )}

            <h2 className={'mt-8 flex w-full justify-start text-2xl font-bold px-4'}>
                Ваши записи
            </h2>

            {isThoughtsLoading ? (
                <div className="mt-4 flex h-40 w-full items-center justify-center text-gray-400">
                    Загрузка...
                </div>
            ) : processedRecords.length > 0 ? (
                <RecordSlider records={processedRecords} />
            ) : (
                <div className="mt-4 px-4 text-gray-400">
                    Пока нет записей. Создайте первую!
                </div>
            )}
        </div>
    );
};

export default StatisticsList;