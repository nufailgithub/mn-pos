import MainLayout from "../_components/MainLayout";

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your POS system
          </p>
        </div>

        <div className="grid gap-6 max-w-4xl">
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Company Details</h2>
            <p className="text-muted-foreground">Company information settings...</p>
          </div>
          
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">System Preferences</h2>
            <p className="text-muted-foreground">General system configuration...</p>
          </div>
          
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Payment Methods</h2>
            <p className="text-muted-foreground">Configure payment options...</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
