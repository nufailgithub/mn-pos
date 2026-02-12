import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SignupForm from "./_components/SignupForm";

export default async function SignupPage() {
  // Check if any users exist in the database
  const userCount = await prisma.user.count();

  // If users exist, redirect to login page
  if (userCount > 0) {
    redirect("/login");
  }

  return <SignupForm />;
}
