import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { calculateNextPaymentDate, getNextDueDate } from "@shared/dateUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import type { Envelope, EnvelopeCategory } from "@shared/schema";

const editEnvelopeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  icon: z.string().min(1, "Icon is required"),
  targetAmount: z.string().min(1, "Due amount is required"),
  openingBalance: z.string().min(1, "Opening balance is required"),
  budgetFrequency: z.enum(["weekly", "fortnightly", "monthly", "quarterly", "annual"]),
  nextPaymentDue: z.date().optional(),
  isSpendingAccount: z.boolean(),
  isMonitored: z.boolean(),
  categoryId: z.number().nullable(),
  notes: z.string().optional(),
});

type EditEnvelopeForm = z.infer<typeof editEnvelopeSchema>;

interface EditEnvelopeDialogProps {
  envelope: Envelope | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export default function EditEnvelopeDialog({ envelope, open, onOpenChange }: EditEnvelopeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery<EnvelopeCategory[]>({
    queryKey: ['/api/envelope-categories'],
  });

  const form = useForm<EditEnvelopeForm>({
    resolver: zodResolver(editEnvelopeSchema),
    defaultValues: {
      name: "",
      icon: "💰",
      targetAmount: "0.00",
      openingBalance: "0.00",
      budgetFrequency: "monthly",
      nextPaymentDue: undefined,
      isSpendingAccount: false,
      isMonitored: false,
      categoryId: null,
      notes: "",
    },
  });

  // Update form when envelope changes
  useEffect(() => {
    if (envelope && open) {
      const nextDue = envelope.nextPaymentDue 
        ? getNextDueDate(envelope.budgetFrequency || "monthly", envelope.nextPaymentDue)
        : undefined;
        
      form.reset({
        name: envelope.name,
        icon: envelope.icon || "💰",
        targetAmount: envelope.targetAmount || "0.00",
        openingBalance: envelope.openingBalance || "0.00",
        budgetFrequency: envelope.budgetFrequency as any || "monthly",
        nextPaymentDue: nextDue,
        isSpendingAccount: envelope.isSpendingAccount || false,
        isMonitored: envelope.isMonitored || false,
        categoryId: envelope.categoryId,
        notes: envelope.notes || "",
      });
    }
  }, [envelope, open, form]);

  const updateEnvelopeMutation = useMutation({
    mutationFn: async (data: EditEnvelopeForm) => {
      if (!envelope) throw new Error("No envelope to update");
      
      const updateData = {
        ...data,
        nextPaymentDue: data.nextPaymentDue ? data.nextPaymentDue.toISOString() : null,
      };
      
      return apiRequest("PATCH", `/api/envelopes/${envelope.id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      toast({
        title: "Success",
        description: "Envelope updated successfully",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update envelope",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditEnvelopeForm) => {
    updateEnvelopeMutation.mutate(data);
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
          <DialogTitle>Edit Envelope</DialogTitle>
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
                        <SelectValue placeholder="Select a category" />
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
                  name="targetAmount"
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Add notes about this envelope..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateEnvelopeMutation.isPending}>
                {updateEnvelopeMutation.isPending ? "Updating..." : "Update Envelope"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}