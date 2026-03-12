import { cn } from '@/lib/utils';

import { Task } from '../types';

interface TaskCardProps {
    task: Task;
    isCurrent: boolean;
}

const TaskCard = ({ task, isCurrent }: TaskCardProps) => {
    return (
        <div
            className={cn(
                'flex h-full w-full items-center justify-between rounded-full px-6 py-3 transition-all duration-300',
                isCurrent
                    ? 'bg-[linear-gradient(-90deg,_#892ccf_0%,_#3e01db_100%)]'
                    : 'border border-[rgba(62,1,219,0.2)] bg-white'
            )}
        >
            <div>
                <p
                    className={cn(
                        'text-base font-normal',
                        isCurrent ? 'text-white' : 'text-[#3e01db]'
                    )}
                >
                    {task.title}
                </p>
                <p
                    className={cn(
                        'text-base font-normal',
                        isCurrent ? 'text-white/30' : 'text-[#3e01db]/30'
                    )}
                >
                    {task.duration} min
                </p>
            </div>
            <p
                className={cn(
                    'text-base font-normal',
                    isCurrent ? 'text-white/50' : 'text-[#3e01db]/50'
                )}
            >
                {task.startTime}
            </p>
        </div>
    );
};

export default TaskCard;
