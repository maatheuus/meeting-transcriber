import { Button } from '@renderer/components/ui/button';

function App(): React.JSX.Element {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold tracking-tight">
        Electron + React + Tailwind + Prettier wired up correctly
      </h1>
      <p className="text-muted-foreground">shadcn/ui + Tailwind CSS are ready to build on.</p>
      <Button>shadcn Button works</Button>
    </div>
  );
}

export default App;
