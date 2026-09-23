import type { Metadata } from "next";

import { UsersPage } from "@/components/users/users-page";

export const metadata: Metadata = {
  title: "Users",
};

const Page = () => <UsersPage />;

export default Page;
