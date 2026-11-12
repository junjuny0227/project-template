import MockingStatus from './MockingStatus';

const HomePage = () => {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8">
      <h1 className="text-2xl font-semibold">Project Template</h1>
      {process.env.NEXT_PUBLIC_API_MOCKING === 'enabled' && <MockingStatus />}
    </main>
  );
};

export default HomePage;
