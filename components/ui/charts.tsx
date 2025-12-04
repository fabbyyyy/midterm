"use client";

import React from 'react';

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface ChartProps {
  data: ChartData[];
  title: string;
  type: 'bar' | 'pie' | 'line';
  height?: number;
}

export function SimpleChart({ data, title, type, height = 200 }: ChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  if (type === 'bar') {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
        <div className="space-y-3" style={{ height }}>
          {data.map((item, index) => (
            <div key={index} className="flex items-center">
              <div className="w-24 text-sm text-gray-600 mr-3">{item.label}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                <div
                  className="h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium"
                  style={{
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: item.color || '#3B82F6',
                    minWidth: item.value > 0 ? '60px' : '0px'
                  }}
                >
                  ${item.value.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'pie') {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercentage = 0;
    
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
        <div className="flex items-center">
          <div className="relative" style={{ width: height, height }}>
            <svg width={height} height={height} className="transform -rotate-90">
              {data.map((item, index) => {
                const percentage = (item.value / total) * 100;
                const strokeDasharray = `${percentage} ${100 - percentage}`;
                const strokeDashoffset = -cumulativePercentage;
                cumulativePercentage += percentage;
                
                return (
                  <circle
                    key={index}
                    cx={height / 2}
                    cy={height / 2}
                    r={height / 2 - 10}
                    fill="transparent"
                    stroke={item.color || `hsl(${index * 60}, 70%, 50%)`}
                    strokeWidth="20"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    style={{
                      strokeDasharray: `${(item.value / total) * 2 * Math.PI * (height / 2 - 10)} ${2 * Math.PI * (height / 2 - 10)}`,
                      strokeDashoffset: -cumulativePercentage + (item.value / total) * 2 * Math.PI * (height / 2 - 10)
                    }}
                  />
                );
              })}
            </svg>
          </div>
          <div className="ml-6 space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center">
                <div
                  className="w-4 h-4 rounded mr-2"
                  style={{ backgroundColor: item.color || `hsl(${index * 60}, 70%, 50%)` }}
                ></div>
                <span className="text-sm text-gray-700">
                  {item.label}: ${item.value.toLocaleString()} ({((item.value / total) * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Línea simple (solo puntos conectados)
  if (type === 'line') {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
        <div className="relative" style={{ height }}>
          <svg width="100%" height={height} className="overflow-visible">
            {data.map((item, index) => {
              const x = (index / (data.length - 1)) * 100;
              const y = 100 - (item.value / maxValue) * 80;
              const nextItem = data[index + 1];
              
              return (
                <g key={index}>
                  {/* Línea al siguiente punto */}
                  {nextItem && (
                    <line
                      x1={`${x}%`}
                      y1={`${y}%`}
                      x2={`${((index + 1) / (data.length - 1)) * 100}%`}
                      y2={`${100 - (nextItem.value / maxValue) * 80}%`}
                      stroke="#3B82F6"
                      strokeWidth="2"
                    />
                  )}
                  {/* Punto */}
                  <circle
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="4"
                    fill="#3B82F6"
                  />
                  {/* Etiqueta */}
                  <text
                    x={`${x}%`}
                    y="95%"
                    textAnchor="middle"
                    className="text-xs fill-gray-600"
                  >
                    {item.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  }

  return null;
}

export function MetricCard({ title, value, subtitle, icon, color = "blue" }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  color?: string;
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    red: "bg-red-50 text-red-600 border-red-200",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold">
            {typeof value === 'number' ? `$${value.toLocaleString()}` : value}
          </p>
          {subtitle && <p className="text-xs opacity-70 mt-1">{subtitle}</p>}
        </div>
        {icon && <div className="text-2xl">{icon}</div>}
      </div>
    </div>
  );
}