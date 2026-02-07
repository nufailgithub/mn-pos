"use client";

import { useState, useEffect } from "react";
import MainLayout from "../_components/MainLayout";
import { getCustomers, addCustomerPayment, getCustomerById, type CustomerWithTransactions } from "@/app/actions/customer";
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
import { Search, Plus, DollarSign, History, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithTransactions[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Payment Dialog State
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithTransactions | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // History Dialog State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Fetch all customers for now, filtering can be added to server action later if needed
      const data = await getCustomers();
      setCustomers(data.data as CustomerWithTransactions[]);
    } catch (error) {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  const handleOpenPayment = (customer: CustomerWithTransactions) => {
      setSelectedCustomer(customer);
      setPaymentAmount("");
      setPaymentReference("");
      setPaymentDialogOpen(true);
  };

  const handleSubmitPayment = async () => {
      if (!selectedCustomer) return;
      const amount = Number(paymentAmount);
      if (!amount || amount <= 0) {
          toast.error("Invalid amount");
          return;
      }
      if (amount > selectedCustomer.totalDebt) {
          toast.error("Amount exceeds total debt");
          return;
      }

      setPaymentSubmitting(true);
      try {
          await addCustomerPayment(selectedCustomer.id, amount, paymentReference || "Debt Repayment");
          toast.success("Payment recorded successfully");
          setPaymentDialogOpen(false);
          fetchCustomers(); // Refresh list(and update debt)
      } catch (error: any) {
          toast.error(error.message || "Failed to record payment");
      } finally {
          setPaymentSubmitting(false);
      }
  };

  const handleOpenHistory = async (customer: CustomerWithTransactions) => {
      setSelectedCustomer(customer);
      setHistoryOpen(true);
      setHistoryLoading(true);
      try {
          const result = await getCustomerById(customer.id);
          if (result.success && result.data) {
              setSelectedCustomer(result.data as CustomerWithTransactions);
          } else {
             toast.error("Failed to load history details");
          }
      } catch (error) {
          console.error(error);
          toast.error("Failed to fetch history");
      } finally {
          setHistoryLoading(false);
      }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers & Loans</h1>
          <p className="text-muted-foreground mt-2">
            Manage customer debts and view transaction history.
          </p>
        </div>

        <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 text-muted-foreground h-4 w-4" />
                <Input 
                    placeholder="Search by name or phone..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>
            {/* Could add button to manually add customer if needed, but they are added via sales */}
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Customer List</CardTitle>
                <CardDescription>
                    Customers with outstanding balances are highlighted.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Total Debt</TableHead>
                            <TableHead>Last Transaction</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="text-center h-24">Loading...</TableCell></TableRow>
                        ) : filteredCustomers.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center h-24">No customers found.</TableCell></TableRow>
                        ) : (
                            filteredCustomers.map(customer => (
                                <TableRow key={customer.id}>
                                    <TableCell className="font-medium">{customer.name}</TableCell>
                                    <TableCell>{customer.phone}</TableCell>
                                    <TableCell>
                                        <div className={`font-bold ${customer.totalDebt > 0 ? "text-red-600" : "text-green-600"}`}>
                                            Rs. {customer.totalDebt.toLocaleString()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {customer.transactions && customer.transactions.length > 0 
                                            ? format(new Date(customer.transactions[0].createdAt), "MMM d, yyyy")
                                            : "N/A"
                                        }
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenHistory(customer)}>
                                            <History className="h-4 w-4" />
                                        </Button>
                                        {customer.totalDebt > 0 && (
                                            <Button size="sm" onClick={() => handleOpenPayment(customer)} className="gap-1">
                                                <DollarSign className="h-4 w-4" /> Settle
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Settle Debt</DialogTitle>
                    <DialogDescription>
                        Record a payment from <b>{selectedCustomer?.name}</b> towards their debt.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                         <span className="text-sm">Current Debt:</span>
                         <span className="text-lg font-bold text-destructive">Rs. {selectedCustomer?.totalDebt.toLocaleString()}</span>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Payment Amount (Rs)</label>
                        <Input 
                            type="number" 
                            placeholder="Amount" 
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                    </div>
                     <div className="space-y-2">
                        <label className="text-sm font-medium">Reference (Optional)</label>
                        <Input 
                            placeholder="e.g. Cash, Bank Transfer Ref" 
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmitPayment} disabled={paymentSubmitting || !Number(paymentAmount)}>
                        {paymentSubmitting ? "Processing..." : "Confirm Payment"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* History Dialog */}
         <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Transaction History</DialogTitle>
                    <DialogDescription>History for {selectedCustomer?.name}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                         <TableBody>
                            {historyLoading && (
                                <TableRow><TableCell colSpan={4} className="text-center py-8">Loading history...</TableCell></TableRow>
                            )}
                            {!historyLoading && selectedCustomer?.transactions?.map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell>{format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                                    <TableCell>
                                        <Badge variant={tx.type === "DEBT_INC" ? "destructive" : "secondary"}>
                                            {tx.type === "DEBT_INC" ? "Credit Sale" : "Repayment"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={tx.description || ""}>
                                        {tx.description}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${tx.type === "DEBT_INC" ? "text-red-600" : "text-green-600"}`}>
                                        {tx.type === "DEBT_INC" ? "+" : "-"} Rs. {tx.amount.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!selectedCustomer?.transactions || selectedCustomer.transactions.length === 0) && (
                                <TableRow><TableCell colSpan={4} className="text-center">No transactions found.</TableCell></TableRow>
                            )}
                         </TableBody>
                     </Table>
                </div>
            </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
