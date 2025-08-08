import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Terminal, 
  Wifi, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Device {
  id: string;
  name: string;
  ip: string;
  port: string;
  data?: unknown;
}

interface TestResult {
  ip: string;
  port: string;
  timestamp: string;
  status: 'success' | 'failed' | 'error';
  statusCode?: number;
  statusText?: string;
  data?: unknown;
  error?: string;
}

interface NetworkDebuggerProps {
  onDeviceFound?: (device: Device) => void;
}

export const NetworkDebugger: React.FC<NetworkDebuggerProps> = ({ onDeviceFound }) => {
  const [testIP, setTestIP] = useState('192.168.234.180'); // Pre-fill with detected IP
  const [testPort, setTestPort] = useState('5000');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const commonPorts = ['5000', '3000', '8000', '8080', '80', '22', '443'];
  const commonIPs = [
    '192.168.234.180', // Detected working IP
    '192.168.1.100', '192.168.1.101', '192.168.1.102',
    '192.168.0.100', '192.168.0.101', '192.168.0.102',
    '10.0.0.100', '10.0.0.101', '10.0.0.102'
  ];

  const testConnection = async (ip: string, port: string): Promise<TestResult> => {
    const timestamp = new Date().toLocaleTimeString();
    
    try {
      console.log(`Testing ${ip}:${port}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`http://${ip}:${port}`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      const result: TestResult = {
        ip,
        port,
        timestamp,
        status: response.ok ? 'success' : 'failed',
        statusCode: response.status,
        statusText: response.statusText,
        data: null
      };

      if (response.ok) {
        let data: Record<string, unknown> = {};
        try {
          const contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            // Handle HTML or plain text responses
            const textContent = await response.text();
            console.log(`Found device at ${ip}:${port} (non-JSON response):`, textContent.substring(0, 100));
            
            // Check if it looks like a Smart Monitor response
            if (textContent.includes('Smart') || textContent.includes('Monitor') || textContent.includes('Pi')) {
              data = {
                name: `Smart Monitor Pi (${ip})`,
                type: 'html_response',
                content: textContent.substring(0, 200),
                responseType: 'HTML/Text'
              };
            } else {
              data = {
                name: `Web Server (${ip})`,
                type: 'web_server',
                content: textContent.substring(0, 200),
                responseType: 'HTML/Text'
              };
            }
          }
          
          result.data = data;
          
          if (onDeviceFound) {
            onDeviceFound({
              id: `pi-${ip}`,
              name: (typeof data.name === 'string' ? data.name : null) || `Device at ${ip}`,
              ip,
              port,
              data
            });
          }
        } catch (parseError) {
          console.log(`Response parsing failed for ${ip}:${port}:`, parseError);
          result.data = {
            error: 'Failed to parse response',
            responseType: 'Unknown'
          };
        }
      }
      
      return result;
    } catch (error: unknown) {
      return {
        ip,
        port,
        timestamp,
        status: 'error',
        error: error instanceof Error 
          ? (error.name === 'AbortError' ? 'Timeout' : error.message)
          : 'Unknown error'
      };
    }
  };

  const runSingleTest = async () => {
    if (!testIP.trim()) {
      toast({
        title: "Missing IP",
        description: "Please enter an IP address to test",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    const result = await testConnection(testIP, testPort);
    setTestResults(prev => [result, ...prev.slice(0, 9)]);
    setIsTesting(false);

    if (result.status === 'success') {
      toast({
        title: "Connection Successful!",
        description: `Connected to ${testIP}:${testPort}`,
      });
    } else {
      toast({
        title: "Connection Failed",
        description: ('error' in result && result.error) || `Could not connect to ${testIP}:${testPort}`,
        variant: "destructive"
      });
    }
  };

  const runBatchTest = async () => {
    setIsTesting(true);
    setTestResults([]);
    
    const tests = [];
    for (const ip of commonIPs) {
      for (const port of ['5000', '3000', '8000']) {
        tests.push({ ip, port });
      }
    }

    for (const { ip, port } of tests.slice(0, 15)) {
      const result = await testConnection(ip, port);
      setTestResults(prev => [result, ...prev]);
      
      if (result.status === 'success') {
        toast({
          title: "Device Found!",
          description: `Found device at ${ip}:${port}`,
        });
      }
      
      // Small delay to prevent overwhelming the network
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setIsTesting(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const getStatusBadge = (result: TestResult) => {
    if (result.status === 'success') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        <CheckCircle className="h-3 w-3 mr-1" />
        Success
      </Badge>;
    } else {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
        <AlertCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Network Debugger
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Test</TabsTrigger>
            <TabsTrigger value="batch">Batch Scan</TabsTrigger>
          </TabsList>
          
          <TabsContent value="single" className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label htmlFor="test-ip">IP Address</Label>
                <Input
                  id="test-ip"
                  placeholder="192.168.1.100"
                  value={testIP}
                  onChange={(e) => setTestIP(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="test-port">Port</Label>
                <Input
                  id="test-port"
                  placeholder="5000"
                  value={testPort}
                  onChange={(e) => setTestPort(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={runSingleTest} 
                disabled={isTesting}
                className="flex-1"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Wifi className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Common Pi IPs to try:</p>
              <div className="flex flex-wrap gap-1">
                {commonIPs.slice(0, 6).map(ip => (
                  <button
                    key={ip}
                    onClick={() => setTestIP(ip)}
                    className="px-2 py-1 bg-muted rounded text-xs hover:bg-muted/80"
                  >
                    {ip}
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="batch" className="space-y-4">
            <Button 
              onClick={runBatchTest} 
              disabled={isTesting}
              className="w-full"
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 mr-2" />
                  Scan Common IPs
                </>
              )}
            </Button>
            
            <div className="text-xs text-muted-foreground">
              <p>This will test common IP addresses and ports that Raspberry Pis typically use.</p>
            </div>
          </TabsContent>
        </Tabs>

        {testResults.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-2">Test Results</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {testResults.map((result, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {result.ip}:{result.port}
                      </span>
                      {getStatusBadge(result)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(`${result.ip}:${result.port}`)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {result.timestamp}
                      </span>
                    </div>
                  </div>
                  
                  {result.data && (
                    <div className="mt-2 p-2 bg-muted rounded text-xs">
                      <pre>{JSON.stringify(result.data, null, 2)}</pre>
                    </div>
                  )}
                  
                  {result.error && (
                    <div className="mt-2 text-xs text-red-400">
                      Error: {result.error}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 p-3 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Debug Tips:</h4>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>• Check your Pi's IP with: <code className="bg-muted px-1 rounded">hostname -I</code></li>
            <li>• Verify your Pi's web server is running on port 5000</li>
            <li>• Make sure your Pi and computer are on the same network</li>
            <li>• Try accessing your Pi directly: <code className="bg-muted px-1 rounded">http://[PI_IP]:5000</code></li>
            <li>• Check Pi's firewall settings if connection fails</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
