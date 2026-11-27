import React from 'react';

const statusConfig = {
  // Query statuses
  'New': { class: 'badge-blue' },
  'Working': { class: 'badge-yellow' },
  'Quoted': { class: 'badge-purple' },
  'Confirmed': { class: 'badge-green' },
  'Lost': { class: 'badge-gray' },
  // Quotation statuses
  'Draft': { class: 'badge-gray' },
  'Sent': { class: 'badge-blue' },
  'Follow-up': { class: 'badge-yellow' },
  'Revised': { class: 'badge-purple' },
  'Accepted': { class: 'badge-green' },
  'Cancelled': { class: 'badge-red' },
  // Booking statuses
  'Upcoming': { class: 'badge-blue' },
  'Traveling': { class: 'badge-green' },
  'Completed': { class: 'badge-gray' },
  'Today': { class: 'badge-orange' },
  // Operation statuses
  'Pending': { class: 'badge-yellow' },
  'Assigned': { class: 'badge-blue' },
  'On the Way': { class: 'badge-purple' },
  'Picked Up': { class: 'badge-orange' },
  // Payment statuses
  'Paid': { class: 'badge-green' },
  'Partial': { class: 'badge-yellow' },
  'Advance Paid': { class: 'badge-yellow' },
  'Overdue': { class: 'badge-red' },
  // Priority
  'Urgent': { class: 'badge-red' },
  'High': { class: 'badge-orange' },
  'Medium': { class: 'badge-yellow' },
  'Normal': { class: 'badge-gray' },
  // General
  'Active': { class: 'badge-green' },
  'Inactive': { class: 'badge-red' },
  'active': { class: 'badge-green' },
  'inactive': { class: 'badge-red' },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const config = statusConfig[status] || { class: 'badge-gray' };
  const sizeClass = size === 'xs' ? 'text-xs px-2 py-0.5' : '';

  return (
    <span className={`badge ${config.class} ${sizeClass}`}>
      {status}
    </span>
  );
}
