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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Trash2, DollarSign, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const recurringIncomeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.string().min(1, "Amount is required"),
  frequency: z.enum(["weekly", "fortnightly", "monthly"]),
  nextDate: z.date(),
  accountId: z.number().min(1, "Account is required"),
  surplusEnvelopeId: z.number().optional(),
  splits: z.array(z.object({
    envelopeId: z.number(),
    amount: z.string(),
  })).min(1, "At least one split is required"),
});

type RecurringIncomeForm = z.infer<typeof recurringIncomeSchema>;

interface CreateRecurringIncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateRecurringIncomeDialog({ open, onOpenChange }: CreateRecurringIncomeDialogProps) {
  const [splits, setSplits] = useState([{ id: 1, envelopeId: 0, amount: "" }]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/accounts'],
  });

  const { data: envelopes = [] } = useQuery({
    queryKey: ['/api/envelopes'],
  });

  const form = useForm<RecurringIncomeForm>({
    resolver: zodResolver(recurringIncomeSchema),
    defaultValues: {
      name: "",
      amount: "",
      frequency: "fortnightly",
      nextDate: new Date(),
      accountId: 0,
      surplusEnvelopeId: undefined,
      splits: [],
    },
  });

  const createRecurringIncomeMutation = useMutation({
    mutationFn: async (data: RecurringIncomeForm) => {
      return apiRequest("POST", "/api/recurring-transactions", {
        ...data,
        splits: splits.filter(split => split.envelopeId > 0 && split.amount),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-transactions'] });
      onOpenChange(false);
      form.reset();
      setSplits([{ id: 1, envelopeId: 0, amount: "" }]);
      toast({
        title: "Recurring income created",
        description: "Your salary splits have been set up successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create recurring income. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addSplit = () => {
    const newId = Math.max(...splits.map(s => s.id)) + 1;
    setSplits([...splits, { id: newId, envelopeId: 0, amount: "" }]);
  };

  const removeSplit = (id: number) => {
    if (splits.length > 1) {
      setSplits(splits.filter(s => s.id !== id));
    }
  };

  const updateSplit = (id: number, field: string, value: any) => {
    setSplits(splits.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const totalSplitAmount = splits.reduce((sum, split) => {
    return sum + (parseFloat(split.amount) || 0);
  }, 0);

  const totalIncomeAmount = parseFloat(form.watch("amount")) || 0;
  const surplusAmount = totalIncomeAmount - totalSplitAmount;

  const onSubmit = (data: RecurringIncomeForm) => {
    createRecurringIncomeMutation.mutate({
      ...data,
      splits: splits.filter(split => split.envelopeId > 0 && split.amount),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <DialogTitle>Create Recurring Income</DialogTitle>
          </div>
          <DialogDescription>
            Set up automatic salary splits that distribute income to your envelopes. Any surplus will go to your selected envelope.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Income Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., John's Salary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Amount</FormLabel>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="fortnightly">Fortnightly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposit Account</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Payment Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="surplusEnvelopeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Surplus Envelope (Optional)</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Where should surplus money go?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No surplus envelope</SelectItem>
                      {envelopes.map((envelope) => (
                        <SelectItem key={envelope.id} value={envelope.id.toString()}>
                          {envelope.icon} {envelope.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Envelope Splits */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Envelope Splits</h3>
                <Button type="button" variant="outline" size="sm" onClick={addSplit}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Split
                </Button>
              </div>

              <div className="space-y-3">
                {splits.map((split, index) => (
                  <div key={split.id} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-6">
                      <Select
                        value={split.envelopeId?.toString() || ""}
                        onValueChange={(value) => updateSplit(split.id, 'envelopeId', parseInt(value))}
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
                    
                    <div className="col-span-4">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={split.amount}
                        onChange={(e) => updateSplit(split.id, 'amount', e.target.value)}
                      />
                    </div>
                    
                    <div className="col-span-2">
                      {splits.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeSplit(split.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Income:</span>
                  <span className="font-medium">${totalIncomeAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Allocated:</span>
                  <span className="font-medium">${totalSplitAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span>Available for Surplus:</span>
                  <span className={`font-medium ${surplusAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${surplusAmount.toFixed(2)}
                  </span>
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
                disabled={createRecurringIncomeMutation.isPending}
              >
                {createRecurringIncomeMutation.isPending ? "Creating..." : "Create Recurring Income"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}