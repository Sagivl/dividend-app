import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, MinusCircle, ExternalLink, Newspaper, CalendarDays } from "lucide-react";
import { format, parseISO, isValid as isValidDate } from "date-fns";

const NewsSentiment = ({ stock }) => {
  if (!stock || !stock.news_sentiment || typeof stock.news_sentiment !== 'object') {
    return null; // Don't render if no data or invalid data structure
  }

  const { overall_score, overall_label, summary, articles } = stock.news_sentiment;

  const getSentimentIconAndColor = (label) => {
    const lowerLabel = label?.toLowerCase() || "";
    if (lowerLabel.includes("positive")) return { Icon: TrendingUp, color: "text-green-400", badgeColor: "bg-green-700/20 text-green-300 border-green-600" };
    if (lowerLabel.includes("negative")) return { Icon: TrendingDown, color: "text-red-400", badgeColor: "bg-red-700/20 text-red-300 border-red-600" };
    return { Icon: MinusCircle, color: "text-slate-400", badgeColor: "bg-slate-700 text-slate-400 border-slate-600" };
  };

  const { Icon: OverallIcon, color: overallColor, badgeColor: overallBadgeColor } = getSentimentIconAndColor(overall_label);

  const validArticles = Array.isArray(articles) ? articles.filter(article => article && article.title && article.url && article.source_name && article.published_at) : [];

  return (
    <Card className="bg-slate-800 border border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg sm:text-xl font-bold text-slate-100 flex items-center">
          <Newspaper className="h-5 w-5 mr-2 text-green-400" />
          News Sentiment
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 sm:pt-4">
        {(overall_label || summary) && (
          <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
            <div className="flex items-center mb-2">
              {OverallIcon && <OverallIcon className={`h-6 w-6 mr-2 ${overallColor}`} />}
              {overall_label && (
                <Badge className={`${overallBadgeColor} px-2 py-1 text-sm`}>{overall_label}</Badge>
              )}
              {typeof overall_score === 'number' && (
                 <span className={`ml-2 text-sm font-semibold ${overallColor}`}>({overall_score.toFixed(0)}/100)</span>
              )}
            </div>
            {summary && <p className="text-sm text-slate-300">{summary}</p>}
          </div>
        )}

        {validArticles.length > 0 && (
          <div>
            <h4 className="text-md font-semibold text-slate-200 mb-2">Recent Articles:</h4>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {validArticles.map((article, index) => (
                <div key={index} className="p-3 bg-slate-700 rounded-md">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-green-400 hover:text-green-300 hover:underline block mb-1"
                  >
                    {article.title} <ExternalLink className="h-3 w-3 inline-block ml-1" />
                  </a>
                  {article.article_summary && (
                     <p className="text-xs text-slate-300 mb-1.5 leading-relaxed">{article.article_summary}</p>
                  )}
                  <div className="text-2xs text-slate-400 flex items-center justify-between">
                    <span>Source: {article.source_name}</span>
                    {isValidDate(parseISO(article.published_at)) && (
                      <span className="flex items-center">
                        <CalendarDays className="h-3 w-3 mr-1" />
                        {format(parseISO(article.published_at), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
         {(!overall_label && !summary && validArticles.length === 0) && (
            <p className="text-sm text-slate-400 text-center py-4">No news sentiment data currently available.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default NewsSentiment;