import Dashboard from '@/components/Dashboard';
import { DataProvider } from '@/contexts/DataContext';

export default function DashboardPage() {
  return (
    <DataProvider serviceType="localStorage">
      <Dashboard />
    </DataProvider>
  );
}
