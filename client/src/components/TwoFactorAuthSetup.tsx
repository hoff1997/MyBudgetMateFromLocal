import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Shield, ShieldCheck, Key, Smartphone, AlertTriangle, Copy, RotateCcw } from 'lucide-react';

interface TwoFactorAuthSetupProps {
  userId: number;
  username: string;
}

export function TwoFactorAuthSetup({ userId, username }: TwoFactorAuthSetupProps) {
  const [setupToken, setSetupToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [disableToken, setDisableToken] = useState('');
  const [regenerateToken, setRegenerateToken] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get 2FA status
  const { data: status, isLoading } = useQuery({
    queryKey: ['/api/2fa/status', userId],
  });

  // Setup 2FA mutation
  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/2fa/setup', { userId, username });
      return response.json();
    },
    onSuccess: (data) => {
      setQrCodeUrl(data.qrCodeDataUrl);
      setBackupCodes(data.backupCodes);
      setShowBackupCodes(true);
      toast({
        title: "2FA Setup Ready",
        description: "Scan the QR code with your authenticator app and enter the verification code.",
      });
    },
    onError: (error) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to setup two-factor authentication",
        variant: "destructive",
      });
    },
  });

  // Verify 2FA mutation
  const verifyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/2fa/verify', { userId, token: setupToken });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/2fa/status', userId] });
      setSetupToken('');
      setQrCodeUrl('');
      toast({
        title: "2FA Enabled Successfully",
        description: data.usedBackupCode 
          ? "Two-factor authentication enabled using backup code." 
          : "Two-factor authentication is now protecting your account.",
      });
    },
    onError: (error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    },
  });

  // Validate 2FA mutation (for testing existing setup)
  const validateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/2fa/validate', { userId, token: verifyToken });
      return response.json();
    },
    onSuccess: (data) => {
      setVerifyToken('');
      toast({
        title: "Code Verified",
        description: data.usedBackupCode 
          ? "Backup code verified successfully." 
          : "Authentication code verified successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid authentication code",
        variant: "destructive",
      });
    },
  });

  // Disable 2FA mutation
  const disableMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/2fa/disable', { userId, token: disableToken });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/2fa/status', userId] });
      setDisableToken('');
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled for your account.",
      });
    },
    onError: (error) => {
      toast({
        title: "Disable Failed",
        description: error.message || "Failed to disable two-factor authentication",
        variant: "destructive",
      });
    },
  });

  // Regenerate backup codes mutation
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/2fa/regenerate-backup-codes', { userId, token: regenerateToken });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/2fa/status', userId] });
      setBackupCodes(data.backupCodes);
      setShowBackupCodes(true);
      setRegenerateToken('');
      toast({
        title: "Backup Codes Regenerated",
        description: "New backup codes have been generated. Save them securely.",
      });
    },
    onError: (error) => {
      toast({
        title: "Regeneration Failed",
        description: error.message || "Failed to regenerate backup codes",
        variant: "destructive",
      });
    },
  });

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    toast({
      title: "Backup Codes Copied",
      description: "Backup codes have been copied to your clipboard.",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isEnabled = status?.twoFactorEnabled || false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Two-Factor Authentication</CardTitle>
          {isEnabled && <Badge variant="secondary" className="bg-green-100 text-green-800">Enabled</Badge>}
        </div>
        <CardDescription>
          Add an extra layer of security to your account by requiring a verification code from your phone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={isEnabled ? "manage" : "setup"} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup" disabled={isEnabled}>Setup</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4">
            {!qrCodeUrl ? (
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You'll need an authenticator app like Google Authenticator, Authy, or 1Password to set up two-factor authentication.
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={() => setupMutation.mutate()} 
                  disabled={setupMutation.isPending}
                  className="w-full"
                >
                  <Key className="h-4 w-4 mr-2" />
                  {setupMutation.isPending ? "Setting up..." : "Setup Two-Factor Authentication"}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Step 1: Scan QR Code</h3>
                  <div className="flex justify-center">
                    <img src={qrCodeUrl} alt="2FA QR Code" className="border rounded-lg p-4 bg-white" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Scan this QR code with your authenticator app
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Step 2: Enter Verification Code</h3>
                  <div className="space-y-2">
                    <Label htmlFor="setup-token">6-digit code from your authenticator app</Label>
                    <Input
                      id="setup-token"
                      type="text"
                      placeholder="000000"
                      value={setupToken}
                      onChange={(e) => setSetupToken(e.target.value)}
                      maxLength={6}
                    />
                  </div>
                  <Button 
                    onClick={() => verifyMutation.mutate()} 
                    disabled={verifyMutation.isPending || setupToken.length !== 6}
                    className="w-full"
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    {verifyMutation.isPending ? "Verifying..." : "Enable Two-Factor Authentication"}
                  </Button>
                </div>
              </div>
            )}

            {showBackupCodes && backupCodes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Backup Codes</h3>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
                    </AlertDescription>
                  </Alert>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="font-mono text-sm">
                        {code}
                      </div>
                    ))}
                  </div>
                  <Button onClick={copyBackupCodes} variant="outline" className="w-full">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Backup Codes
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            {isEnabled ? (
              <div className="space-y-6">
                <Alert>
                  <ShieldCheck className="h-4 w-4" />
                  <AlertDescription>
                    Two-factor authentication is currently protecting your account.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Test Authentication</CardTitle>
                      <CardDescription className="text-sm">
                        Verify that your authenticator app is working correctly
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={verifyToken}
                        onChange={(e) => setVerifyToken(e.target.value)}
                        maxLength={6}
                      />
                      <Button 
                        onClick={() => validateMutation.mutate()} 
                        disabled={validateMutation.isPending || verifyToken.length !== 6}
                        className="w-full"
                        size="sm"
                      >
                        <Smartphone className="h-4 w-4 mr-2" />
                        Test Code
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Backup Codes</CardTitle>
                      <CardDescription className="text-sm">
                        {status?.hasBackupCodes 
                          ? `${status.backupCodesCount} codes remaining`
                          : "No backup codes available"
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input
                        type="text"
                        placeholder="Enter auth code to regenerate"
                        value={regenerateToken}
                        onChange={(e) => setRegenerateToken(e.target.value)}
                        maxLength={6}
                      />
                      <Button 
                        onClick={() => regenerateMutation.mutate()} 
                        disabled={regenerateMutation.isPending || regenerateToken.length !== 6}
                        variant="outline"
                        className="w-full"
                        size="sm"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Generate New Codes
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Disabling two-factor authentication will make your account less secure.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label htmlFor="disable-token">Enter authentication code to disable 2FA</Label>
                    <Input
                      id="disable-token"
                      type="text"
                      placeholder="6-digit code"
                      value={disableToken}
                      onChange={(e) => setDisableToken(e.target.value)}
                      maxLength={6}
                    />
                  </div>
                  <Button 
                    onClick={() => disableMutation.mutate()} 
                    disabled={disableMutation.isPending || disableToken.length !== 6}
                    variant="destructive"
                    className="w-full"
                  >
                    {disableMutation.isPending ? "Disabling..." : "Disable Two-Factor Authentication"}
                  </Button>
                </div>
              </div>
            ) : (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Two-factor authentication is not currently enabled. Use the Setup tab to enable it.
                </AlertDescription>
              </Alert>
            )}

            {showBackupCodes && backupCodes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Your New Backup Codes</h3>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      These codes replace your old backup codes. Save them in a secure location.
                    </AlertDescription>
                  </Alert>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="font-mono text-sm">
                        {code}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={copyBackupCodes} variant="outline" className="flex-1">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Codes
                    </Button>
                    <Button onClick={() => setShowBackupCodes(false)} variant="outline" className="flex-1">
                      Close
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}