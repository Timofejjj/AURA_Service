import {
    CARD_HEIGHT,
    COMPONENT_BG_COLOR,
} from '../constants/tasksList.constants';
import { Task } from '../types';
import TaskCard from './TaskCard';
import TaskIcon from './TaskIcon';

interface TaskItemProps {
    task: Task;
    isCurrent: boolean;
}

const TaskItem = ({ task, isCurrent }: TaskItemProps) => {
    return (
        <div
            key={task.id}
            className="flex items-center"
            style={{ height: `${CARD_HEIGHT}px` }}
        >
            <div
                className="mr-4 flex h-7 w-7 flex-shrink-0 items-center justify-center"
                style={{
                    zIndex: 10,
                    backgroundColor: COMPONENT_BG_COLOR,
                }}
            >
                <TaskIcon isCurrent={isCurrent} />
            </div>
            <TaskCard task={task} isCurrent={isCurrent} />
        </div>
    );
};

export default TaskItem;
