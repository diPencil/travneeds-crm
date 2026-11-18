import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Activity } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { formatDate } from '../../utils/format';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const mockActivities: {
  id: number;
  type: string;
  description: string;
  timestamp: string;
  details: string;
  icon: React.ElementType;
  color: string;
}[] = [];

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Time');

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'login': return 'Login';
      case 'lead_created': return 'Lead Created';
      case 'lead_updated': return 'Lead Updated';
      case 'customer_created': return 'Customer Created';
      case 'customer_updated': return 'Customer Updated';
      case 'case_viewed': return 'Case Viewed';
      case 'report_generated': return 'Report Generated';
      default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const filteredActivities = mockActivities.filter(activity => {
    const matchesSearch = activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'All' || activity.type === typeFilter;

    // Simple date filtering for demo
    let matchesDate = true;
    if (dateFilter === 'Today') {
      const today = new Date().toISOString().split('T')[0];
      matchesDate = activity.timestamp.startsWith(today);
    } else if (dateFilter === 'This Week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = new Date(activity.timestamp) >= weekAgo;
    }

    return matchesSearch && matchesType && matchesDate;
  });

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <Activity className="h-6 w-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Activity Log
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="All">All Types</option>
                <option value="login">Login</option>
                <option value="lead_created">Lead Created</option>
                <option value="lead_updated">Lead Updated</option>
                <option value="customer_created">Customer Created</option>
                <option value="customer_updated">Customer Updated</option>
                <option value="case_viewed">Case Viewed</option>
                <option value="report_generated">Report Generated</option>
              </Select>
              <Select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="All Time">All Time</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
              </Select>
            </div>

            {/* Activity List */}
            <div className="space-y-4">
              {filteredActivities.map((activity) => {
                const IconComponent = activity.icon;
                return (
                  <div key={activity.id} className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                        <IconComponent className={`h-5 w-5 ${activity.color}`} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {activity.description}
                        </p>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                          {getActivityTypeLabel(activity.type)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {activity.details}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {formatDate(activity.timestamp)} at {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredActivities.length === 0 && (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No activities found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Try adjusting your search or filter criteria.
                </p>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
