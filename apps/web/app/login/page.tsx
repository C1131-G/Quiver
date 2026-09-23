import type { Metadata } from "next";

import { LoginForm } from "@/components/login/login-form";

export const metadata: Metadata = {
  title: "Log in",
};

const LoginPage = () => <LoginForm />;

export default LoginPage;
