'use client';

import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import CategoryTabs from '@/modules/CategoryTabs';
import DatePickerSlider from '@/modules/DatePicker';
import EnergyLevelCard from '@/modules/EnergyLevelCard';
import TaskList from '@/modules/TasksList';

import { sessionsApi } from '@/api';


const CATEGORY_MAP: Record<string, string> = {
    'work': 'Работа',
    'sport': 'Спорт',
    'study': 'Учеба',
    'food': 'Питание',
};

const CATEGORIES = [
    { id: 'work', title: 'Работа' },
    { id: 'sport', title: 'Спорт' },
    { id: 'study', title: 'Учеба' },
    { id: 'food', title: 'Питание' },
];

const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const isSameDate = (d1: Date, d2: Date) => {
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
};

export default function TasksPage() {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [currTime, setCurrTime] = useState<Date | null>(null);
    const [activeTab, setActiveTab] = useState('work');

    const { data: sessions, isLoading } = useQuery({
        queryKey: ['work-sessions', 'list'],
        queryFn: () => sessionsApi.getWorkSessions({ limit: 100 }),
        staleTime: 1000 * 60 * 5,
    });

    const filteredTasks = useMemo(() => {
        if (!sessions || !selectedDate) return [];

        const targetType = CATEGORY_MAP[activeTab] || activeTab;

        return sessions
            .filter((session) => {
                const sessionDate = new Date(session.start_time);

                const isDateMatch = isSameDate(sessionDate, selectedDate);

                const sessionType = session.work_type || '';
                const isCategoryMatch = sessionType.toLowerCase().includes(targetType.toLowerCase())
                    || targetType.toLowerCase().includes(sessionType.toLowerCase());

                return isDateMatch && isCategoryMatch;
            })
            .map((session) => ({
                id: session.session_id,
                title: session.work_type || 'Задача',
                duration: session.duration_minutes || 0,
                startTime: formatTime(session.start_time),
                description: session.pre_session_text
            }));
    }, [sessions, selectedDate, activeTab]);

    useEffect(() => {
        setSelectedDate(new Date());
        setCurrTime(new Date());

        const timer = setInterval(() => {
            setCurrTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    if (!selectedDate || !currTime) {
        return null;
    }

    return (
        <div className={'flex w-full flex-col items-center justify-center'}>
            <CategoryTabs
                categories={CATEGORIES}
                activeCategory={activeTab}
                onSelectCategory={setActiveTab}
            />

            <DatePickerSlider
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
            />

            <EnergyLevelCard level={75} type={activeTab} />

            {isLoading ? (
                <div className="mt-10 text-gray-500">Загрузка задач...</div>
            ) : (
                <TaskList
                    tasks={filteredTasks}
                    displayDate={selectedDate}
                    currentTime={currTime}
                />
            )}

            {!isLoading && filteredTasks.length === 0 && (
                <div className="mt-8 text-sm text-gray-400">
                    На этот день задач в категории &quot;{CATEGORIES.find(c => c.id === activeTab)?.title}&quot; нет.
                </div>
            )}
        </div>
    );
}