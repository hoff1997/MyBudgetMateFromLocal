import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DollarSign, TrendingUp, Zap } from "lucide-react";
import { format } from "date-fns";

const processIncomeSchema = z.object({
  actualAmount: z.string().min(1, "Amount is required"),
});

type ProcessIncomeForm = z.infer<typeof processIncomeSchema>;

interface ProcessRecurringIncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any;
}

export default function ProcessRecurringIncomeDialog({ 
  open, 
  onOpenChange, 
  transaction 
}: ProcessRecurringIncomeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProcessIncomeForm>({
    resolver: zodResolver(processIncomeSchema),
    defaultValues: {
      actualAmount: transaction?.amount || "",
    },
  });

  // Reset form when transaction changes
  React.useEffect(() => {
    if (transaction) {
      form.reset({
        actualAmount: transaction.amount || "",
      });
    }
  }, [transaction, form]);

  const processRecurringIncomeMutation = useMutation({
    mutationFn: async (data: ProcessIncomeForm) => {
      return apiRequest("POST", `/api/recurring-transactions/${transaction.id}/process`, {
        actualAmount: data.actualAmount,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      onOpenChange(false);
      form.reset();
      
      toast({
        title: "Income processed successfully",
        description: `${transaction?.name} has been distributed to your envelopes. Surplus: $${response.surplus}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process recurring income. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProcessIncomeForm) => {
    processRecurringIncomeMutation.mutate(data);
  };

  if (!transaction) return null;

  const expectedAmount = parseFloat(transaction.amount);
  const actualAmount = parseFloat(form.watch("actualAmount")) || 0;
  const totalSplits = transaction.splits?.reduce((sum: number, split: any) => 
    sum + parseFloat(split.amount), 0) || 0;
  const surplus = actualAmount - totalSplits;
  const isBonus = actualAmount > expectedAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-primary" />
            <DialogTitle>Process {transaction.name}</DialogTitle>
          </div>
          <DialogDescription>
            Enter the actual amount received and distribute it to your envelopes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Info */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Expected Amount:</span>
              <span className="font-medium">${expectedAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Due Date:</span>
              <span className="font-medium">
                {format(new Date(transaction.nextDate), 'MMM dd, yyyy')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Envelope Allocations:</span>
              <span className="font-medium">${totalSplits.toFixed(2)}</span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="actualAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Amount Received</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.01" 
                        placeholder="3000.00" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Live Calculation */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <h4 className="font-medium">Distribution Preview:</h4>
                
                {/* Envelope Splits */}
                {transaction.splits?.map((split: any) => (
                  <div key={split.id} className="flex justify-between text-sm">
                    <span>{split.envelope?.name || `Envelope ${split.envelopeId}`}:</span>
                    <span className="font-medium text-green-600">
                      +${parseFloat(split.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
                
                {/* Surplus */}
                {surplus !== 0 && (
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="flex items-center">
                      {isBonus && <TrendingUp className="h-3 w-3 mr-1 text-green-600" />}
                      Surplus:
                    </span>
                    <span className={`font-medium ${surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {surplus >= 0 ? '+' : ''}${surplus.toFixed(2)}
                    </span>
                  </div>
                )}
                
                {isBonus && (
                  <div className="text-xs text-green-600 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Bonus detected! Extra ${(actualAmount - expectedAmount).toFixed(2)} will go to surplus envelope.
                  </div>
                )}
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
                  disabled={processRecurringIncomeMutation.isPending || actualAmount <= 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processRecurringIncomeMutation.isPending ? "Processing..." : "Process Income"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}