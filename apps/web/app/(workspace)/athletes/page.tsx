import type { Metadata } from "next";

import { AthletesPage } from "@/components/athletes/athletes-page";

export const metadata: Metadata = {
  title: "Athletes",
};

const Page = () => <AthletesPage />;

export default Page;
