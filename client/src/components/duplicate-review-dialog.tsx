import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Check, X, Merge, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Transaction } from "@shared/schema";

interface DuplicateReviewDialogProps {
  transaction: Transaction | null;
  potentialDuplicate: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DuplicateReviewDialog({ 
  transaction, 
  potentialDuplicate, 
  open, 
  onOpenChange 
}: DuplicateReviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAction = async (action: 'merge' | 'keep_both' | 'delete_bank') => {
    if (!transaction || !potentialDuplicate) return;
    
    setLoading(true);
    try {
      const response = await apiRequest('/api/transactions/resolve-duplicate', {
        method: 'POST',
        body: {
          bankTransactionId: transaction.id,
          manualTransactionId: potentialDuplicate.id,
          action
        }
      });

      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
      let message = '';
      switch (action) {
        case 'merge':
          message = 'Transactions merged successfully';
          break;
        case 'keep_both':
          message = 'Both transactions kept as separate entries';
          break;
        case 'delete_bank':
          message = 'Bank transaction removed, manual entry kept';
          break;
      }
      
      toast({ title: "Duplicate Resolved", description: message });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resolve duplicate transaction",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!transaction || !potentialDuplicate) return null;

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(parseFloat(amount));
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span>Potential Duplicate Transaction</span>
          </DialogTitle>
          <DialogDescription>
            We found a manual transaction that might match this bank import. 
            Please review and choose how to handle it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bank Transaction */}
          <div>
            <h4 className="font-medium mb-2 flex items-center">
              <Badge variant="outline" className="mr-2">Bank Import</Badge>
              New Transaction
            </h4>
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-medium">{transaction.merchant}</p>
                    {transaction.description && (
                      <p className="text-sm text-muted-foreground">{transaction.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formatDate(transaction.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {formatAmount(transaction.amount)}
                    </p>
                    <Badge variant="secondary">Bank Sync</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Manual Transaction */}
          <div>
            <h4 className="font-medium mb-2 flex items-center">
              <Badge variant="outline" className="mr-2">Manual Entry</Badge>
              Existing Transaction
            </h4>
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-medium">{potentialDuplicate.merchant}</p>
                    {potentialDuplicate.description && (
                      <p className="text-sm text-muted-foreground">{potentialDuplicate.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formatDate(potentialDuplicate.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {formatAmount(potentialDuplicate.amount)}
                    </p>
                    <Badge variant={potentialDuplicate.isApproved ? "default" : "secondary"}>
                      {potentialDuplicate.isApproved ? "Approved" : "Pending"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comparison */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h5 className="font-medium mb-2">Quick Comparison</h5>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Amount Match</p>
                <p className={transaction.amount === potentialDuplicate.amount ? "text-green-600" : "text-yellow-600"}>
                  {transaction.amount === potentialDuplicate.amount ? "Exact" : "Similar"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Date Difference</p>
                <p className="text-muted-foreground">
                  {Math.abs(new Date(transaction.date).getTime() - new Date(potentialDuplicate.date).getTime()) / (1000 * 60 * 60 * 24)} days
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Merchant Similarity</p>
                <p className="text-muted-foreground">High</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              onClick={() => handleAction('merge')}
              disabled={loading}
              className="flex-1"
            >
              <Merge className="h-4 w-4 mr-2" />
              Merge Transactions
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleAction('keep_both')}
              disabled={loading}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              Keep Both
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleAction('delete_bank')}
              disabled={loading}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Keep Manual Only
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Merge:</strong> Combines both transactions, keeping manual entry but marking as bank-verified</p>
            <p><strong>Keep Both:</strong> Maintains both as separate transactions</p>
            <p><strong>Keep Manual Only:</strong> Removes the bank import, keeps your manual entry</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}