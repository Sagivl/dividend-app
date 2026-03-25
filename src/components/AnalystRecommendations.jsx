import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, TrendingDown, Target, Info } from "lucide-react";

const AnalystRecommendations = ({ stock }) => {
  if (!stock || !stock.analyst_recommendation || typeof stock.analyst_recommendation !== 'object') {
    return null; // Don't render if no data
  }

  const {
    overall_rating,
    rating_breakdown,
    target_price_average,
    target_price_high,
    target_price_low,
    number_of_analysts,
    recommendation_summary
  } = stock.analyst_recommendation;

  const getRatingColorAndIcon = (rating) => {
    const lowerRating = rating?.toLowerCase() || "n/a";
    if (lowerRating.includes("strong buy")) return { color: "text-green-400", Icon: TrendingUp, badge: "bg-green-700/20 text-green-300 border-green-600" };
    if (lowerRating.includes("buy")) return { color: "text-green-400", Icon: TrendingUp, badge: "bg-green-700/20 text-green-300 border-green-600" };
    if (lowerRating.includes("hold")) return { color: "text-yellow-400", Icon: Info, badge: "bg-yellow-700/20 text-yellow-300 border-yellow-600" };
    if (lowerRating.includes("sell")) return { color: "text-red-400", Icon: TrendingDown, badge: "bg-red-700/20 text-red-300 border-red-600" };
    if (lowerRating.includes("strong sell")) return { color: "text-red-400", Icon: TrendingDown, badge: "bg-red-700/20 text-red-300 border-red-600" };
    return { color: "text-slate-400", Icon: Info, badge: "bg-slate-700 text-slate-400 border-slate-600" };
  };

  const { Icon: RatingIcon, color: ratingColor, badge: ratingBadgeColor } = getRatingColorAndIcon(overall_rating);

  const breakdownExists = rating_breakdown && Object.values(rating_breakdown).some(val => typeof val === 'number' && val > 0);

  // Check if any primary data point exists
  const hasPrimaryData = overall_rating || typeof target_price_average === 'number' || typeof number_of_analysts === 'number' || recommendation_summary;

  if (!hasPrimaryData) {
      return (
        <Card className="bg-slate-800 border border-slate-700">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg sm:text-xl font-bold text-slate-100 flex items-center">
                <Users className="h-5 w-5 mr-2 text-green-400" />
                Analyst Recommendations
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 sm:pt-4">
                <p className="text-sm text-slate-400 text-center py-4">No analyst recommendation data currently available.</p>
            </CardContent>
        </Card>
      );
  }


  return (
    <Card className="bg-slate-800 border border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg sm:text-xl font-bold text-slate-100 flex items-center">
          <Users className="h-5 w-5 mr-2 text-green-400" />
          Analyst Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 sm:pt-4">
        {overall_rating && overall_rating !== "N/A" && (
          <div className="mb-4 p-3 bg-slate-700/50 rounded-lg text-center">
            <div className="text-sm text-slate-300 mb-1">Overall Consensus</div>
            <div className="flex items-center justify-center">
              {RatingIcon && <RatingIcon className={`h-7 w-7 mr-2 ${ratingColor}`} />}
              <Badge className={`${ratingBadgeColor} px-3 py-1.5 text-md font-semibold`}>{overall_rating}</Badge>
            </div>
            {typeof number_of_analysts === 'number' && number_of_analysts > 0 && (
              <p className="text-xs text-slate-400 mt-1.5">Based on {number_of_analysts} analysts</p>
            )}
          </div>
        )}

        {recommendation_summary && (
          <div className="mb-4">
            <h4 className="text-md font-semibold text-slate-200 mb-1">Summary:</h4>
            <p className="text-sm text-slate-300 bg-slate-700/30 p-2 rounded-md">{recommendation_summary}</p>
          </div>
        )}

        {(typeof target_price_average === 'number' || typeof target_price_high === 'number' || typeof target_price_low === 'number') && (
            <div className="mb-4">
                <h4 className="text-md font-semibold text-slate-200 mb-2 flex items-center">
                    <Target className="h-4 w-4 mr-1.5 text-green-400"/> Price Targets (USD)
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                    {(typeof target_price_low === 'number') && (
                        <div className="p-2 bg-slate-700 rounded-md">
                            <div className="text-xs text-slate-400">Low</div>
                            <div className="text-md font-semibold text-slate-200">${target_price_low.toFixed(2)}</div>
                        </div>
                    )}
                    {(typeof target_price_average === 'number') && (
                        <div className="p-2 bg-slate-600 rounded-md">
                            <div className="text-xs text-slate-300">Average</div>
                            <div className="text-lg font-bold text-green-400">${target_price_average.toFixed(2)}</div>
                        </div>
                    )}
                    {(typeof target_price_high === 'number') && (
                        <div className="p-2 bg-slate-700 rounded-md">
                            <div className="text-xs text-slate-400">High</div>
                            <div className="text-md font-semibold text-slate-200">${target_price_high.toFixed(2)}</div>
                        </div>
                    )}
                </div>
            </div>
        )}
        
        {breakdownExists && (
          <div>
            <h4 className="text-md font-semibold text-slate-200 mb-2">Rating Breakdown:</h4>
            <div className="space-y-1 text-sm">
              {Object.entries(rating_breakdown).map(([key, value]) => {
                if (typeof value === 'number' && value > 0) {
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  const { badge } = getRatingColorAndIcon(label);
                  return (
                    <div key={key} className="flex justify-between items-center p-1.5 bg-slate-700/30 rounded">
                      <span className="text-slate-300">{label}:</span>
                      <Badge variant="outline" className={`${badge} px-2 py-0.5 text-xs`}>{value}</Badge>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalystRecommendations;