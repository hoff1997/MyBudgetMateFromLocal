import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowRightLeft, Plus, Minus, X } from "lucide-react";
import type { Envelope } from "@shared/schema";

const transferSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  description: z.string().min(1, "Description is required"),
  transfers: z.array(z.object({
    envelopeId: z.number(),
    type: z.enum(["debit", "credit"]),
    amount: z.string(),
  })).min(2, "At least one debit and one credit required"),
});

type TransferForm = z.infer<typeof transferSchema>;

interface EnvelopeTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EnvelopeTransferDialog({ open, onOpenChange }: EnvelopeTransferDialogProps) {
  const [transferEntries, setTransferEntries] = useState([
    { id: 1, envelopeId: 0, type: "debit" as const, amount: "" },
    { id: 2, envelopeId: 0, type: "credit" as const, amount: "" },
  ]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: envelopes = [] } = useQuery({
    queryKey: ['/api/envelopes'],
  });

  const form = useForm<TransferForm>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      amount: "",
      description: "",
      transfers: [],
    },
  });

  const addTransferEntry = (type: "debit" | "credit") => {
    const newId = Math.max(...transferEntries.map(e => e.id)) + 1;
    setTransferEntries([...transferEntries, {
      id: newId,
      envelopeId: 0,
      type,
      amount: ""
    }]);
  };

  const removeTransferEntry = (id: number) => {
    if (transferEntries.length > 2) {
      setTransferEntries(transferEntries.filter(e => e.id !== id));
    }
  };

  const updateTransferEntry = (id: number, field: string, value: any) => {
    setTransferEntries(transferEntries.map(e => 
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  // Calculate totals
  const debitTotal = transferEntries
    .filter(e => e.type === "debit")
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  
  const creditTotal = transferEntries
    .filter(e => e.type === "credit")
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const isBalanced = Math.abs(debitTotal - creditTotal) < 0.01 && debitTotal > 0;

  const createTransferMutation = useMutation({
    mutationFn: async (data: TransferForm) => {
      // Create individual transactions for each transfer
      const promises = transferEntries
        .filter(entry => entry.envelopeId > 0 && parseFloat(entry.amount) > 0)
        .map(entry => {
          const amount = parseFloat(entry.amount);
          return apiRequest("POST", "/api/envelope-transfers", {
            envelopeId: entry.envelopeId,
            amount: entry.type === "debit" ? -amount : amount,
            description: data.description,
            type: "transfer"
          });
        });

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      onOpenChange(false);
      form.reset();
      setTransferEntries([
        { id: 1, envelopeId: 0, type: "debit", amount: "" },
        { id: 2, envelopeId: 0, type: "credit", amount: "" },
      ]);
      toast({
        title: "Transfer completed",
        description: "Envelope balances have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete transfer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransferForm) => {
    if (!isBalanced) {
      toast({
        title: "Transfer not balanced",
        description: "Total debits must equal total credits.",
        variant: "destructive",
      });
      return;
    }
    
    createTransferMutation.mutate(data);
  };

  const getEnvelopeName = (envelopeId: number) => {
    const envelope = envelopes.find(e => e.id === envelopeId);
    return envelope ? `${envelope.icon} ${envelope.name}` : "Select envelope...";
  };

  const getEnvelopeBalance = (envelopeId: number) => {
    const envelope = envelopes.find(e => e.id === envelopeId);
    return envelope ? parseFloat(envelope.currentBalance) : 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <DialogTitle>Transfer Between Envelopes</DialogTitle>
          </div>
          <DialogDescription>
            Move money between envelopes using double-entry bookkeeping. Debits decrease balances, credits increase them.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer Description</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., Cover groceries overspend with emergency fund" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ledger View */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Transfer Ledger</h3>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTransferEntry("debit")}
                  >
                    <Minus className="h-4 w-4 mr-1" />
                    Add Debit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTransferEntry("credit")}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Credit
                  </Button>
                </div>
              </div>

              {/* Ledger Headers */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground">
                <div className="col-span-5">Envelope</div>
                <div className="col-span-2 text-center">Current Balance</div>
                <div className="col-span-2 text-center">Debit (-)</div>
                <div className="col-span-2 text-center">Credit (+)</div>
                <div className="col-span-1"></div>
              </div>

              {/* Transfer Entries */}
              <div className="space-y-2">
                {transferEntries.map((entry) => (
                  <div key={entry.id} className="grid grid-cols-12 gap-4 px-4 py-3 border rounded-lg">
                    {/* Envelope Selection */}
                    <div className="col-span-5">
                      <Select
                        value={entry.envelopeId?.toString() || ""}
                        onValueChange={(value) => updateTransferEntry(entry.id, 'envelopeId', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select envelope..." />
                        </SelectTrigger>
                        <SelectContent>
                          {envelopes.map((envelope) => (
                            <SelectItem key={envelope.id} value={envelope.id.toString()}>
                              {envelope.icon} {envelope.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Current Balance */}
                    <div className="col-span-2 flex items-center justify-center">
                      <span className={`text-sm font-medium ${
                        getEnvelopeBalance(entry.envelopeId) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${getEnvelopeBalance(entry.envelopeId).toFixed(2)}
                      </span>
                    </div>

                    {/* Debit Amount */}
                    <div className="col-span-2">
                      {entry.type === "debit" ? (
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={entry.amount}
                          onChange={(e) => updateTransferEntry(entry.id, 'amount', e.target.value)}
                          className="text-center"
                        />
                      ) : (
                        <div className="text-center text-muted-foreground">-</div>
                      )}
                    </div>

                    {/* Credit Amount */}
                    <div className="col-span-2">
                      {entry.type === "credit" ? (
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={entry.amount}
                          onChange={(e) => updateTransferEntry(entry.id, 'amount', e.target.value)}
                          className="text-center"
                        />
                      ) : (
                        <div className="text-center text-muted-foreground">-</div>
                      )}
                    </div>

                    {/* Remove Button */}
                    <div className="col-span-1 flex items-center justify-center">
                      {transferEntries.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTransferEntry(entry.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/30 rounded-lg font-medium">
                <div className="col-span-5 text-right">Totals:</div>
                <div className="col-span-2"></div>
                <div className="col-span-2 text-center text-red-600">
                  ${debitTotal.toFixed(2)}
                </div>
                <div className="col-span-2 text-center text-green-600">
                  ${creditTotal.toFixed(2)}
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <Badge variant={isBalanced ? "secondary" : "destructive"} className={isBalanced ? "bg-green-100 text-green-800" : ""}>
                    {isBalanced ? "Balanced" : "Unbalanced"}
                  </Badge>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createTransferMutation.isPending || !isBalanced}
              >
                {createTransferMutation.isPending ? "Processing..." : "Complete Transfer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}