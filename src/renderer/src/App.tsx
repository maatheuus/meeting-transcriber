import { Toaster } from 'sonner';
import { TabsView } from './components/dashboard/tabs-view';
import { DashboardLayout } from './components/layout/dashboard-layout';

function App(): React.JSX.Element {
  return (
    <>
      <DashboardLayout>
        <TabsView />
      </DashboardLayout>
      <Toaster theme="dark" position="bottom-right" />
    </>
  );
}

export default App;
