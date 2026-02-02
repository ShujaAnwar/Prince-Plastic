
import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  icon: string;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, trend, icon, color }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-2">{title}</p>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h3>
        {(subtitle || trend) && (
          <p className="text-[10px] mt-2 font-bold flex items-center">
            <span className={trend?.includes('+') ? 'text-green-500' : trend?.includes('-') ? 'text-red-500' : 'text-slate-400'}>{trend}</span>
            <span className="text-slate-400 ml-1 uppercase">{subtitle}</span>
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${colorMap[color]} text-2xl shadow-inner`}>
        {icon}
      </div>
    </div>
  );
};

export default StatsCard;
