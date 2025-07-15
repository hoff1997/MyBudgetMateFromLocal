import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Wifi, WifiOff, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle, Clock, Building2, Settings, Shield, Calendar, Download, Upload, CreditCard, Banknote, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { BankConnection } from "@shared/schema";
import { TwoFactorAuthSetup } from "./TwoFactorAuthSetup";

// New Zealand bank definitions
const NZ_BANKS = [
  { id: "anz", name: "ANZ New Zealand", logo: "🏦", color: "bg-blue-600" },
  { id: "asb", name: "ASB Bank", logo: "🏦", color: "bg-orange-600" },
  { id: "bnz", name: "Bank of New Zealand", logo: "🏦", color: "bg-orange-700" },
  { id: "westpac", name: "Westpac New Zealand", logo: "🏦", color: "bg-red-600" },
  { id: "kiwibank", name: "Kiwibank", logo: "🥝", color: "bg-green-600" },
  { id: "heartland", name: "Heartland Bank", logo: "🏦", color: "bg-purple-600" },
  { id: "tsbbank", name: "TSB Bank", logo: "🏦", color: "bg-blue-800" },
];

interface BankConnectionManagerProps {
  className?: string;
}

export default function BankConnectionManager({ className }: BankConnectionManagerProps) {
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<BankConnection | null>(null);
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [show2FAValidation, setShow2FAValidation] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    syncFrequency: 'daily',
    includeAccountTypes: ['checking', 'savings'],
    syncHistoryDays: 90,
    duplicateThreshold: 0.9
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connections = [] } = useQuery<BankConnection[]>({
    queryKey: ['/api/bank-connections'],
  });

  // Check 2FA status for current user (demo user ID 1)
  const { data: twoFactorStatus } = useQuery({
    queryKey: ['/api/2fa/status', 1],
    queryFn: () => apiRequest('/api/2fa/status/1'),
  });

  // 2FA validation mutation
  const validate2FAMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/2fa/validate', {
        method: 'POST',
        body: JSON.stringify({ userId: 1, token: twoFactorToken }),
        headers: { 'Content-Type': 'application/json' },
      });
      return response;
    },
    onSuccess: () => {
      // Proceed with bank connection after 2FA validation
      connectBankMutation.mutate(selectedBank);
      setShow2FAValidation(false);
      setTwoFactorToken("");
    },
    onError: (error) => {
      toast({
        title: "Authentication Failed",
        description: "Invalid authentication code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const connectBankMutation = useMutation({
    mutationFn: async (bankId: string) => {
      // In production, this would redirect to Akahu OAuth flow
      const response = await apiRequest('/api/bank-connections/connect', {
        method: 'POST',
        body: { bankId }
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank-connections'] });
      toast({
        title: "Bank Connected Successfully",
        description: `${selectedBank} has been connected and will sync automatically.`,
      });
      setShowConnectDialog(false);
      setSelectedBank("");
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: "Failed to connect bank account. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleConnectBank = () => {
    if (!selectedBank) return;
    
    // Check if 2FA is enabled before allowing bank connection
    if (twoFactorStatus?.twoFactorEnabled) {
      setShow2FAValidation(true);
    } else {
      // Show warning that 2FA is required
      toast({
        title: "Two-Factor Authentication Required",
        description: "You must enable two-factor authentication before connecting bank accounts for security.",
        variant: "destructive",
      });
    }
  };

  const disconnectBankMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      await apiRequest(`/api/bank-connections/${connectionId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank-connections'] });
      toast({
        title: "Bank Disconnected",
        description: "Bank connection has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect bank. Please try again.",
        variant: "destructive",
      });
    }
  });

  const syncBankMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      const response = await apiRequest(`/api/bank-connections/${connectionId}/sync`, {
        method: 'POST'
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/bank-connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: "Sync Completed",
        description: `Imported ${data.transactionCount || 0} new transactions.`,
      });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync bank data. Please try again.",
        variant: "destructive",
      });
    }
  });

  const getConnectionStatus = (connection: BankConnection) => {
    if (!connection.isActive) {
      return { icon: WifiOff, color: "text-red-600", label: "Disconnected" };
    }
    
    const now = new Date();
    const expiry = new Date(connection.consentExpiry || 0);
    
    if (expiry < now) {
      return { icon: AlertCircle, color: "text-yellow-600", label: "Expired" };
    }
    
    return { icon: Wifi, color: "text-green-600", label: "Connected" };
  };

  const formatLastSync = (lastSync: Date | string | null) => {
    if (!lastSync) return "Never";
    const date = new Date(lastSync);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={className}>
      {/* Security Notice for 2FA */}
      {!twoFactorStatus?.twoFactorEnabled && (
        <Alert className="mb-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            <strong>Two-Factor Authentication Required:</strong> You must enable two-factor authentication before connecting bank accounts for security. Set up 2FA below.
          </AlertDescription>
        </Alert>
      )}

      {/* Two-Factor Authentication Setup */}
      {!twoFactorStatus?.twoFactorEnabled && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Two-Factor Authentication Setup
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Secure your account with two-factor authentication before connecting banks
            </p>
          </CardHeader>
          <CardContent>
            <TwoFactorAuthSetup userId={1} username="demo" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Bank Connections
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your NZ bank accounts for automatic transaction import
              </p>
            </div>
            <Button 
              onClick={() => setShowConnectDialog(true)}
              size="sm"
              disabled={!twoFactorStatus?.twoFactorEnabled}
            >
              <Plus className="h-4 w-4 mr-2" />
              Connect Bank
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {connections.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No bank accounts connected. Connect your first bank to start importing transactions automatically.
              </AlertDescription>
            </Alert>
          ) : (
            connections.map((connection) => {
              const status = getConnectionStatus(connection);
              const bank = NZ_BANKS.find(b => b.id === connection.bankId);
              
              return (
                <Card key={connection.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${bank?.color || 'bg-gray-600'} rounded-lg flex items-center justify-center text-white text-lg`}>
                          {bank?.logo || '🏦'}
                        </div>
                        <div>
                          <h4 className="font-medium">{connection.bankName}</h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <status.icon className={`h-3 w-3 ${status.color}`} />
                              <span>{status.label}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>Last sync: {formatLastSync(connection.lastSync)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedConnection(connection);
                            setShowSettingsDialog(true);
                          }}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Settings
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => syncBankMutation.mutate(connection.id)}
                          disabled={syncBankMutation.isPending || !connection.isActive}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Sync
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectBankMutation.mutate(connection.id)}
                          disabled={disconnectBankMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Disconnect
                        </Button>
                      </div>
                    </div>
                    
                    {connection.consentExpiry && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        Consent expires: {new Date(connection.consentExpiry).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Connect Bank Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Your Bank</DialogTitle>
            <DialogDescription>
              Choose your bank to securely connect and import transactions. Your login details are never stored.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Your Bank</label>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose your bank" />
                </SelectTrigger>
                <SelectContent>
                  {NZ_BANKS.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{bank.logo}</span>
                        <span>{bank.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Secure Connection:</strong> Uses bank-grade encryption and OAuth 2.0. Your banking credentials are never stored or accessed by this application.
              </AlertDescription>
            </Alert>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Setup Required:</strong> To connect real banks, you need Akahu API credentials. 
                <a href="/AKAHU_SETUP.md" target="_blank" className="text-blue-600 hover:underline ml-1">
                  View setup guide
                </a> or configure API keys in Settings → Banks.
              </AlertDescription>
            </Alert>

            <Separator />

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConnectBank}
                disabled={!selectedBank || isConnecting || connectBankMutation.isPending}
              >
                {connectBankMutation.isPending ? 'Connecting...' : 'Connect Securely'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Two-Factor Authentication Dialog */}
      <Dialog open={show2FAValidation} onOpenChange={setShow2FAValidation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ShieldAlert className="h-5 w-5 mr-2" />
              Two-Factor Authentication Required
            </DialogTitle>
            <DialogDescription>
              For security, you must verify your identity before connecting bank accounts.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Bank connections require two-factor authentication to protect your financial data.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="2fa-token">Authentication Code</Label>
              <Input
                id="2fa-token"
                type="text"
                placeholder="Enter 6-digit code"
                value={twoFactorToken}
                onChange={(e) => setTwoFactorToken(e.target.value)}
                maxLength={6}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShow2FAValidation(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => validate2FAMutation.mutate()}
                disabled={!twoFactorToken || twoFactorToken.length !== 6 || validate2FAMutation.isPending}
              >
                {validate2FAMutation.isPending ? 'Verifying...' : 'Verify & Connect'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank Connection Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Bank Connection Settings
            </DialogTitle>
            <DialogDescription>
              Configure sync preferences, account filters, and security settings for {selectedConnection?.bankName}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="sync" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="sync">Sync Settings</TabsTrigger>
              <TabsTrigger value="accounts">Account Selection</TabsTrigger>
              <TabsTrigger value="security">Security & Privacy</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="2fa">Two-Factor Auth</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sync" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Automatic Sync</CardTitle>
                  <p className="text-sm text-muted-foreground">Control when and how often transactions are imported</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-sync">Enable automatic sync</Label>
                      <p className="text-sm text-muted-foreground">Automatically import new transactions</p>
                    </div>
                    <Switch
                      id="auto-sync"
                      checked={syncSettings.autoSync}
                      onCheckedChange={(checked) => setSyncSettings({...syncSettings, autoSync: checked})}
                    />
                  </div>
                  
                  {syncSettings.autoSync && (
                    <div className="space-y-3">
                      <div>
                        <Label>Sync frequency</Label>
                        <Select 
                          value={syncSettings.syncFrequency} 
                          onValueChange={(value) => setSyncSettings({...syncSettings, syncFrequency: value})}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="realtime">Real-time (as they occur)</SelectItem>
                            <SelectItem value="hourly">Every hour</SelectItem>
                            <SelectItem value="daily">Daily at 6 AM</SelectItem>
                            <SelectItem value="weekly">Weekly on Monday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Transaction history to sync</Label>
                        <Select 
                          value={syncSettings.syncHistoryDays.toString()} 
                          onValueChange={(value) => setSyncSettings({...syncSettings, syncHistoryDays: parseInt(value)})}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="90">Last 90 days</SelectItem>
                            <SelectItem value="180">Last 6 months</SelectItem>
                            <SelectItem value="365">Last 12 months</SelectItem>
                            <SelectItem value="0">All available history</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Duplicate Detection</CardTitle>
                  <p className="text-sm text-muted-foreground">Prevent importing duplicate transactions</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Detection sensitivity</Label>
                    <div className="mt-2">
                      <input
                        type="range"
                        min="0.7"
                        max="1.0"
                        step="0.1"
                        value={syncSettings.duplicateThreshold}
                        onChange={(e) => setSyncSettings({...syncSettings, duplicateThreshold: parseFloat(e.target.value)})}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Relaxed (70%)</span>
                        <span>Strict (100%)</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Current: {Math.round(syncSettings.duplicateThreshold * 100)}% match required
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="accounts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Account Types to Sync</CardTitle>
                  <p className="text-sm text-muted-foreground">Choose which types of accounts to import from</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { id: 'checking', name: 'Checking/Transaction Accounts', icon: Banknote, description: 'Day-to-day spending accounts' },
                    { id: 'savings', name: 'Savings Accounts', icon: Building2, description: 'Interest-bearing savings accounts' },
                    { id: 'credit', name: 'Credit Cards', icon: CreditCard, description: 'Credit card transactions' },
                    { id: 'loan', name: 'Loans & Mortgages', icon: Building2, description: 'Loan payment accounts' }
                  ].map((accountType) => (
                    <div key={accountType.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <accountType.icon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <Label className="text-sm font-medium">{accountType.name}</Label>
                          <p className="text-xs text-muted-foreground">{accountType.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={syncSettings.includeAccountTypes.includes(accountType.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSyncSettings({
                              ...syncSettings,
                              includeAccountTypes: [...syncSettings.includeAccountTypes, accountType.id]
                            });
                          } else {
                            setSyncSettings({
                              ...syncSettings,
                              includeAccountTypes: syncSettings.includeAccountTypes.filter(t => t !== accountType.id)
                            });
                          }
                        }}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Transaction Filters</CardTitle>
                  <p className="text-sm text-muted-foreground">Filter which transactions to import</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Minimum transaction amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Skip transactions below this amount</p>
                  </div>
                  
                  <div>
                    <Label>Exclude merchant patterns</Label>
                    <Input
                      placeholder="e.g., ATM WITHDRAWAL, BANK FEE"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Comma-separated patterns to exclude</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Connection Security</CardTitle>
                  <p className="text-sm text-muted-foreground">Manage connection permissions and access</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Secure Connection:</strong> Your banking credentials are never stored. This app uses read-only access through bank-approved APIs.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Connection Status</Label>
                        <p className="text-sm text-muted-foreground">Active since {new Date().toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Consent Expiry</Label>
                        <p className="text-sm text-muted-foreground">Access expires {selectedConnection?.consentExpiry ? new Date(selectedConnection.consentExpiry).toLocaleDateString() : 'Never'}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Calendar className="h-3 w-3 mr-1" />
                        Renew Consent
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Data Privacy</CardTitle>
                  <p className="text-sm text-muted-foreground">Control how your data is used</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Store transaction descriptions</Label>
                      <p className="text-sm text-muted-foreground">Keep original merchant descriptions</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable merchant categorisation</Label>
                      <p className="text-sm text-muted-foreground">Automatically suggest envelope assignments</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Share anonymised spending patterns</Label>
                      <p className="text-sm text-muted-foreground">Help improve categorisation accuracy</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Import/Export</CardTitle>
                  <p className="text-sm text-muted-foreground">Backup and restore connection data</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Export connection settings</Label>
                      <p className="text-sm text-muted-foreground">Save current configuration</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Import settings</Label>
                      <p className="text-sm text-muted-foreground">Load saved configuration</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Upload className="h-3 w-3 mr-1" />
                      Import
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Connection Health</CardTitle>
                  <p className="text-sm text-muted-foreground">Monitor and troubleshoot connection issues</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-lg font-semibold text-green-600">98.5%</div>
                      <div className="text-xs text-muted-foreground">Uptime (30 days)</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-lg font-semibold">2.3s</div>
                      <div className="text-xs text-muted-foreground">Avg sync time</div>
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Test Connection
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-red-600">Danger Zone</CardTitle>
                  <p className="text-sm text-muted-foreground">Irreversible actions</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                    <div>
                      <Label className="text-red-800">Reset all settings</Label>
                      <p className="text-sm text-red-600">Restore default configuration</p>
                    </div>
                    <Button variant="outline" size="sm" className="border-red-300 text-red-700">
                      Reset
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                    <div>
                      <Label className="text-red-800">Delete connection</Label>
                      <p className="text-sm text-red-600">Permanently remove this bank connection</p>
                    </div>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="2fa" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Two-Factor Authentication Management
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Manage two-factor authentication settings for secure bank connections
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {twoFactorStatus?.twoFactorEnabled ? (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Two-factor authentication is enabled and active. Your bank connections are secure.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Two-factor authentication is required before connecting bank accounts for security.
                        </AlertDescription>
                      </Alert>
                      
                      <TwoFactorAuthSetup userId={1} username="demo" />
                    </>
                  )}
                  
                  {twoFactorStatus?.twoFactorEnabled && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 border rounded-lg">
                          <div className="text-lg font-semibold text-green-600">Active</div>
                          <div className="text-xs text-muted-foreground">Authentication Status</div>
                        </div>
                        <div className="text-center p-3 border rounded-lg">
                          <div className="text-lg font-semibold">{twoFactorStatus.backupCodesCount || 0}</div>
                          <div className="text-xs text-muted-foreground">Backup codes remaining</div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Security Actions</h4>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            Regenerate Backup Codes
                          </Button>
                          <Button variant="outline" size="sm">
                            Update Phone Number
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button>
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}