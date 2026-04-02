import React, { useState } from "react";

const StockLogo = ({ 
  stock, 
  size = "md", 
  className = "",
  showFallback = true 
}) => {
  const [hasError, setHasError] = useState(false);
  
  const sizeConfig = {
    sm: { container: "h-6 w-6", text: "text-[10px]" },
    md: { container: "h-10 w-10", text: "text-sm" },
    lg: { container: "h-12 w-12", text: "text-base" },
    xl: { container: "h-16 w-16", text: "text-lg" }
  };

  const config = sizeConfig[size] || sizeConfig.md;
  const logoUrl = stock?.logo150x150 || stock?.logo50x50;
  const ticker = stock?.ticker?.toUpperCase() || "?";
  
  // Generate a consistent color based on ticker
  const getColorFromTicker = (ticker) => {
    const colors = [
      "bg-blue-600",
      "bg-green-600", 
      "bg-purple-600",
      "bg-orange-600",
      "bg-pink-600",
      "bg-cyan-600",
      "bg-indigo-600",
      "bg-teal-600"
    ];
    let hash = 0;
    for (let i = 0; i < ticker.length; i++) {
      hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };
  
  if (!logoUrl || hasError) {
    if (!showFallback) return null;
    
    const bgColor = getColorFromTicker(ticker);
    
    return (
      <div 
        className={`${config.container} rounded-full ${bgColor} flex items-center justify-center text-white font-bold ${config.text} border border-slate-600/50 flex-shrink-0 shadow-sm ${className}`}
      >
        {ticker.slice(0, 2)}
      </div>
    );
  }

  return (
    <img 
      src={logoUrl}
      alt={`${ticker} logo`}
      className={`${config.container} rounded-full object-cover border border-slate-600 flex-shrink-0 bg-white ${className}`}
      onError={() => setHasError(true)}
    />
  );
};

export default StockLogo;
