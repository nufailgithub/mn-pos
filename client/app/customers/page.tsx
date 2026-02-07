"use client";

import { useState, useEffect, Fragment } from "react";
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
import { Search, DollarSign, History, ChevronDown, ChevronRight, Receipt } from "lucide-react";
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
  const [expandedBillNumber, setExpandedBillNumber] = useState<string | null>(null);

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
      const due = (customer as { totalDebt?: number }).totalDebt ?? 0;
      setPaymentAmount(due > 0 ? String(due) : "");
      setPaymentReference("");
      setPaymentDialogOpen(true);
  };

  const handlePayFullDue = () => {
      const due = (selectedCustomer as { totalDebt?: number })?.totalDebt ?? 0;
      setPaymentAmount(String(due));
  };

  const handleSubmitPayment = async () => {
      if (!selectedCustomer) return;
      const amount = Number(paymentAmount);
      if (!amount || amount <= 0) {
          toast.error("Enter a valid amount");
          return;
      }

      setPaymentSubmitting(true);
      try {
          await addCustomerPayment(selectedCustomer.id, amount, paymentReference || "Debt Repayment");
          toast.success("Payment recorded successfully");
          setPaymentDialogOpen(false);
          fetchCustomers();
          if (historyOpen) {
            const result = await getCustomerById(selectedCustomer.id);
            if (result.success && result.data) setSelectedCustomer(result.data as CustomerWithTransactions);
          }
      } catch (error: unknown) {
          toast.error(error instanceof Error ? error.message : "Failed to record payment");
      } finally {
          setPaymentSubmitting(false);
      }
  };

  const handleOpenHistory = async (customer: CustomerWithTransactions) => {
      setSelectedCustomer(customer);
      setExpandedBillNumber(null);
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

  const openPaymentFromHistory = () => {
      if (selectedCustomer) {
          setPaymentDialogOpen(true);
          const due = (selectedCustomer as { totalDebt?: number }).totalDebt ?? 0;
          setPaymentAmount(due > 0 ? String(due) : "");
          setPaymentReference("");
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
                    Total purchases, amount paid, and balance (due or advance).
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Total Purchases</TableHead>
                            <TableHead>Total Paid</TableHead>
                            <TableHead>Balance (Due / Advance)</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-24">Loading...</TableCell></TableRow>
                        ) : filteredCustomers.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-24">No customers found.</TableCell></TableRow>
                        ) : (
                            filteredCustomers.map(customer => {
                                const debt = (customer as { totalDebt?: number }).totalDebt ?? 0;
                                const advance = (customer as { totalAdvance?: number }).totalAdvance ?? 0;
                                const purchases = (customer as { totalPurchases?: number }).totalPurchases ?? 0;
                                const paid = (customer as { totalPaid?: number }).totalPaid ?? 0;
                                return (
                                <TableRow key={customer.id}>
                                    <TableCell className="font-medium">{customer.name}</TableCell>
                                    <TableCell>{customer.phone}</TableCell>
                                    <TableCell>Rs. {(purchases || 0).toLocaleString()}</TableCell>
                                    <TableCell>Rs. {(paid || 0).toLocaleString()}</TableCell>
                                    <TableCell>
                                        {debt > 0 && <span className="font-bold text-red-600">Due Rs. {debt.toLocaleString()}</span>}
                                        {debt > 0 && advance > 0 && " / "}
                                        {advance > 0 && <span className="font-bold text-green-600">Advance Rs. {advance.toLocaleString()}</span>}
                                        {debt === 0 && advance === 0 && <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenHistory(customer)}>
                                            <History className="h-4 w-4" />
                                        </Button>
                                        {debt > 0 && (
                                            <Button size="sm" onClick={() => handleOpenPayment(customer)} className="gap-1">
                                                <DollarSign className="h-4 w-4" /> Settle
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );})
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        {/* Payment Dialog - Record full or partial payment against customer due */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                        Record a payment from <b>{selectedCustomer?.name}</b>. You can enter the <strong>full due</strong> or <strong>partial</strong> amount. Excess over due will reduce their advance balance.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                         <span className="text-sm">Current Due:</span>
                         <span className="text-lg font-bold text-destructive">Rs. {((selectedCustomer as { totalDebt?: number })?.totalDebt ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Payment Amount (Rs)</label>
                            <Button type="button" variant="outline" size="sm" onClick={handlePayFullDue}>
                                Pay full due
                            </Button>
                        </div>
                        <Input 
                            type="number" 
                            placeholder="Full or partial amount" 
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            min={0}
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
                        {paymentSubmitting ? "Saving..." : "Record Payment"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* History Dialog: Profile summary + Bills with full details + Transactions + Record payment */}
         <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <DialogTitle>Customer Profile — {selectedCustomer?.name}</DialogTitle>
                            <DialogDescription>All purchases, credit details, and payments. Record full or partial payment when the customer pays.</DialogDescription>
                        </div>
                        {((selectedCustomer as { totalDebt?: number })?.totalDebt ?? 0) > 0 && (
                            <Button onClick={openPaymentFromHistory} className="gap-2 shrink-0">
                                <DollarSign className="h-4 w-4" /> Record payment
                            </Button>
                        )}
                    </div>
                </DialogHeader>
                <div className="space-y-6">
                    {!historyLoading && selectedCustomer && (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 border rounded-lg">
                                    <div className="text-xs text-muted-foreground">Total Purchases</div>
                                    <div className="text-lg font-bold">Rs. {((selectedCustomer as { totalPurchases?: number }).totalPurchases ?? 0).toLocaleString()}</div>
                                </div>
                                <div className="p-3 border rounded-lg">
                                    <div className="text-xs text-muted-foreground">Total Paid</div>
                                    <div className="text-lg font-bold">Rs. {((selectedCustomer as { totalPaid?: number }).totalPaid ?? 0).toLocaleString()}</div>
                                </div>
                                <div className="p-3 border rounded-lg">
                                    <div className="text-xs text-muted-foreground">Due</div>
                                    <div className="text-lg font-bold text-red-600">Rs. {((selectedCustomer as { totalDebt?: number }).totalDebt ?? 0).toLocaleString()}</div>
                                </div>
                                <div className="p-3 border rounded-lg">
                                    <div className="text-xs text-muted-foreground">Advance</div>
                                    <div className="text-lg font-bold text-green-600">Rs. {((selectedCustomer as { totalAdvance?: number }).totalAdvance ?? 0).toLocaleString()}</div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Receipt className="h-4 w-4" /> Bills — click a row to see items (Paid / Credit / Balance)
                                </h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-8"></TableHead>
                                            <TableHead>Bill #</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Paid</TableHead>
                                            <TableHead>Credit</TableHead>
                                            <TableHead>Balance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(selectedCustomer as { sales?: Array<{
                                            saleNumber: string;
                                            createdAt: string;
                                            total: number;
                                            balanceAmount: number;
                                            payments?: Array<{ amount: number; method: string }>;
                                            saleItems?: Array<{ quantity: number; price: number; subtotal: number; product?: { name: string; sku: string }; size?: string | null }>;
                                        }> }).sales?.map((sale) => {
                                            const payments = sale.payments ?? [];
                                            const paid = payments.filter((p: { method: string }) => p.method !== "CREDIT").reduce((s: number, p: { amount: number }) => s + p.amount, 0);
                                            const credit = sale.balanceAmount ?? 0;
                                            const balanceLabel = credit > 0 ? `Due Rs.${credit.toLocaleString()}` : "—";
                                            const isExpanded = expandedBillNumber === sale.saleNumber;
                                            const items = sale.saleItems ?? [];
                                            return (
                                                <Fragment key={sale.saleNumber}>
                                                <TableRow
                                                    className="cursor-pointer hover:bg-muted/50"
                                                    onClick={() => setExpandedBillNumber(isExpanded ? null : sale.saleNumber)}
                                                >
                                                    <TableCell className="w-8">
                                                        {items.length > 0 ? (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : null}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">{sale.saleNumber}</TableCell>
                                                    <TableCell>{format(new Date(sale.createdAt), "MMM d, yyyy")}</TableCell>
                                                    <TableCell>Rs. {(sale.total ?? 0).toLocaleString()}</TableCell>
                                                    <TableCell>Rs. {paid.toLocaleString()}</TableCell>
                                                    <TableCell>{credit > 0 ? `Rs. ${credit.toLocaleString()}` : "—"}</TableCell>
                                                    <TableCell>{balanceLabel}</TableCell>
                                                </TableRow>
                                                {isExpanded && items.length > 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={7} className="bg-muted/30 p-4">
                                                            <div className="text-xs font-medium text-muted-foreground mb-2">Bill items</div>
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>Product</TableHead>
                                                                        <TableHead>Size</TableHead>
                                                                        <TableHead className="text-right">Qty</TableHead>
                                                                        <TableHead className="text-right">Unit price</TableHead>
                                                                        <TableHead className="text-right">Subtotal</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {items.map((item, idx) => (
                                                                        <TableRow key={idx}>
                                                                            <TableCell className="font-medium">{item.product?.name ?? "—"}</TableCell>
                                                                            <TableCell>{item.size ?? "—"}</TableCell>
                                                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                                                            <TableCell className="text-right">Rs. {(item.price ?? 0).toLocaleString()}</TableCell>
                                                                            <TableCell className="text-right">Rs. {(item.subtotal ?? 0).toLocaleString()}</TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                </Fragment>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                                {(!(selectedCustomer as { sales?: unknown[] }).sales?.length) && (
                                    <p className="text-sm text-muted-foreground py-4">No bills linked.</p>
                                )}
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold mb-2">Transaction History</h3>
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
                                        {selectedCustomer.transactions?.map((tx: { id: string; type: string; createdAt: string; description: string | null; amount: number }) => (
                                            <TableRow key={tx.id}>
                                                <TableCell>{format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                                                <TableCell>
                                                    <Badge variant={tx.type === "DEBT_INC" ? "destructive" : tx.type === "ADVANCE_INC" ? "default" : "secondary"}>
                                                        {tx.type === "DEBT_INC" ? "Credit" : tx.type === "ADVANCE_INC" ? "Advance" : "Repayment"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="max-w-[200px] truncate" title={tx.description || ""}>{tx.description}</TableCell>
                                                <TableCell className={`text-right font-medium ${tx.type === "DEBT_INC" || tx.type === "ADVANCE_INC" ? "text-red-600" : "text-green-600"}`}>
                                                    {(tx.type === "DEBT_INC" || tx.type === "ADVANCE_INC" ? "+" : "-")} Rs. {tx.amount.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {(!selectedCustomer.transactions || selectedCustomer.transactions.length === 0) && (
                                    <p className="text-sm text-muted-foreground py-4">No transactions.</p>
                                )}
                            </div>
                        </>
                    )}
                    {historyLoading && <p className="text-center py-8 text-muted-foreground">Loading...</p>}
                </div>
            </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
