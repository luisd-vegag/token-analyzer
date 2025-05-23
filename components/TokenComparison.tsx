
import React from 'react';

interface TokenComparisonProps {
  textTokens: number | null;
  pdfTokens: number | null;
  isTextFromChat?: boolean;
  isPdfFromChat?: boolean;
}

export const TokenComparison: React.FC<TokenComparisonProps> = ({ textTokens, pdfTokens, isTextFromChat, isPdfFromChat }) => {
  if (textTokens === null || pdfTokens === null) {
    return (
        <div className="bg-slate-800 shadow-xl rounded-xl p-6 sm:p-8 border border-slate-700">
            <h2 className="text-2xl font-semibold mb-4 text-purple-400 flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 mr-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6.75A2.25 2.25 0 0 1 5.25 4.5h13.5A2.25 2.25 0 0 1 21 6.75v10.5A2.25 2.25 0 0 1 18.75 19.5H5.25A2.25 2.25 0 0 1 3 17.25V6.75ZM9 12.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Zm-3.75-3a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Z" />
                </svg>
                Token Usage Comparison
            </h2>
            <p className="text-slate-400 text-center py-4">Analyze both plain text and PDF to see a comparison of token usage.</p>
        </div>
    );
  }

  if (textTokens === 0 && pdfTokens === 0) {
    return (
        <div className="bg-slate-800 shadow-xl rounded-xl p-6 sm:p-8 border border-slate-700">
             <h2 className="text-2xl font-semibold mb-4 text-purple-400 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 mr-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6.75A2.25 2.25 0 0 1 5.25 4.5h13.5A2.25 2.25 0 0 1 21 6.75v10.5A2.25 2.25 0 0 1 18.75 19.5H5.25A2.25 2.25 0 0 1 3 17.25V6.75ZM9 12.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Zm-3.75-3a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Z" />
                </svg>
                Token Usage Comparison
            </h2>
            <div className="text-center p-4">
                <p className="text-xl text-cyan-400">Both plain text and PDF resulted in 0 tokens.</p>
                <p className="text-sm text-slate-400 mt-2">
                    (Text: 0 tokens{isTextFromChat && <span className="text-xs text-slate-500 ml-1">(from chat)</span>}, PDF: 0 tokens{isPdfFromChat && <span className="text-xs text-slate-500 ml-1">(from chat)</span>})
                </p>
            </div>
        </div>
    );
  }

  if (textTokens === 0) {
     return (
        <div className="bg-slate-800 shadow-xl rounded-xl p-6 sm:p-8 border border-slate-700">
             <h2 className="text-2xl font-semibold mb-4 text-purple-400 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 mr-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6.75A2.25 2.25 0 0 1 5.25 4.5h13.5A2.25 2.25 0 0 1 21 6.75v10.5A2.25 2.25 0 0 1 18.75 19.5H5.25A2.25 2.25 0 0 1 3 17.25V6.75ZM9 12.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Zm-3.75-3a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Z" />
                </svg>
                Token Usage Comparison
            </h2>
            <div className="text-center p-4">
                <p className="text-xl text-yellow-400">
                    Plain text has 0 tokens. PDF has {pdfTokens} tokens.
                </p>
                <p className="text-sm text-slate-500 mt-1">A percentage comparison is not meaningful when the base (text tokens) is zero.</p>
                <p className="text-sm text-slate-400 mt-2">
                    (Text: 0 tokens{isTextFromChat && <span className="text-xs text-slate-500 ml-1">(from chat)</span>}, PDF: {pdfTokens} tokens{isPdfFromChat && <span className="text-xs text-slate-500 ml-1">(from chat)</span>})
                </p>
            </div>
        </div>
    );
  }

  const difference = pdfTokens - textTokens;
  const percentageDifference = (difference / textTokens) * 100;
  const absPercentageDifference = Math.abs(percentageDifference).toFixed(1);

  let messageIntro = "";
  let comparisonText = "";
  let percentageColorClass = "text-gray-100";

  if (percentageDifference > 0.05) { // Using a small threshold to account for floating point inaccuracies for "more" or "less"
    messageIntro = "PDF uses";
    comparisonText = "more tokens than plain text.";
    percentageColorClass = "text-red-400 font-bold";
  } else if (percentageDifference < -0.05) {
    messageIntro = "PDF uses";
    comparisonText = "fewer tokens than plain text.";
    percentageColorClass = "text-green-400 font-bold";
  } else {
    messageIntro = "PDF and plain text use";
    comparisonText = "approximately the same number of tokens.";
    percentageColorClass = "text-cyan-400 font-bold";
  }

  return (
    <div className="bg-slate-800 shadow-xl rounded-xl p-6 sm:p-8 border border-slate-700">
      <h2 className="text-2xl font-semibold mb-6 text-purple-400 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 mr-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6.75A2.25 2.25 0 0 1 5.25 4.5h13.5A2.25 2.25 0 0 1 21 6.75v10.5A2.25 2.25 0 0 1 18.75 19.5H5.25A2.25 2.25 0 0 1 3 17.25V6.75ZM9 12.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Zm-3.75-3a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Z" />
        </svg>
        Token Usage Comparison
      </h2>
      <div className="text-center space-y-3">
        <p className="text-xl sm:text-2xl text-gray-100">
          {messageIntro}
          {percentageDifference !== 0 && Math.abs(percentageDifference) > 0.05 && (
            <span className={`mx-1 text-2xl sm:text-3xl ${percentageColorClass}`}>
              {absPercentageDifference}%
            </span>
          )}
          {comparisonText}
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-baseline gap-x-6 gap-y-2 pt-2 text-sm sm:text-base">
            <p className="text-slate-300">
                Plain Text: <span className="font-semibold text-cyan-400 text-lg">{textTokens}</span> tokens
                {isTextFromChat && <span className="text-xs text-slate-500 ml-1">(from chat)</span>}
            </p>
            <p className="text-slate-300">
                PDF: <span className="font-semibold text-indigo-400 text-lg">{pdfTokens}</span> tokens
                {isPdfFromChat && <span className="text-xs text-slate-500 ml-1">(from chat)</span>}
            </p>
        </div>
         {Math.abs(difference) > 0 && (
             <p className="text-xs text-slate-500 mt-1">
                (Absolute difference: {Math.abs(difference)} tokens)
            </p>
         )}
      </div>
    </div>
  );
};
