import GreetingHeader from '@/modules/GreetingHeader';
import StatisticList from '@/modules/StatisticsList';

export default function Home() {
    return (
        <div className="flex flex-col justify-center">
            <GreetingHeader></GreetingHeader>
            <StatisticList></StatisticList>
        </div>
    );
}
