import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Tag, Folder } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { EnvelopeCategory } from "@shared/schema";

interface QuickCreateEnvelopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnvelopeCreated?: (envelopeId: number) => void;
  transactionAmount?: string; // Pre-fill budget with transaction amount
}

export default function QuickCreateEnvelopeDialog({ 
  open, 
  onOpenChange, 
  onEnvelopeCreated,
  transactionAmount 
}: QuickCreateEnvelopeDialogProps) {
  const [envelopeName, setEnvelopeName] = useState("");
  const [budgetAmount, setBudgetAmount] = useState(transactionAmount || "");
  const [selectedIcon, setSelectedIcon] = useState("📁");
  const [selectedCategory, setSelectedCategory] = useState<string>("none");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery<EnvelopeCategory[]>({
    queryKey: ['/api/envelope-categories'],
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('POST', '/api/envelope-categories', { 
        name, 
        sortOrder: categories.length,
        isActive: true 
      });
      return response;
    },
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: ['/api/envelope-categories'] });
      setSelectedCategory(newCategory.id.toString());
      setShowNewCategory(false);
      setNewCategoryName("");
      toast({
        title: "Category created",
        description: `${newCategory.name} category has been created.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create category. Please try again.",
        variant: "destructive",
      });
    }
  });

  const createEnvelopeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/envelopes', {
        name: envelopeName,
        budgetAmount: budgetAmount || "0.00",
        currentBalance: "0.00",
        icon: selectedIcon,
        categoryId: selectedCategory !== "none" ? parseInt(selectedCategory) : null,
        isActive: true
      });
      return response;
    },
    onSuccess: (newEnvelope) => {
      queryClient.invalidateQueries({ queryKey: ['/api/envelopes'] });
      toast({
        title: "Envelope created",
        description: `${envelopeName} envelope has been created successfully.`,
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
    setEnvelopeName("");
    setBudgetAmount(transactionAmount || "");
    setSelectedIcon("📁");
    setSelectedCategory("none");
    setShowNewCategory(false);
    setNewCategoryName("");
    onOpenChange(false);
  };

  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      createCategoryMutation.mutate(newCategoryName.trim());
    }
  };

  const handleCreateEnvelope = () => {
    if (!envelopeName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter an envelope name.",
        variant: "destructive",
      });
      return;
    }
    
    createEnvelopeMutation.mutate();
  };

  const commonIcons = ["📁", "🏠", "🍕", "⛽", "👕", "🎬", "💊", "📚", "🎮", "✈️", "🍔", "🚗", "💡", "📱", "🎵"];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Tag className="h-5 w-5" />
            <span>Quick Create Envelope</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Envelope Name */}
          <div className="space-y-2">
            <Label htmlFor="envelope-name">Envelope Name</Label>
            <Input
              id="envelope-name"
              placeholder="e.g., Coffee & Treats, Car Maintenance"
              value={envelopeName}
              onChange={(e) => setEnvelopeName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Budget Amount */}
          <div className="space-y-2">
            <Label htmlFor="budget-amount">Budget Amount (Optional)</Label>
            <Input
              id="budget-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
            />
            {transactionAmount && (
              <p className="text-xs text-muted-foreground">
                Suggested from transaction: ${transactionAmount}
              </p>
            )}
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-8 gap-2">
              {commonIcons.map((icon) => (
                <Button
                  key={icon}
                  variant={selectedIcon === icon ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setSelectedIcon(icon)}
                >
                  {icon}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Category Selection */}
          <div className="space-y-2">
            <Label>Category</Label>
            
            {!showNewCategory ? (
              <div className="flex space-x-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose a category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewCategory(true)}
                  className="flex-shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </div>
            ) : (
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Create New Category</span>
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCategoryName.trim()) {
                          handleCreateCategory();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleCreateCategory}
                      disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                    >
                      Create
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowNewCategory(false);
                        setNewCategoryName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateEnvelope}
              disabled={!envelopeName.trim() || createEnvelopeMutation.isPending}
            >
              {createEnvelopeMutation.isPending ? 'Creating...' : 'Create Envelope'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}