import { redirect } from "next/navigation";

/** proxy.ts normally redirects "/" first; this covers any request it skips. */
const Home = () => redirect("/dashboard");

export default Home;
