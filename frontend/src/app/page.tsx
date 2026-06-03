import { Suspense } from "react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

// useSearchParams (selection state) requires a Suspense boundary under static export.
export default function Home() {
  return (
    <Suspense>
      <DashboardPage />
    </Suspense>
  );
}
