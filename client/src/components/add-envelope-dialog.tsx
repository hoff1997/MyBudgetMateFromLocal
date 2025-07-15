import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { EnvelopeCategory } from "@shared/schema";
import { calculateNextPaymentDate } from "@shared/dateUtils";

const addEnvelopeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  icon: z.string().min(1, "Icon is required"),
  budgetedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  openingBalance: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
  budgetFrequency: z.enum(["weekly", "fortnightly", "monthly", "quarterly", "annual"]),
  nextPaymentDue: z.date().optional(),
  isSpendingAccount: z.boolean(),
  isMonitored: z.boolean(),
  categoryId: z.number().nullable(),
  notes: z.string().optional(),
});

type AddEnvelopeForm = z.infer<typeof addEnvelopeSchema>;

interface AddEnvelopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnvelopeCreated?: (envelopeId: number) => void;
  transactionAmount?: string; // Pre-fill budget with transaction amount
}

const frequencyOptions = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

const iconOptions = [
  "💰", "🏠", "🚗", "🛒", "⚡", "📱", "🍔", "🎬", "👕", "🎓",
  "💊", "🏥", "✈️", "⛽", "💳", "🎯", "🎁", "📚", "🔧", "🌟"
];

export default function AddEnvelopeDialog({ 
  open, 
  onOpenChange, 
  onEnvelopeCreated,
  transactionAmount 
}: AddEnvelopeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery<EnvelopeCategory[]>({
    queryKey: ['/api/envelope-categories'],
  });

  const form = useForm<AddEnvelopeForm>({
    resolver: zodResolver(addEnvelopeSchema),
    defaultValues: {
      name: "",
      icon: "💰",
      budgetedAmount: transactionAmount || "0.00",
      openingBalance: "0.00",
      budgetFrequency: "monthly",
      nextPaymentDue: undefined,
      isSpendingAccount: false,
      isMonitored: false,
      categoryId: null,
      notes: "",
    },
  });

  // Update budget amount when transaction amount changes
  useEffect(() => {
    if (transactionAmount && open) {
      form.setValue("budgetedAmount", transactionAmount);
    }
  }, [transactionAmount, open, form]);

  const createEnvelopeMutation = useMutation({
    mutationFn: async (data: AddEnvelopeForm) => {
      const envelopeData = {
        name: data.name,
        icon: data.icon,
        budgetedAmount: data.budgetedAmount,
        currentBalance: data.openingBalance, // Opening balance becomes current balance
        openingBalance: data.openingBalance,
        budgetFrequency: data.budgetFrequency,
        nextPaymentDue: data.nextPaymentDue ? data.nextPaymentDue.toISOString() : null,
        isSpendingAccount: data.isSpendingAccount,
        isMonitored: data.isMonitored,
        categoryId: data.categoryId,
        notes: data.notes || null,
        isActive: true
      };
      
      return apiRequest('POST', '/api/envelopes', envelopeData);
    },
    onSuccess: (newEnvelope) => {
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      toast({
        title: "Envelope created",
        description: `${form.getValues('name')} envelope has been created successfully.`,
      });
      
      if (onEnvelopeCreated) {
        onEnvelopeCreated(newEnvelope.id);
      }
      
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create envelope. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    form.reset({
      name: "",
      icon: "💰",
      budgetedAmount: transactionAmount || "0.00",
      openingBalance: "0.00",
      budgetFrequency: "monthly",
      nextPaymentDue: undefined,
      isSpendingAccount: false,
      isMonitored: false,
      categoryId: null,
      notes: "",
    });
    onOpenChange(false);
  };

  const onSubmit = (data: AddEnvelopeForm) => {
    createEnvelopeMutation.mutate(data);
  };

  const isSpendingAccount = form.watch("isSpendingAccount");
  const budgetFrequency = form.watch("budgetFrequency");

  const handleCalculateNextDue = () => {
    const currentDue = form.getValues("nextPaymentDue");
    const nextDue = calculateNextPaymentDate(budgetFrequency, currentDue);
    form.setValue("nextPaymentDue", nextDue);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Envelope</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Envelope name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <div className="grid grid-cols-10 gap-2">
                    {iconOptions.map((icon) => (
                      <Button
                        key={icon}
                        type="button"
                        variant={field.value === icon ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => field.onChange(icon)}
                      >
                        {icon}
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select 
                    value={field.value?.toString() || ""} 
                    onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
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
              name="openingBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opening Balance</FormLabel>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Add any notes about this envelope..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isSpendingAccount"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Spending Account (No predicted spend budget)
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isMonitored"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Monitor on Dashboard
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Show this envelope in the dashboard monitoring widget
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {!isSpendingAccount && (
              <>
                <FormField
                  control={form.control}
                  name="budgetedAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field} 
                        />
                      </FormControl>
                      {transactionAmount && (
                        <p className="text-xs text-muted-foreground">
                          Suggested from transaction: ${transactionAmount}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budgetFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Frequency</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {frequencyOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                  name="nextPaymentDue"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "flex-1 pl-3 text-left font-normal",
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
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleCalculateNextDue}
                          title="Calculate next due date based on frequency"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use the refresh button to auto-calculate the next {budgetFrequency} payment
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEnvelopeMutation.isPending}>
                {createEnvelopeMutation.isPending ? "Creating..." : "Create Envelope"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export { AddEnvelopeDialog };