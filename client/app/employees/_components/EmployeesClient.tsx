"use client";

import { useState, useEffect } from "react";
import MainLayout from "../../_components/MainLayout"; // Adjust path as needed
import { 
    getEmployees, 
    createEmployee, 
    updateEmployee, 
    addSalaryAdvance,
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
import { Search, Plus, DollarSign, UserPlus, Pencil, Wallet } from "lucide-react";
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
      employeeId: "",
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
      setFormData({ employeeId: "", name: "", phone: "", basicSalary: "" });
      setEmployeeDialogOpen(true);
  };

  const handleOpenEdit = (employee: EmployeeWithAdvances) => {
      setEditingEmployee(employee);
      setFormData({
          employeeId: employee.employeeId,
          name: employee.name,
          phone: employee.phone || "",
          basicSalary: employee.basicSalary.toString()
      });
      setEmployeeDialogOpen(true);
  };

  const handleSubmitEmployee = async () => {
      if (!formData.employeeId || !formData.name || !formData.basicSalary) {
          toast.error("Please fill required fields");
          return;
      }

      setSubmitting(true);
      try {
          if (editingEmployee) {
              // Update
              const res = await updateEmployee(editingEmployee.id, {
                  name: formData.name,
                  phone: formData.phone,
                  basicSalary: Number(formData.basicSalary)
              });
              if (res.success) toast.success("Employee updated");
              else toast.error(res.error);
          } else {
              // Create
              const res = await createEmployee({
                  employeeId: formData.employeeId,
                  name: formData.name,
                  phone: formData.phone,
                  basicSalary: Number(formData.basicSalary)
              });
               if (res.success) toast.success("Employee created");
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
           } else {
               toast.error(res.error);
           }
       } catch (error) {
           toast.error("Failed to record advance");
       } finally {
           setAdvanceSubmitting(false);
       }
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
                            <TableHead>Basic Salary</TableHead>
                            <TableHead>Recent Advances</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {loading ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-24">Loading...</TableCell></TableRow>
                        ) : filteredEmployees.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-24">No employees found.</TableCell></TableRow>
                        ) : (
                            filteredEmployees.map(employee => (
                                <TableRow key={employee.id}>
                                    <TableCell className="font-mono text-xs">{employee.employeeId}</TableCell>
                                    <TableCell className="font-medium">{employee.name}</TableCell>
                                    <TableCell>{employee.phone || "-"}</TableCell>
                                    <TableCell>Rs. {employee.basicSalary.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {employee.advances && employee.advances.length > 0 ? (
                                                employee.advances.slice(0, 2).map(adv => (
                                                    <div key={adv.id} className="text-xs text-muted-foreground">
                                                        Rs. {adv.amount} ({format(new Date(adv.date), "MMM d")})
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-xs text-muted-foreground">None</span>
                                            )}
                                            {(employee._count?.advances || 0) > 2 && (
                                                <span className="text-xs text-blue-600">+{ (employee._count?.advances || 0) - 2 } more</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => handleOpenAdvance(employee)} title="Give Advance">
                                            <Wallet className="h-4 w-4 mr-1" /> Advance
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(employee)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
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
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-sm font-medium">Employee ID</label>
                            <Input 
                                placeholder="E001" 
                                value={formData.employeeId}
                                onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                                disabled={!!editingEmployee} // ID immutable on edit
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Basic Salary</label>
                             <Input 
                                type="number"
                                placeholder="0.00" 
                                value={formData.basicSalary}
                                onChange={(e) => setFormData({...formData, basicSalary: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Full Name</label>
                        <Input 
                            placeholder="John Doe" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                     <div className="space-y-2">
                        <label className="text-sm font-medium">Phone</label>
                        <Input 
                            placeholder="077..." 
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
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
                    <DialogDescription>
                        Record a cash advance for <b>{selectedEmployee?.name}</b>.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="space-y-2">
                        <label className="text-sm font-medium">Amount (Rs)</label>
                         <Input 
                            type="number"
                            placeholder="0.00" 
                            value={advanceAmount}
                            onChange={(e) => setAdvanceAmount(e.target.value)}
                        />
                    </div>
                     <div className="space-y-2">
                        <label className="text-sm font-medium">Note (Optional)</label>
                         <Input 
                            placeholder="Reason..." 
                            value={advanceNote}
                            onChange={(e) => setAdvanceNote(e.target.value)}
                        />
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

       </div>
    </MainLayout>
  );
}
