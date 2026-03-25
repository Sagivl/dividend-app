
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export const defaultConfig = {
  marketCapMin: 100000, // $100B in millions
  chowderMin: 10.5, 
  payoutRatioMax: 50,
  roeMin: 15,
  betaMax: 1.0,
  dividendYieldMin: 2,
};

const goalConfigs = {
  income: {
    dividendYieldMin: 3.5,
    payoutRatioMax: 70,
    chowderMin: 8,
    roeMin: 12,
  },
  growth: {
    dividendYieldMin: 1.5,
    payoutRatioMax: 40,
    chowderMin: 12,
    roeMin: 18,
  },
  balanced: {},
};

const riskAdjustments = {
  conservative: {
    betaMax: 0.8,
    marketCapMin: 200000,
    payoutRatioMax: 60,
  },
  moderate: {},
  aggressive: {
    betaMax: 1.5,
    marketCapMin: 50000,
    payoutRatioMax: 80,
  },
};

export const getPersonalizedConfig = (investmentGoal, riskTolerance) => {
  let config = { ...defaultConfig };

  if (investmentGoal && goalConfigs[investmentGoal]) {
    config = { ...config, ...goalConfigs[investmentGoal] };
  }

  if (riskTolerance && riskAdjustments[riskTolerance]) {
    config = { ...config, ...riskAdjustments[riskTolerance] };
  }

  return config;
};

export default function ConfigurationDialog({ open, onOpenChange, currentConfig, onSaveConfig }) {
  const [config, setConfig] = useState(currentConfig || defaultConfig);

  useEffect(() => {
    setConfig(currentConfig || defaultConfig);
  }, [currentConfig]);

  const handleSliderChange = (key, valueArray) => {
    let valueToSet = valueArray[0];
    if (key === "marketCapMin") {
      valueToSet = valueArray[0] * 1000; 
    }
    setConfig(prev => ({ ...prev, [key]: valueToSet }));
  };

  const handleSubmit = () => {
    const validatedConfig = { ...config };
    Object.keys(defaultConfig).forEach(key => {
      let val = validatedConfig[key];
      // Ensure marketCapMin is handled correctly if it can be 0 or very small
      if (key === 'marketCapMin') {
        // Assuming marketCapMin should be positive. Adjust if 0 is valid or other lower bound.
        if (typeof val !== 'number' || isNaN(val) || val < (10 * 1000)) { // Example: min $10B
          validatedConfig[key] = defaultConfig.marketCapMin; 
        }
      } else if (typeof val !== 'number' || isNaN(val)) {
         // Ensure other numeric fields fallback to default if invalid
         validatedConfig[key] = defaultConfig[key];
      } else {
        // Add specific range checks if necessary, e.g., payoutRatioMax shouldn't be negative
        if (key === 'payoutRatioMax' && val < 0) validatedConfig[key] = defaultConfig[key];
        // etc. for other fields
      }
    });
    onSaveConfig(validatedConfig);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setConfig(currentConfig || defaultConfig); // Reset to original on cancel
    onOpenChange(false);
  };
  
  const renderSliderRow = (label, id, unit, value, min, max, step = 1) => (
     <div className="space-y-2" dir="ltr">
        <div className="flex justify-between items-center">
            <Label htmlFor={id} className="text-sm text-slate-200">{label}:</Label>
            <span className="text-sm font-medium text-green-400"> {/* Value color changed */}
              {id === "marketCapMin" ? (value / 1000) : value} 
              {unit}
            </span>
        </div>
        <div className="w-full" dir="ltr">
          <Slider
              id={id}
              min={min}
              max={max}
              step={step}
              value={[id === "marketCapMin" ? (value / 1000) : value]} 
              onValueChange={(valArray) => handleSliderChange(id, valArray)}
              className="w-full [&>span:first-child]:h-2 [&>span:first-child]:bg-slate-600 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:bg-[#3FB923] [&_[role=slider]]:border-2 [&_[role=slider]]:border-[#3FB923] [&_[role=slider]]:shadow-md [&>span:last-child]:bg-[#3FB923]"
              dir="ltr"
          />
        </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] bg-slate-800 border-slate-700 text-slate-200" dir="ltr">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Configure Suggestion Criteria</DialogTitle>
          <DialogDescription className="text-slate-400">
            Set your preferred thresholds for AI stock suggestions. These values will be used to filter and score assets.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-4 max-h-[60vh] overflow-y-auto pr-2" dir="ltr">
          {renderSliderRow("Min. Market Cap", "marketCapMin", " Billion USD", config.marketCapMin, 10, 2000, 10)} 
          {renderSliderRow("Min. Chowder #", "chowderMin", "", config.chowderMin, 5, 20, 0.5)}
          {renderSliderRow("Max. Payout Ratio", "payoutRatioMax", "%", config.payoutRatioMax, 10, 90, 5)}
          {renderSliderRow("Min. ROE", "roeMin", "%", config.roeMin, 5, 50, 1)}
          {renderSliderRow("Max. Beta", "betaMax", "", config.betaMax, 0.1, 2.0, 0.1)}
          {renderSliderRow("Min. Dividend Yield", "dividendYieldMin", "%", config.dividendYieldMin, 0.5, 10, 0.5)}
        </div>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCancel}
            className="w-full sm:w-auto bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-slate-200"
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            className="w-full sm:w-auto bg-[#3FB923] hover:bg-green-600 text-white"
          >
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
