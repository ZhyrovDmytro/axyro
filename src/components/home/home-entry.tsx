"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { LandingPage } from "./landing-page";

export function HomeEntry({ dashboard }: { dashboard: React.ReactNode }) {
  const { user } = useAuth();
  return user ? dashboard : <LandingPage />;
}
