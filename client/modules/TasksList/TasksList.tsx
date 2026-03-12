'use client';

import {
    addMinutes,
    isWithinInterval,
    setHours,
    setMilliseconds,
    setMinutes,
    setSeconds,
} from 'date-fns';

import TaskItem from './components/TaskItem';
import {
    CARD_HEIGHT,
    COMPONENT_BG_COLOR,
    GAP_HEIGHT,
    ICON_CONTAINER_WIDTH,
    ROW_HEIGHT,
} from './constants/tasksList.constants';
import { Task, TaskListProps } from './types';

const TaskList = ({ tasks, displayDate, currentTime }: TaskListProps) => {
    const isTaskCurrent = (task: Task): boolean => {
        const [startHour, startMinute] = task.startTime.split(':').map(Number);
        const taskStartDate = setMilliseconds(
            setSeconds(
                setMinutes(setHours(displayDate, startHour), startMinute),
                0
            ),
            0
        );
        const taskEndDate = addMinutes(taskStartDate, task.duration);
        return isWithinInterval(currentTime, {
            start: taskStartDate,
            end: taskEndDate,
        });
    };

    return (
        <div
            className="mt-4 w-full max-w-[380px] rounded-2xl p-6 font-sans"
            style={{ backgroundColor: COMPONENT_BG_COLOR }}
        >
            <h2 className="unbounded mb-8 text-2xl font-bold text-black">
                Задачи
            </h2>

            <div className="relative">
                {tasks.length > 1 && (
                    <div
                        className="absolute w-px bg-[#3e01db]"
                        style={{
                            left: `${ICON_CONTAINER_WIDTH / 2 - 0.5}px`,
                            top: `${CARD_HEIGHT / 2}px`,
                            height: `${(tasks.length - 1) * ROW_HEIGHT}px`,
                        }}
                    />
                )}

                <div
                    className="relative flex flex-col"
                    style={{ gap: `${GAP_HEIGHT}px` }}
                >
                    {tasks.map((task) => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            isCurrent={isTaskCurrent(task)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TaskList;
