// src/components/FeaturedRewards.jsx
import React from 'react';

const FeaturedRewards = () => {
  const rewards = [
    { icon: '🎮', title: 'PlayStation®Store (UAE)', price: '$10 USD', badge: 'NEW' },
    { icon: '🎮', title: 'Nintendo eShop Voucher', price: '50,000 Silver', badge: 'NEW' },
    { icon: '🎮', title: 'Epic Games Voucher', price: '$20 USD' },
    { icon: '🎮', title: 'Xbox Gift Card', price: '$15 USD' }
  ];

  return (
    <div className="mb-6">
      <div className="flex justify-between items-baseline mb-3">
        <h2 className="text-[#00ff41] text-base font-semibold">🔥 FEATURED REWARDS</h2>
        <a href="#" className="text-[#888] text-[0.7rem] hover:text-[#00ff41]">VIEW ALL →</a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rewards.map((reward, idx) => (
          <div key={idx} className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-4 relative hover:border-[#00ff41] transition">
            {reward.badge && (
              <span className="absolute top-2 right-2 bg-[#00ff41] text-[#0a0a0a] text-[0.6rem] font-bold px-2 py-0.5 rounded">
                {reward.badge}
              </span>
            )}
            <div className="text-3xl mb-2">{reward.icon}</div>
            <div className="text-sm font-medium mb-1">{reward.title}</div>
            <div className="text-[#00ff41] font-bold text-base">{reward.price}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeaturedRewards;