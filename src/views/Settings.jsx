'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, Link2, Unlink, Eye, EyeOff, CheckCircle2, XCircle, Loader2, ExternalLink, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PageContainer, PageHeader } from '@/components/layout';
import { UserSettings } from '@/entities/UserSettings';
import { toast } from 'react-hot-toast';

export default function SettingsView() {
  const [userKey, setUserKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success, message, environment }
  const [isLoading, setIsLoading] = useState(true);
  const [maskedKey, setMaskedKey] = useState('');

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const key = await UserSettings.getEtoroUserKey();
      if (key) {
        setIsConnected(true);
        setMaskedKey(key.slice(0, 8) + '••••••••' + key.slice(-4));
      } else {
        setIsConnected(false);
        setMaskedKey('');
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const testConnection = async (keyToTest) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/trading?action=portfolio', {
        headers: {
          'Content-Type': 'application/json',
          'x-etoro-user-key': keyToTest,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const positionCount = data?.clientPortfolio?.positions?.length || 0;

        const envRes = await fetch('/api/trading?action=env');
        const envData = await envRes.ok ? await envRes.json() : {};

        setTestResult({
          success: true,
          message: `Connected successfully. Found ${positionCount} position${positionCount !== 1 ? 's' : ''}.`,
          environment: envData.environment || 'unknown',
        });
        return true;
      } else {
        const errData = await res.json().catch(() => ({}));
        setTestResult({
          success: false,
          message: errData.error || `Connection failed (${res.status}). Check your User Key.`,
        });
        return false;
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Could not reach the server. Please try again.',
      });
      return false;
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    const trimmedKey = userKey.trim();
    if (!trimmedKey) {
      toast.error('Please enter your eToro User Key');
      return;
    }

    const success = await testConnection(trimmedKey);
    if (success) {
      await UserSettings.setEtoroUserKey(trimmedKey);
      setIsConnected(true);
      setMaskedKey(trimmedKey.slice(0, 8) + '••••••••' + trimmedKey.slice(-4));
      setUserKey('');
      setShowKey(false);
      toast.success('eToro account connected');
    }
  };

  const handleDisconnect = async () => {
    await UserSettings.clearEtoroUserKey();
    setIsConnected(false);
    setMaskedKey('');
    setUserKey('');
    setTestResult(null);
    toast.success('eToro account disconnected');
  };

  if (isLoading) {
    return (
      <PageContainer maxWidth="2xl" bottomPadding>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="2xl" bottomPadding>
      <PageHeader title="Settings" icon={SettingsIcon} />

      <div className="space-y-6 mt-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">eToro Account</CardTitle>
                <CardDescription className="mt-1">
                  Connect your eToro account to view your personal portfolio and trade.
                </CardDescription>
              </div>
              {isConnected && (
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {isConnected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <Shield className="h-5 w-5 text-green-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">User Key</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{maskedKey}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300 shrink-0"
                  >
                    <Unlink className="h-3.5 w-3.5 mr-1.5" />
                    Disconnect
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  To use a different key, disconnect first, then enter the new one.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="etoro-key" className="text-sm font-medium">
                    eToro User Key
                  </Label>
                  <div className="relative">
                    <Input
                      id="etoro-key"
                      type={showKey ? 'text' : 'password'}
                      value={userKey}
                      onChange={(e) => {
                        setUserKey(e.target.value);
                        setTestResult(null);
                      }}
                      placeholder="Paste your eToro User Key here"
                      className="pr-10 font-mono text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && userKey.trim()) handleConnect();
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleConnect}
                    disabled={!userKey.trim() || isTesting}
                    className="bg-[#3FB923] hover:bg-green-600 text-white"
                  >
                    {isTesting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4 mr-2" />
                    )}
                    {isTesting ? 'Testing...' : 'Connect'}
                  </Button>
                </div>

                <a
                  href="https://www.etoro.com/settings/trading"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Get your User Key from eToro Settings → Trading
                </a>
              </div>
            )}

            {testResult && (
              <Alert
                className={
                  testResult.success
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
                <AlertDescription className="text-sm">
                  {testResult.message}
                  {testResult.environment && testResult.success && (
                    <span className="ml-2">
                      ({testResult.environment === 'demo' ? (
                        <span className="inline-flex items-center gap-1">
                          <Shield className="h-3 w-3 inline" /> Demo mode
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 inline" /> Real mode
                        </span>
                      )})
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">1</span>
              <p>Go to <a href="https://www.etoro.com/settings/trading" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">etoro.com/settings/trading</a> and copy your User Key.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">2</span>
              <p>Paste it above and click Connect. We'll verify it works.</p>
            </div>
            <div className="flex gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">3</span>
              <p>Your personal eToro portfolio will appear in the Portfolio page, filtered to dividend-paying stocks and ETFs.</p>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border text-xs">
              <p><strong className="text-foreground">Security:</strong> Your key is stored locally in your browser and only sent to our server (never directly to eToro from your browser). You can revoke it anytime from eToro settings.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
