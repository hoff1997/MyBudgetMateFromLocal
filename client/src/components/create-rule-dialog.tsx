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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Check, GitBranch } from "lucide-react";
import type { Transaction } from "@shared/schema";

const ruleSchema = z.object({
  pattern: z.string().min(1, "Pattern is required"),
  envelopeId: z.number().min(1, "Envelope is required"),
});

type RuleForm = z.infer<typeof ruleSchema>;

interface CreateRuleDialogProps {
  transaction: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateRuleDialog({ transaction, open, onOpenChange }: CreateRuleDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: envelopes = [] } = useQuery({
    queryKey: ['/api/envelopes'],
  });

  const form = useForm<RuleForm>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      pattern: transaction.merchant,
      envelopeId: 0,
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: RuleForm) => {
      return apiRequest("POST", "/api/category-rules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/category-rules'] });
      onOpenChange(false);
      form.reset();
      toast({
        title: "Rule created",
        description: `Future transactions from "${transaction.merchant}" will be automatically assigned to the selected envelope.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create rule. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RuleForm) => {
    createRuleMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <DialogTitle>Create Merchant Rule</DialogTitle>
          </div>
          <DialogDescription>
            Create an automatic rule to assign transactions from this merchant to a specific envelope.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pattern"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Merchant Pattern</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Merchant name or pattern..." 
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    This will match merchants containing this text (case-insensitive)
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="envelopeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Envelope</FormLabel>
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
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={createRuleMutation.isPending}
              >
                {createRuleMutation.isPending ? (
                  "Creating..."
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Create Rule
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}