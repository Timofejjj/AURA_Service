interface TaskIconProps {
    isCurrent: boolean;
}

const TaskIcon = ({ isCurrent }: TaskIconProps) => {
    if (isCurrent) {
        return (
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6.5" stroke="#3E01DB" />
                <circle cx="7" cy="7" r="3.5" stroke="#3E01DB" />
            </svg>
        );
    }

    return (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <circle cx="4" cy="4" r="3.5" stroke="#3E01DB" />
        </svg>
    );
};

export default TaskIcon;
