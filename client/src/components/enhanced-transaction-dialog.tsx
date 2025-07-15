import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CalendarIcon, Check, ChevronsUpDown, Plus, Minus, Upload, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

const transactionSchema = z.object({
  accountId: z.number().min(1, "Account is required"),
  amount: z.string().min(1, "Amount is required"),
  merchant: z.string().min(1, "Merchant is required"),
  description: z.string().optional(),
  date: z.date(),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(["weekly", "fortnightly", "monthly", "quarterly", "annual"]).optional(),
  recurringEndDate: z.date().optional(),
  recurringName: z.string().optional(),
  envelopes: z.array(z.object({
    envelopeId: z.number(),
    amount: z.string(),
  })).min(1, "At least one envelope is required"),
});

type TransactionForm = z.infer<typeof transactionSchema>;

interface EnhancedTransactionDialogProps {
  children: React.ReactNode;
  defaultValues?: Partial<TransactionForm>;
  title?: string;
  isIncome?: boolean;
  onSuccess?: () => void;
}

export function EnhancedTransactionDialog({ 
  children, 
  defaultValues, 
  title = "Add Transaction",
  isIncome = false,
  onSuccess 
}: EnhancedTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [envelopeSearchOpen, setEnvelopeSearchOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date(),
      isRecurring: false,
      envelopes: [{ envelopeId: 0, amount: "" }],
      ...defaultValues,
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/accounts'],
  });

  const { data: envelopes = [] } = useQuery({
    queryKey: ['/api/envelopes'],
  });

  const { data: merchantMemory = [] } = useQuery({
    queryKey: ['/api/merchant-memory'],
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionForm) => {
      const formData = new FormData();
      
      // Handle recurring transaction creation
      if (data.isRecurring && data.recurringFrequency && data.recurringName) {
        const recurringData = {
          userId: 1,
          accountId: data.accountId,
          name: data.recurringName,
          amount: data.amount,
          merchant: data.merchant,
          description: data.description,
          frequency: data.recurringFrequency,
          nextDate: data.date,
          endDate: data.recurringEndDate,
          isIncome: isIncome,
          isActive: true,
        };

        const recurringResponse = await apiRequest("POST", "/api/recurring-transactions", recurringData);
        const recurringTransaction = await recurringResponse.json();

        // Create recurring transaction splits
        for (const envelope of data.envelopes) {
          if (envelope.envelopeId && envelope.amount) {
            await apiRequest("POST", "/api/recurring-transaction-splits", {
              recurringTransactionId: recurringTransaction.id,
              envelopeId: envelope.envelopeId,
              amount: envelope.amount,
            });
          }
        }

        // Also create the first transaction instance
        const transactionData = {
          userId: 1,
          accountId: data.accountId,
          amount: data.amount,
          merchant: data.merchant,
          description: data.description,
          date: data.date,
          envelopes: data.envelopes,
        };

        if (receiptFile) {
          formData.append('receipt', receiptFile);
          formData.append('data', JSON.stringify(transactionData));
          return apiRequest("POST", "/api/transactions", formData);
        } else {
          return apiRequest("POST", "/api/transactions", transactionData);
        }
      } else {
        // Regular one-time transaction
        const transactionData = {
          userId: 1,
          accountId: data.accountId,
          amount: data.amount,
          merchant: data.merchant,
          description: data.description,
          date: data.date,
          envelopes: data.envelopes,
        };

        if (receiptFile) {
          formData.append('receipt', receiptFile);
          formData.append('data', JSON.stringify(transactionData));
          return apiRequest("POST", "/api/transactions", formData);
        } else {
          return apiRequest("POST", "/api/transactions", transactionData);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      toast({
        title: "Success",
        description: form.watch("isRecurring") 
          ? "Recurring transaction created successfully" 
          : "Transaction created successfully",
      });
      setOpen(false);
      form.reset();
      setReceiptFile(null);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create transaction",
        variant: "destructive",
      });
    },
  });

  const watchAmount = form.watch("amount");
  const watchEnvelopes = form.watch("envelopes");
  const watchIsRecurring = form.watch("isRecurring");
  const watchMerchant = form.watch("merchant");

  // Auto-suggest envelope based on merchant memory
  useEffect(() => {
    if (watchMerchant && merchantMemory.length > 0) {
      const memory = merchantMemory.find((m: any) => 
        m.merchant.toLowerCase().includes(watchMerchant.toLowerCase())
      );
      if (memory && form.watch("envelopes")[0]?.envelopeId === 0) {
        form.setValue("envelopes.0.envelopeId", memory.lastEnvelopeId);
        form.setValue("envelopes.0.amount", watchAmount || "");
      }
    }
  }, [watchMerchant, merchantMemory, watchAmount]);

  // Calculate envelope allocation
  const totalAllocated = watchEnvelopes.reduce((sum, env) => {
    return sum + (parseFloat(env.amount) || 0);
  }, 0);
  const remaining = (parseFloat(watchAmount) || 0) - totalAllocated;

  const addEnvelopeAllocation = () => {
    const currentAllocations = form.getValues("envelopes");
    form.setValue("envelopes", [...currentAllocations, { envelopeId: 0, amount: "" }]);
  };

  const removeEnvelopeAllocation = (index: number) => {
    const currentAllocations = form.getValues("envelopes");
    if (currentAllocations.length > 1) {
      form.setValue("envelopes", currentAllocations.filter((_, i) => i !== index));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      setReceiptFile(file);
    }
  };

  const calculateNextDate = (frequency: string, fromDate: Date): Date => {
    const next = new Date(fromDate);
    switch (frequency) {
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "fortnightly":
        next.setDate(next.getDate() + 14);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
      case "quarterly":
        next.setMonth(next.getMonth() + 3);
        break;
      case "annual":
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createTransactionMutation.mutate(data))} className="space-y-4">
            {/* Account Selection */}
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account: any) => (
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

            {/* Amount and Date */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
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
                            date > new Date() || date < new Date("1900-01-01")
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

            {/* Merchant and Description */}
            <FormField
              control={form.control}
              name="merchant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Merchant</FormLabel>
                  <FormControl>
                    <Input placeholder="Store or merchant name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional details about this transaction"
                      className="min-h-[60px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurring Transaction Options */}
            <Card>
              <CardContent className="pt-4">
                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          <RotateCw className="h-4 w-4" />
                          Make this a recurring transaction
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Set up automatic transactions with the same envelope allocation
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {watchIsRecurring && (
                  <div className="mt-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="recurringName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recurring Transaction Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Monthly Salary, Weekly Groceries"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="recurringFrequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Frequency</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="fortnightly">Fortnightly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                <SelectItem value="annual">Annual</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recurringEndDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date (Optional)</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "dd/MM/yyyy")
                                    ) : (
                                      <span>No end date</span>
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
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {form.watch("recurringFrequency") && form.watch("date") && (
                      <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                        <strong>Next occurrence:</strong> {format(
                          calculateNextDate(form.watch("recurringFrequency")!, form.watch("date")), 
                          "dd/MM/yyyy"
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Envelope Allocation */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Envelope Allocation</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEnvelopeAllocation}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Split
                </Button>
              </div>

              {watchEnvelopes.map((_, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <FormField
                    control={form.control}
                    name={`envelopes.${index}.envelopeId`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className={index > 0 ? "sr-only" : ""}>
                          Envelope
                        </FormLabel>
                        <Popover open={envelopeSearchOpen} onOpenChange={setEnvelopeSearchOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                              >
                                {field.value
                                  ? envelopes.find((env: any) => env.id === field.value)?.name
                                  : "Select envelope..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search envelopes..." />
                              <CommandEmpty>No envelope found.</CommandEmpty>
                              <CommandGroup>
                                {envelopes.map((envelope: any) => (
                                  <CommandItem
                                    key={envelope.id}
                                    value={envelope.name}
                                    onSelect={() => {
                                      field.onChange(envelope.id);
                                      setEnvelopeSearchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === envelope.id
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {envelope.icon} {envelope.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`envelopes.${index}.amount`}
                    render={({ field }) => (
                      <FormItem className="w-32">
                        <FormLabel className={index > 0 ? "sr-only" : ""}>
                          Amount
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchEnvelopes.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeEnvelopeAllocation(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {/* Allocation Summary */}
              {watchAmount && (
                <div className="bg-slate-50 p-3 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Transaction Amount:</span>
                    <span>${parseFloat(watchAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Allocated:</span>
                    <span>${totalAllocated.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className={cn(
                    "flex justify-between font-medium",
                    remaining === 0 ? "text-green-600" : remaining > 0 ? "text-blue-600" : "text-red-600"
                  )}>
                    <span>
                      {remaining === 0 ? "Fully Allocated" : remaining > 0 ? "Remaining" : "Over Allocated"}:
                    </span>
                    <span>${Math.abs(remaining).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Receipt Upload */}
            <div className="space-y-2">
              <FormLabel>Receipt (Optional)</FormLabel>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-medium"
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              {receiptFile && (
                <div className="text-sm text-green-600">
                  Receipt selected: {receiptFile.name}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTransactionMutation.isPending || remaining !== 0}
              >
                {createTransactionMutation.isPending ? "Creating..." : 
                 watchIsRecurring ? "Create Recurring Transaction" : "Create Transaction"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}