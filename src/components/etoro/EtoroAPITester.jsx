
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Play, Code, RefreshCw } from 'lucide-react';
import { searchInstruments } from "@/functions/searchInstruments";

export default function EtoroAPITester() {
  const [params, setParams] = useState({
    internalInstrumentDisplayName: '',
    internalSymbolFull: '',
    InstrumentId: '',
    isin: '',
    cusip: '', // Added CUSIP parameter
    pageSize: 20,
    page: 1,
    fields: "instrumentId,displayname,popularityUniques7Day,instrumentTypeID,instrumentType,exchangeID,symbol,isOpen,internalAssetClassId,internalInstrumentDisplayName,isInternalInstrument,internalSymbolFull,isHiddenFromClient,internalInstrumentId,internalCryptoTypeId,internalExchangeId,internalExchangeName,internalAssetClassName,logo150x150,dailyPriceChange,absDailyPriceChange,weeklyPriceChange,monthlyPriceChange,isDelisted,isCurrentlyTradable,isExchangeOpen,internalClosingPrice,isActiveInPlatform,isBuyEnabled,currentRate,threeMonthPriceChange,sixMonthPriceChange,oneYearPriceChange,currMonthPriceChange,currQuarterPriceChange,currYearPriceChange,lastYearPriceChange,lastTwoYearsPriceChange,oneMonthAgoPriceChange,twoMonthsAgoPriceChange,threeMonthsAgoPriceChange,sixMonthsAgoPriceChange,oneYearAgoPriceChange,cvtBid,cvtAsk,cvtBiNoSpread,cvtAskNoSpread,traders7DayChange,traders14DayChange,traders30DayChange,popularityUniques14Day,popularityUniques30Day,marketCapInUSD,isin,cusip",
    sort: 'PopularityUniques'
  });
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleParamChange = (key, value) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Filter out empty parameters
      const filteredParams = {};
      Object.keys(params).forEach(key => {
        if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
          filteredParams[key] = params[key];
        }
      });

      const response = await searchInstruments(filteredParams);
      setResults(response.data);
    } catch (err) {
      console.error('API Test Error:', err);
      setError(err.message || 'An error occurred while testing the API');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setParams({
      internalInstrumentDisplayName: '',
      internalSymbolFull: '',
      InstrumentId: '',
      isin: '',
      cusip: '', // Added CUSIP parameter to reset
      pageSize: 20,
      page: 1,
      fields: "instrumentId,displayname,popularityUniques7Day,instrumentTypeID,instrumentType,exchangeID,symbol,isOpen,internalAssetClassId,internalInstrumentDisplayName,isInternalInstrument,internalSymbolFull,isHiddenFromClient,internalInstrumentId,internalCryptoTypeId,internalExchangeId,internalExchangeName,internalAssetClassName,logo150x150,dailyPriceChange,absDailyPriceChange,weeklyPriceChange,monthlyPriceChange,isDelisted,isCurrentlyTradable,isExchangeOpen,internalClosingPrice,isActiveInPlatform,isBuyEnabled,currentRate,threeMonthPriceChange,sixMonthPriceChange,oneYearPriceChange,currMonthPriceChange,currQuarterPriceChange,currYearPriceChange,lastYearPriceChange,lastTwoYearsPriceChange,oneMonthAgoPriceChange,twoMonthsAgoPriceChange,threeMonthsAgoPriceChange,sixMonthsAgoPriceChange,oneYearAgoPriceChange,cvtBid,cvtAsk,cvtBiNoSpread,cvtAskNoSpread,traders7DayChange,traders14DayChange,traders30DayChange,popularityUniques14Day,popularityUniques30Day,marketCapInUSD,isin,cusip",
      sort: 'PopularityUniques'
    });
    setResults(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2">API Tester</h2>
        <p className="text-slate-400">Test the eToro Search Instruments API with different parameters</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parameters Card */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg text-slate-100 flex items-center">
              <Code className="h-5 w-5 mr-2 text-green-400" />
              API Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="displayName" className="text-sm text-slate-300">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="e.g., Apple"
                  value={params.internalInstrumentDisplayName}
                  onChange={(e) => handleParamChange('internalInstrumentDisplayName', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-slate-200"
                />
              </div>
              
              <div>
                <Label htmlFor="symbol" className="text-sm text-slate-300">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="e.g., AAPL"
                  value={params.internalSymbolFull}
                  onChange={(e) => handleParamChange('internalSymbolFull', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-slate-200"
                />
              </div>
              
              <div>
                <Label htmlFor="instrumentId" className="text-sm text-slate-300">Instrument ID</Label>
                <Input
                  id="instrumentId"
                  placeholder="e.g., 12345"
                  value={params.InstrumentId}
                  onChange={(e) => handleParamChange('InstrumentId', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-slate-200"
                />
              </div>
              
              <div>
                <Label htmlFor="isin" className="text-sm text-slate-300">ISIN</Label>
                <Input
                  id="isin"
                  placeholder="e.g., US0378331005"
                  value={params.isin}
                  onChange={(e) => handleParamChange('isin', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-slate-200"
                />
              </div>
              
              {/* New CUSIP Input */}
              <div>
                <Label htmlFor="cusip" className="text-sm text-slate-300">CUSIP</Label>
                <Input
                  id="cusip"
                  placeholder="e.g., 037833100"
                  value={params.cusip}
                  onChange={(e) => handleParamChange('cusip', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-slate-200"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pageSize" className="text-sm text-slate-300">Page Size</Label>
                  <Input
                    id="pageSize"
                    type="number"
                    value={params.pageSize}
                    onChange={(e) => handleParamChange('pageSize', parseInt(e.target.value) || 20)}
                    className="bg-slate-700 border-slate-600 text-slate-200"
                  />
                </div>
                
                <div>
                  <Label htmlFor="page" className="text-sm text-slate-300">Page</Label>
                  <Input
                    id="page"
                    type="number"
                    value={params.page}
                    onChange={(e) => handleParamChange('page', parseInt(e.target.value) || 1)}
                    className="bg-slate-700 border-slate-600 text-slate-200"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="fields" className="text-sm text-slate-300">Fields (comma-separated)</Label>
                <Input
                  id="fields"
                  placeholder="instrumentId,internalInstrumentDisplayName,currentRate"
                  value={params.fields}
                  onChange={(e) => handleParamChange('fields', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-slate-200"
                />
              </div>
              
              <div>
                <Label htmlFor="sort" className="text-sm text-slate-300">Sort</Label>
                <Input
                  id="sort"
                  placeholder="e.g., PopularityUniques"
                  value={params.sort}
                  onChange={(e) => handleParamChange('sort', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-slate-200"
                />
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleTest} 
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Test API
              </Button>
              
              <Button 
                onClick={handleReset} 
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg text-slate-100">API Response</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-green-400" />
                <span className="ml-2 text-slate-400">Testing API...</span>
              </div>
            ) : error ? (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                <h4 className="text-red-400 font-medium mb-2">Error</h4>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            ) : results ? (
              <div className="space-y-4">
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-sm text-slate-400 mb-2">Summary</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Total Items:</span>
                      <span className="ml-2 text-green-400 font-medium">
                        {results.items?.length || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Status:</span>
                      <span className="ml-2 text-green-400 font-medium">Success</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-slate-400 mb-2">Raw Response</div>
                  <Textarea
                    value={JSON.stringify(results, null, 2)}
                    readOnly
                    className="bg-slate-900 border-slate-600 text-slate-200 font-mono text-xs h-96 overflow-auto"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-500">
                <div className="text-center">
                  <Code className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                  <p>No results yet. Click "Test API" to see the response.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
