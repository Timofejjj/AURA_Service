import { Plus } from 'lucide-react';

interface AddButtonProps {
    onClick: () => void;
}

const AddButton = ({ onClick }: AddButtonProps) => {
    return (
        <button
            onClick={onClick}
            className="absolute bottom-full left-1/2 flex h-[69px] w-[69px] -translate-x-1/2 translate-y-[calc(100%-3px)] items-center justify-center rounded-full bg-gradient-to-b from-[#0511e9] to-[#030a83] text-white shadow-md transition-transform duration-300 hover:scale-110"
        >
            <Plus size={32} />
        </button>
    );
};

export default AddButton;
