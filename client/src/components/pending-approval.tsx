import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Transaction } from "@shared/schema";

interface PendingApprovalProps {
  transaction: Transaction;
}

export default function PendingApproval({ transaction }: PendingApprovalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const amount = parseFloat(transaction.amount);

  const { data: envelopes = [] } = useQuery({
    queryKey: ['/api/envelopes'],
  });

  const approveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/transactions/${transaction.id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Transaction approved",
        description: "The transaction has been approved and envelope balances updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve transaction.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/transactions/${transaction.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/pending'] });
      toast({
        title: "Transaction rejected",
        description: "The transaction has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject transaction.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="border border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-900/10 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-medium text-foreground">{transaction.merchant}</p>
          {transaction.description && (
            <p className="text-xs text-muted-foreground">{transaction.description}</p>
          )}
          <p className="text-sm text-muted-foreground">${Math.abs(amount).toFixed(2)}</p>
        </div>
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          Pending
        </Badge>
      </div>
      
      <div className="flex items-center justify-between">
        <Select defaultValue="1">
          <SelectTrigger className="w-40 text-sm">
            <SelectValue placeholder="Select envelope" />
          </SelectTrigger>
          <SelectContent>
            {envelopes.map((envelope) => (
              <SelectItem key={envelope.id} value={envelope.id.toString()}>
                {envelope.icon} {envelope.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="ghost"
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => rejectMutation.mutate()}
            disabled={rejectMutation.isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
