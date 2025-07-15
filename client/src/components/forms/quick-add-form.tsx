import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, X, Store } from "lucide-react";
import { format } from "date-fns";

const transactionSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  accountId: z.number().min(1, "Account is required"),
  merchant: z.string().min(1, "Merchant is required"),
  description: z.string().optional(),
  envelopeId: z.number().min(1, "Envelope is required"),
  date: z.string().min(1, "Date is required"),
  receipt: z.instanceof(File).optional(),
});

type TransactionForm = z.infer<typeof transactionSchema>;

export default function QuickAddForm() {
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<File | null>(null);
  const [merchantSuggestion, setMerchantSuggestion] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: envelopes = [] } = useQuery({
    queryKey: ['/api/envelopes'],
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/accounts'],
  });

  const form = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: "",
      accountId: 1,
      merchant: "",
      description: "",
      envelopeId: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      receipt: undefined,
    },
  });

  // Watch merchant field for suggestions
  const watchedMerchant = form.watch("merchant");

  useEffect(() => {
    const getMerchantSuggestion = async () => {
      if (watchedMerchant && watchedMerchant.length > 2) {
        try {
          const response = await fetch(`/api/merchants/suggest/${encodeURIComponent(watchedMerchant)}`);
          if (response.ok) {
            const suggestion = await response.json();
            if (suggestion && suggestion.lastEnvelopeId) {
              setMerchantSuggestion(suggestion);
              // Auto-suggest envelope if not already selected
              if (form.getValues("envelopeId") === 0) {
                form.setValue("envelopeId", suggestion.lastEnvelopeId);
              }
            } else {
              setMerchantSuggestion(null);
            }
          }
        } catch (error) {
          console.error("Failed to get merchant suggestion:", error);
        }
      } else {
        setMerchantSuggestion(null);
      }
    };

    const timeoutId = setTimeout(getMerchantSuggestion, 300);
    return () => clearTimeout(timeoutId);
  }, [watchedMerchant, form]);

  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionForm) => {
      let receiptUrl = null;
      
      // Upload receipt if provided
      if (data.receipt) {
        const formData = new FormData();
        formData.append('receipt', data.receipt);
        
        const uploadResponse = await fetch('/api/upload-receipt', {
          method: 'POST',
          body: formData,
        });
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          receiptUrl = uploadResult.url;
        }
      }
      
      const transactionData = {
        amount: `-${parseFloat(data.amount).toFixed(2)}`, // Negative for expense
        accountId: data.accountId,
        merchant: data.merchant,
        description: data.description || null,
        date: new Date(data.date).toISOString(),
        receiptUrl,
        envelopes: [{
          envelopeId: data.envelopeId,
          amount: `-${parseFloat(data.amount).toFixed(2)}`,
        }],
      };
      
      return apiRequest("POST", "/api/transactions", transactionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      form.reset();
      setSelectedReceipt(null);
      setMerchantSuggestion(null);
      toast({
        title: "Transaction added",
        description: "Your transaction has been added to the approval queue.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransactionForm) => {
    const formData = { ...data, receipt: selectedReceipt };
    createTransactionMutation.mutate(formData);
  };

  const handleReceiptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Receipt must be smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedReceipt(file);
      form.setValue('receipt', file);
    }
  };

  const removeReceipt = () => {
    setSelectedReceipt(null);
    form.setValue('receipt', undefined);
  };

  return (
    <Card>
      <CardHeader className="pt-2 pb-1 px-3">
        <CardTitle className="text-sm">Quick Add Transaction</CardTitle>
      </CardHeader>
      <CardContent className="pt-1 pb-2 px-3">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          className="pl-8 h-8 text-xs"
                        />
                      </div>
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
                    <FormLabel className="text-xs">Date</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="date" 
                        className="h-8 text-xs"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="envelopeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Envelope
                      {merchantSuggestion && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (suggested from {merchantSuggestion.merchant})
                        </span>
                      )}
                    </FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select envelope..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {envelopes.map((envelope) => (
                          <SelectItem key={envelope.id} value={envelope.id.toString()}>
                            {envelope.icon} {envelope.name}
                            {merchantSuggestion && envelope.id === merchantSuggestion.lastEnvelopeId && (
                              <span className="text-xs text-blue-600 ml-2">(suggested)</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="merchant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Merchant/Store</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input 
                          {...field} 
                          placeholder="Store or business name..." 
                          className="pl-9 h-8 text-xs"
                        />
                      </div>
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
                    <FormLabel className="text-xs">Description (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Additional details..." className="h-8 text-xs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Receipt Upload */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Receipt (Optional)</label>
              {selectedReceipt ? (
                <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <div className="flex items-center space-x-1">
                    <Upload className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-foreground">{selectedReceipt.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(selectedReceipt.size / 1024).toFixed(1)}KB)
                    </span>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={removeReceipt}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    className="hidden"
                    id="receipt-upload"
                  />
                  <label 
                    htmlFor="receipt-upload"
                    className="flex flex-col items-center cursor-pointer"
                  >
                    <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground text-center">
                      Click to upload receipt image<br />
                      <span className="text-xs">Max 5MB, images only</span>
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <Button 
                type="submit" 
                className="flex-1 h-8 text-xs"
                disabled={createTransactionMutation.isPending}
              >
                {createTransactionMutation.isPending ? "Adding..." : "Add Transaction"}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setIsSplitMode(!isSplitMode)}
                className="h-8 px-3 text-xs"
              >
                Split
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
