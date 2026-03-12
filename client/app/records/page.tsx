'use client';

import React, {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import AppointmentCard from '@/modules/AppointmentCard';
import RecordCard from '@/components/RecordCard';

import {thoughtsApi} from '@/api';

const RecordsPage = () => {
    const {
        data: thoughts,
        isLoading,
        isError
    } = useQuery({
        queryKey: ['thoughts', 'list', {limit: 100}],
        queryFn: () => thoughtsApi.getAll({limit: 100}),
        staleTime: 1000 * 60 * 5,
    });

    const recordsData = useMemo(() => {
        if (!thoughts) return [];

        const counts = thoughts.reduce((acc, thought) => {
            const type = thought.type_thought || 'Общее';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts).map(([title, count]) => ({
            title,
            count,
        }));
    }, [thoughts]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-xl text-gray-500">Загрузка записей...</div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-red-500">Ошибка при загрузке данных</div>
            </div>
        );
    }

    if (recordsData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center mt-[80px]">
                <h1 className="text-4xl font-bold text-black mb-8">Записи</h1>
                <p className="text-gray-500">Пока нет записей</p>
            </div>
        );
    }

    return (
        <div className={'flex flex-col items-center justify-center'}>
            <div className={'mt-[80px] mb-[48px] w-full'}>
                <h1 className="text-4xl font-bold text-black">Записи</h1>
            </div>

            <div className="grid grid-cols-2 gap-[17px]">
                {recordsData.slice(0, 4).map((record, index) => (
                    <RecordCard
                        key={`top-${index}`}
                        title={record.title}
                        count={record.count}
                    />
                ))}

                <div className="col-span-2">
                    <AppointmentCard/>
                </div>

                {recordsData.slice(4).map((record, index) => (
                    <RecordCard
                        key={`bottom-${index}`}
                        title={record.title}
                        count={record.count}
                    />
                ))}
            </div>
        </div>
    );
};

export default RecordsPage;