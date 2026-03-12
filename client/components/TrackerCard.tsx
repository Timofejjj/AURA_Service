interface TrackerCardProps {
    trackerName: string;
    trackerStats: string;
}

const TrackerCard = ({ trackerName, trackerStats }: TrackerCardProps) => {
    return (
        <div
            className={
                'flex h-56 w-44 flex-col items-start justify-between rounded-lg border-1 border-gray-400 p-3 text-sm'
            }
        >
            <p>{trackerName}</p>
            <p>{trackerStats}</p>
        </div>
    );
};

export default TrackerCard;
