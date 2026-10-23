import type { Metadata } from "next";

import { PrivacyDataSettings } from "@/components/settings/privacy-data-settings";

export const metadata: Metadata = {
  title: "Settings | Axyro",
  description:
    "Set workout guidance, effort, screen behavior, and local data controls.",
};

export default function SettingsPage() {
  return <PrivacyDataSettings />;
}
