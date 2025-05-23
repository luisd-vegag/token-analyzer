import React from 'react';

export const BuyMeACoffee: React.FC = () => {
  return (
    <div className="flex justify-center">
      Fuel my creativity!
      <a 
        href="https://www.buymeacoffee.com/LuisVega" 
        target="_blank" 
        rel="noopener noreferrer" 
        aria-label="Buy Me A Coffee button"
      >
        <img 
          src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" 
          alt="Buy Me A Coffee" 
          style={{height: '45px', width: '162px'}} 
        />
      </a>
      Your coffee helps a lot!
    </div>
  );
};
