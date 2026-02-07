"use server";
// Since we are using client components for interactive UI, we need to separate the page
// But for simplicity, I'll make the page client-side rendered for now, or use a client component wrapper.
// Let's use the same pattern as Customers page: "use client" at top.

import EmployeesClient from "./_components/EmployeesClient";

export default async function EmployeesPage() {
  return <EmployeesClient />;
}
