import EnergyRing from './components/EnergyRing';

const GreetingHeader = () => {
    const firstName = 'Тимофей';
    return (
        <div>
            <h1 className={'mt-24 mb-14 text-center text-4xl font-black'}>
                Доброе утро, <br />
                {firstName}
            </h1>
            <EnergyRing progressValue={100}></EnergyRing>
        </div>
    );
};

export default GreetingHeader;
