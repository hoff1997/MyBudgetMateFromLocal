import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { EnvelopeType, InsertEnvelopeType } from "@shared/schema";

const ICON_OPTIONS = [
  { value: "💼", label: "💼 Briefcase" },
  { value: "🏠", label: "🏠 Home" },
  { value: "🚗", label: "🚗 Car" },
  { value: "🍽️", label: "🍽️ Food" },
  { value: "🎭", label: "🎭 Entertainment" },
  { value: "💰", label: "💰 Money" },
  { value: "💳", label: "💳 Credit Card" },
  { value: "🎉", label: "🎉 Party" },
  { value: "🏥", label: "🏥 Health" },
  { value: "📚", label: "📚 Education" },
  { value: "👕", label: "👕 Clothing" },
  { value: "🎮", label: "🎮 Gaming" },
  { value: "✈️", label: "✈️ Travel" },
  { value: "🔧", label: "🔧 Tools" },
  { value: "🎨", label: "🎨 Art" }
];

const COLOR_OPTIONS = [
  { value: "bg-red-100 text-red-800", label: "Red" },
  { value: "bg-orange-100 text-orange-800", label: "Orange" },
  { value: "bg-yellow-100 text-yellow-800", label: "Yellow" },
  { value: "bg-green-100 text-green-800", label: "Green" },
  { value: "bg-blue-100 text-blue-800", label: "Blue" },
  { value: "bg-purple-100 text-purple-800", label: "Purple" },
  { value: "bg-pink-100 text-pink-800", label: "Pink" },
  { value: "bg-emerald-100 text-emerald-800", label: "Emerald" },
  { value: "bg-indigo-100 text-indigo-800", label: "Indigo" },
  { value: "bg-teal-100 text-teal-800", label: "Teal" }
];

interface EnvelopeTypeFormData {
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
}

export function EnvelopeTypeManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<EnvelopeType | null>(null);
  const [formData, setFormData] = useState<EnvelopeTypeFormData>({
    name: "",
    icon: "💼",
    color: "bg-blue-100 text-blue-800",
    sortOrder: 0
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: envelopeTypes = [], isLoading } = useQuery({
    queryKey: ["/api/envelope-types"],
    queryFn: () => apiRequest("GET", "/api/envelope-types").then(res => res.json())
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertEnvelopeType) => {
      const response = await apiRequest("POST", "/api/envelope-types", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/envelope-types"] });
      toast({
        title: "Envelope Type Created",
        description: "New envelope type has been added successfully."
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create envelope type.",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<EnvelopeType> }) => {
      const response = await apiRequest("PUT", `/api/envelope-types/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/envelope-types"] });
      toast({
        title: "Envelope Type Updated",
        description: "Envelope type has been updated successfully."
      });
      setIsDialogOpen(false);
      setEditingType(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update envelope type.",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/envelope-types/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/envelope-types"] });
      toast({
        title: "Envelope Type Deleted",
        description: "Envelope type has been deleted successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete envelope type.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      icon: "💼",
      color: "bg-blue-100 text-blue-800",
      sortOrder: envelopeTypes.length + 1
    });
  };

  const handleCreate = () => {
    setEditingType(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (type: EnvelopeType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      icon: type.icon,
      color: type.color,
      sortOrder: type.sortOrder || 0
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Envelope type name is required.",
        variant: "destructive"
      });
      return;
    }

    if (editingType) {
      updateMutation.mutate({
        id: editingType.id,
        data: formData
      });
    } else {
      createMutation.mutate({
        ...formData,
        userId: 1, // This will be set by the API based on authenticated user
        isDefault: false,
        isActive: true
      });
    }
  };

  const handleDelete = (type: EnvelopeType) => {
    if (type.isDefault) {
      toast({
        title: "Cannot Delete",
        description: "Default envelope types cannot be deleted.",
        variant: "destructive"
      });
      return;
    }

    if (confirm(`Are you sure you want to delete "${type.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(type.id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Envelope Types</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Type
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingType ? "Edit Envelope Type" : "Create New Envelope Type"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Personal Care"
                />
              </div>
              
              <div>
                <Label htmlFor="icon">Icon</Label>
                <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className={`inline-block w-3 h-3 rounded mr-2 ${option.value}`} />
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  placeholder="Display order"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingType ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          {envelopeTypes.map((type: EnvelopeType) => (
            <div
              key={type.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{type.icon}</span>
                <div>
                  <div className="font-medium">{type.name}</div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${type.color}`}>
                      {type.color.split(' ')[0].replace('bg-', '').replace('-100', '')}
                    </span>
                    {type.isDefault && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(type)}
                  disabled={updateMutation.isPending}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(type)}
                  disabled={type.isDefault || deleteMutation.isPending}
                  className={type.isDefault ? "opacity-50 cursor-not-allowed" : ""}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {envelopeTypes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No envelope types found. Create your first custom type above.
          </div>
        )}
      </CardContent>
    </Card>
  );
}