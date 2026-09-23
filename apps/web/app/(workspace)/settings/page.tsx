import type { Metadata } from "next";

import { UpdatePanel } from "@/components/settings/update-panel";
import { ThemeSwitcher } from "@/components/theme-switcher";

export const metadata: Metadata = {
  title: "Settings",
};

const SettingsPage = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-semibold">Settings</h1>
      <p className="text-muted-foreground mt-2">
        Appearance and application options for Quiver Dashboard.
      </p>
    </div>
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">Appearance</h2>
      <ThemeSwitcher />
    </div>
    <UpdatePanel />
  </div>
);

export default SettingsPage;
