import React from 'react';
import { Bell, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDistanceToNow } from 'date-fns';

const typeConfig = {
  danger: { icon: AlertTriangle, bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-50', text: 'text-yellow-600', dot: 'bg-yellow-500' },
  success: { icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-500' },
  info: { icon: Info, bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
};

export default function NotificationPanel({ onClose }) {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="absolute -right-[60px] sm:right-0 top-full mt-2 w-[300px] sm:w-80 bg-white rounded-xl shadow-[0_8px_24px_rgb(15,23,42,0.12)] border border-slate-200 z-50 fade-in overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-slate-600" />
          <span className="font-bold text-slate-900 text-xs">Notifications</span>
          {unreadCount > 0 && (
            <span className="ml-1 text-[10px] font-bold text-white bg-red-500 px-1.5 py-px rounded-full">{unreadCount}</span>
          )}
        </div>
        <button onClick={markAllNotificationsRead} className="text-[10px] text-blue-600 hover:text-blue-700 font-bold">
          Mark all read
        </button>
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        {notifications.map(notif => {
          const config = typeConfig[notif.type] || typeConfig.info;
          const Icon = config.icon;
          return (
            <div
              key={notif.id}
              onClick={() => markNotificationRead(notif.id)}
              className={`flex gap-2.5 px-3 py-2.5 border-b border-slate-100 cursor-pointer transition-colors ${notif.read ? 'hover:bg-slate-50' : 'bg-[#f4fafe] hover:bg-[#e4f3fd]'}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg} border ${config.bg.replace('bg-', 'border-').replace('50', '200')}`}>
                <Icon className={`w-3.5 h-3.5 ${config.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <p className={`text-[12px] leading-tight font-bold ${notif.read ? 'text-slate-700' : 'text-slate-900'}`}>
                    {notif.title}
                  </p>
                  {!notif.read && <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${config.dot}`} />}
                </div>
                <p className="text-[11px] leading-snug text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                <p className="text-[9px] text-slate-400 mt-1 font-medium">{notif.time}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-slate-200 text-center bg-slate-50">
        <button className="text-[11px] text-blue-600 hover:text-blue-700 font-bold">View all notifications</button>
      </div>
    </div>
  );
}
