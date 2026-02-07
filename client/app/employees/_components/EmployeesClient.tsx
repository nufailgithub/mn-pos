"use client";

import { useState, useEffect } from "react";
import MainLayout from "../../_components/MainLayout"; // Adjust path as needed
import { 
    getEmployees, 
    createEmployee, 
    updateEmployee, 
    addSalaryAdvance,
    recordSalaryPayment,
    type EmployeeWithAdvances
} from "@/app/actions/employee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, UserPlus, Pencil, Wallet, Calendar, Banknote } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function EmployeesClient() {
  const [employees, setEmployees] = useState<EmployeeWithAdvances[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create/Edit Dialog State
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithAdvances | null>(null);
  const [formData, setFormData] = useState({
      name: "",
      phone: "",
      basicSalary: ""
  });
  const [submitting, setSubmitting] = useState(false);

  // Advance Dialog State
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithAdvances | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceNote, setAdvanceNote] = useState("");
  const [advanceSubmitting, setAdvanceSubmitting] = useState(false);

  // Salary Payment Dialog State
  const [salaryPaymentDialogOpen, setSalaryPaymentDialogOpen] = useState(false);
  const [salaryForMonth, setSalaryForMonth] = useState("");
  const [salaryPaymentAmount, setSalaryPaymentAmount] = useState("");
  const [salaryPaymentNote, setSalaryPaymentNote] = useState("");
  const [salaryPaymentSubmitting, setSalaryPaymentSubmitting] = useState(false);

  // Salary History (per employee) - shown in dialog
  const [salaryHistoryOpen, setSalaryHistoryOpen] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const result = await getEmployees();
      if (result.success && result.data) {
          setEmployees(result.data as EmployeeWithAdvances[]);
      }
    } catch (error) {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.employeeId.includes(search)
  );

  // --- Employee CRUD ---

  const handleOpenCreate = () => {
      setEditingEmployee(null);
      setFormData({ name: "", phone: "", basicSalary: "" });
      setEmployeeDialogOpen(true);
  };

  const handleOpenEdit = (employee: EmployeeWithAdvances) => {
      setEditingEmployee(employee);
      setFormData({
          name: employee.name,
          phone: employee.phone || "",
          basicSalary: employee.basicSalary.toString()
      });
      setEmployeeDialogOpen(true);
  };

  const handleSubmitEmployee = async () => {
      if (!formData.name || !formData.basicSalary) {
          toast.error("Name and monthly salary are required");
          return;
      }
      setSubmitting(true);
      try {
          if (editingEmployee) {
              const res = await updateEmployee(editingEmployee.id, {
                  name: formData.name,
                  phone: formData.phone,
                  basicSalary: Number(formData.basicSalary)
              });
              if (res.success) toast.success("Employee updated");
              else toast.error(res.error);
          } else {
              const res = await createEmployee({
                  name: formData.name,
                  phone: formData.phone,
                  basicSalary: Number(formData.basicSalary)
              });
              if (res.success) toast.success("Employee created (ID auto-generated)");
              else toast.error(res.error);
          }
          setEmployeeDialogOpen(false);
          fetchEmployees();
      } catch (error) {
          toast.error("Operation failed");
      } finally {
          setSubmitting(false);
      }
  };

  // --- Salary Advance ---

  const handleOpenAdvance = (employee: EmployeeWithAdvances) => {
      setSelectedEmployee(employee);
      setAdvanceAmount("");
      setAdvanceNote("");
      setAdvanceDialogOpen(true);
  };

  const handleSubmitAdvance = async () => {
       if (!selectedEmployee || !advanceAmount) return;
       setAdvanceSubmitting(true);
       try {
           const res = await addSalaryAdvance(selectedEmployee.id, Number(advanceAmount), advanceNote);
           if (res.success) {
               toast.success("Salary advance recorded");
               setAdvanceDialogOpen(false);
               fetchEmployees();
           } else toast.error(res.error);
       } catch (error) {
           toast.error("Failed to record advance");
       } finally {
           setAdvanceSubmitting(false);
       }
  };

  const handleOpenSalaryPayment = (employee: EmployeeWithAdvances) => {
      setSelectedEmployee(employee);
      const d = new Date();
      setSalaryForMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      setSalaryPaymentAmount(employee.basicSalary.toString());
      setSalaryPaymentNote("");
      setSalaryPaymentDialogOpen(true);
  };

  const handleSubmitSalaryPayment = async () => {
      if (!selectedEmployee || !salaryForMonth || !salaryPaymentAmount) return;
      setSalaryPaymentSubmitting(true);
      try {
          const [y, m] = salaryForMonth.split("-").map(Number);
          const forMonth = new Date(y, m - 1, 1);
          const res = await recordSalaryPayment(selectedEmployee.id, Number(salaryPaymentAmount), forMonth, salaryPaymentNote);
          if (res.success) {
              toast.success("Salary payment recorded");
              setSalaryPaymentDialogOpen(false);
              fetchEmployees();
          } else toast.error(res.error);
      } catch (error) {
          toast.error("Failed to record salary payment");
      } finally {
          setSalaryPaymentSubmitting(false);
      }
  };

  // Monthly summary: for each month we have basicSalary, sum(salaryPayments), remaining. forMonth can be Date or ISO string.
  const getMonthKey = (forMonth: string | Date): string => {
    if (typeof forMonth === "string") return forMonth.slice(0, 7);
    const d = new Date(forMonth);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const getMonthlySummary = (employee: EmployeeWithAdvances) => {
      const payments = (employee as { salaryPayments?: Array<{ forMonth: string | Date; amount: number }> }).salaryPayments ?? [];
      const byMonth: Record<string, { salary: number; paid: number }> = {};
      const monthly = employee.basicSalary;
      payments.forEach((p: { forMonth: string | Date; amount: number }) => {
          const key = getMonthKey(p.forMonth);
          if (!byMonth[key]) byMonth[key] = { salary: monthly, paid: 0 };
          byMonth[key].paid += p.amount;
      });
      return byMonth;
  };

  return (
    <MainLayout>
       <div className="space-y-6">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
                <p className="text-muted-foreground mt-2">
                    Manage staff details, basic salaries, and salary advances.
                </p>
            </div>
            <Button onClick={handleOpenCreate} className="gap-2">
                <UserPlus className="h-4 w-4" /> Add Employee
            </Button>
        </div>

        <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 text-muted-foreground h-4 w-4" />
                <Input 
                    placeholder="Search by name or ID..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Staff List</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Monthly Salary</TableHead>
                            <TableHead>Paid / Pending</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {loading ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-24">Loading...</TableCell></TableRow>
                        ) : filteredEmployees.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-24">No employees found.</TableCell></TableRow>
                        ) : (
                            filteredEmployees.map(employee => {
                                const salaryPayments = (employee as { salaryPayments?: Array<{ forMonth: string | Date; amount: number }> }).salaryPayments ?? [];
                                const totalPaid = salaryPayments.reduce((s, p) => s + p.amount, 0);
                                const byMonth = getMonthlySummary(employee);
                                const monthsWithPending = Object.entries(byMonth).filter(([, v]) => v.paid < v.salary);
                                const pendingTotal = monthsWithPending.reduce((s, [, v]) => s + (v.salary - v.paid), 0);
                                return (
                                <TableRow key={employee.id}>
                                    <TableCell className="font-mono text-xs">{employee.employeeId}</TableCell>
                                    <TableCell className="font-medium">{employee.name}</TableCell>
                                    <TableCell>{employee.phone || "-"}</TableCell>
                                    <TableCell>Rs. {employee.basicSalary.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <span className="text-green-600">Rs. {totalPaid.toLocaleString()} paid</span>
                                            {pendingTotal > 0 && (
                                                <span className="text-red-600"> / Rs. {pendingTotal.toLocaleString()} pending</span>
                                            )}
                                        </div>
                                        {employee.advances?.length ? (
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                Advances: Rs. {employee.advances.reduce((s, a) => s + a.amount, 0).toLocaleString()}
                                            </div>
                                        ) : null}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="default" size="sm" onClick={() => handleOpenSalaryPayment(employee)} title="Pay Salary">
                                            <Banknote className="h-4 w-4 mr-1" /> Pay Salary
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => handleOpenAdvance(employee)} title="Give Advance">
                                            <Wallet className="h-4 w-4 mr-1" /> Advance
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => { setSelectedEmployee(employee); setSalaryHistoryOpen(true); }}>
                                            <Calendar className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(employee)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );})
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        {/* Create/Edit Modal */}
        <Dialog open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingEmployee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
                    <DialogDescription>
                        Enter staff details below.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {editingEmployee && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Employee ID</label>
                            <Input value={editingEmployee.employeeId} disabled className="bg-muted" />
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Full Name</label>
                        <Input placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Phone</label>
                        <Input placeholder="077..." value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Monthly Salary (Rs)</label>
                        <Input type="number" placeholder="0.00" value={formData.basicSalary} onChange={(e) => setFormData({...formData, basicSalary: e.target.value})} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setEmployeeDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmitEmployee} disabled={submitting}>
                        {submitting ? "Saving..." : "Save Employee"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Advance Modal */}
        <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
             <DialogContent>
                <DialogHeader>
                    <DialogTitle>Salary Advance</DialogTitle>
                    <DialogDescription>Record a cash advance for <b>{selectedEmployee?.name}</b>.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="space-y-2">
                        <label className="text-sm font-medium">Amount (Rs)</label>
                         <Input type="number" placeholder="0.00" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <label className="text-sm font-medium">Note (Optional)</label>
                         <Input placeholder="Reason..." value={advanceNote} onChange={(e) => setAdvanceNote(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                     <Button variant="outline" onClick={() => setAdvanceDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmitAdvance} disabled={advanceSubmitting || !Number(advanceAmount)}>
                        {advanceSubmitting ? "Processing..." : "Confirm Advance"}
                    </Button>
                </DialogFooter>
             </DialogContent>
        </Dialog>

        {/* Salary Payment Modal */}
        <Dialog open={salaryPaymentDialogOpen} onOpenChange={setSalaryPaymentDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Salary Payment</DialogTitle>
                    <DialogDescription>
                        Record partial or full salary for <b>{selectedEmployee?.name}</b> (Monthly: Rs. {selectedEmployee?.basicSalary.toLocaleString()}).
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">For Month</label>
                        <Input type="month" value={salaryForMonth} onChange={(e) => setSalaryForMonth(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Amount (Rs)</label>
                        <Input type="number" placeholder="0.00" value={salaryPaymentAmount} onChange={(e) => setSalaryPaymentAmount(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Note (Optional)</label>
                        <Input placeholder="e.g. Full salary, Partial" value={salaryPaymentNote} onChange={(e) => setSalaryPaymentNote(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setSalaryPaymentDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmitSalaryPayment} disabled={salaryPaymentSubmitting || !salaryForMonth || !Number(salaryPaymentAmount)}>
                        {salaryPaymentSubmitting ? "Saving..." : "Record Payment"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Salary History Modal */}
        <Dialog open={salaryHistoryOpen} onOpenChange={setSalaryHistoryOpen}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Monthly Salary History</DialogTitle>
                    <DialogDescription>{selectedEmployee?.name} — Rs. {selectedEmployee?.basicSalary.toLocaleString()}/month</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {selectedEmployee && (() => {
                        const byMonth = getMonthlySummary(selectedEmployee);
                        const entries = Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a));
                        if (entries.length === 0) {
                            return <p className="text-sm text-muted-foreground">No salary payments recorded yet.</p>;
                        }
                        return (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Month</TableHead>
                                        <TableHead className="text-right">Salary</TableHead>
                                        <TableHead className="text-right">Paid</TableHead>
                                        <TableHead className="text-right">Pending</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {entries.map(([month, v]) => (
                                        <TableRow key={month}>
                                            <TableCell>{format(new Date(month + "-01"), "MMM yyyy")}</TableCell>
                                            <TableCell className="text-right">Rs. {v.salary.toLocaleString()}</TableCell>
                                            <TableCell className="text-right text-green-600">Rs. {v.paid.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{v.paid < v.salary ? <span className="text-red-600">Rs. {(v.salary - v.paid).toLocaleString()}</span> : "—"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        );
                    })()}
                </div>
            </DialogContent>
        </Dialog>

       </div>
    </MainLayout>
  );
}
