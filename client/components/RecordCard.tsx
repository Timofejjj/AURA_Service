import FolderShape from '../ui/icons/FolderShape';
import PaperIcon from '../ui/icons/PaperIcon';

interface RecordCardProps {
    title: string;
    count: number;
}

const RecordCard = ({ title, count }: RecordCardProps) => {
    return (
        <div className="relative h-40 w-44 overflow-hidden rounded-3xl [background:linear-gradient(180deg,_#030A83_0%,_#0511E9_100%)]">
            <FolderShape className="absolute top-[51px] left-0 z-40 h-auto w-full" />

            <PaperIcon className="absolute top-[16px] left-1/2 z-20 h-auto w-[90%] -translate-x-1/2" />

            <div className="absolute bottom-4 left-4 z-40">
                <h3 className="sans text-lg text-white">{title}</h3>
                <p className="sans text-sm text-white/50">{count} записей</p>
            </div>
        </div>
    );
};

export default RecordCard;
