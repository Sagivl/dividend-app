import React from 'react';

const HighlightMatch = ({ text, highlight }) => {
  if (!highlight || !text) {
    return <span>{text}</span>;
  }

  // Escape special characters in the highlight string for the regex
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedHighlight})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className="truncate">
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="text-green-400 font-bold bg-green-900/30 rounded-[3px] px-0.5">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

export default HighlightMatch;