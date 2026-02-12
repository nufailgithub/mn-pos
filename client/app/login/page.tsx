import { prisma } from "@/lib/prisma";
import LoginForm from "./_components/LoginForm";

export default async function LoginPage() {
  // Check if any users exist in the database
  const userCount = await prisma.user.count();
  const showSignupLink = userCount === 0;

  return <LoginForm showSignupLink={showSignupLink} />;
}
