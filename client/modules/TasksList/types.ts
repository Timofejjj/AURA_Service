export interface Task {
    id: number;
    title: string;
    duration: number;
    startTime: string;
}

export interface TaskListProps {
    tasks: Task[];
    displayDate: Date;
    currentTime: Date;
}
