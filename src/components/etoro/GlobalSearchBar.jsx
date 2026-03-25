import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { createPageUrl } from "@/utils";
import { searchInstruments } from "@/functions/searchInstruments";

const LOG_PREFIX = "[GlobalSearchBar]";

export default function GlobalSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const fields = 'instrumentId,internalInstrumentDisplayName,internalSymbolFull,internalAssetClassName,currentRate,logo50x50,dailyPriceChange,isOpen';

        const response = await searchInstruments({ 
          searchText: query, 
          pageSize: 10, 
          fields: fields 
        });

        console.log(`${LOG_PREFIX} Search response for "${query}":`, response);
        
        const items = response?.data?.items;
        const finalResults = Array.isArray(items) ? items : [];
        console.log(`${LOG_PREFIX} Found ${finalResults.length} results`);
        setResults(finalResults);
        
      } catch (error) {
        console.error(`${LOG_PREFIX} Search error in effect:`, error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleSelect = (instrument) => {
    if (!instrument?.instrumentId) return;
    router.push(createPageUrl(`Instrument?id=${instrument.instrumentId}`));
    setShowResults(false);
    setQuery('');
  };

  return (
    <div className="relative w-full" ref={searchRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <Input
          type="text"
          placeholder="Search eToro instruments (e.g. 'Apple' or 'AAPL')"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="w-full pl-10 pr-4 py-2 h-12 bg-slate-800 border border-slate-700 placeholder-slate-400 text-slate-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-md transition-all duration-300 ease-in-out"
        />
      </div>

      {showResults && (query.length > 0 || loading) && (
        <Card className="absolute mt-1 w-full z-50 max-h-[400px] overflow-auto shadow-lg bg-slate-800 border-slate-700">
          <div className="p-1">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (results?.length > 0) ? (
              <div className="py-1">
                {results.map((instrument) => {
                  if (!instrument?.instrumentId) return null;
                  return (
                    <div
                      key={instrument.instrumentId}
                      onClick={() => handleSelect(instrument)}
                      className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-slate-700 rounded-md"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={instrument.logo50x50} />
                        <AvatarFallback className="bg-slate-600 text-slate-300">
                          {String(instrument.internalInstrumentDisplayName || "NA").substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-100 truncate">{instrument.internalInstrumentDisplayName || "Unknown Instrument"}</p>
                        <p className="text-sm text-slate-400 truncate">{instrument.internalSymbolFull || "N/A"}</p>
                      </div>
                      <div className="ml-auto text-right flex-shrink-0">
                        <p className="font-medium text-green-400">${instrument.currentRate?.toFixed(2) || 'N/A'}</p>
                        <p className="text-xs text-slate-500">{instrument.internalAssetClassName || "N/A"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : query.length > 1 && !loading ? (
              <div className="p-4 text-center text-slate-400">
                No instruments found for "{query}"
              </div>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
}