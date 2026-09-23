import type { Metadata } from "next";

import { ScorersPage } from "@/components/scorers/scorers-page";

export const metadata: Metadata = {
  title: "Scorers",
};

const Page = () => <ScorersPage />;

export default Page;
