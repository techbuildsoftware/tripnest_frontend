import { ChevronDown, ChevronUp } from 'lucide-react';

/** A table header whose sort state is owned by an API-backed paginated list. */
export default function RemoteSortHeader({ column, sortBy, sortDir, onSort, children, className = 'table-header' }) {
  const active = sortBy === column;
  return (
    <th
      className={`${className} cursor-pointer`}
      onClick={() => onSort(column)}
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      title={`Sort by ${String(children)}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active
          ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-blue-600" /> : <ChevronDown className="h-3 w-3 text-blue-600" />)
          : <ChevronDown className="h-3 w-3 opacity-35" />}
      </span>
    </th>
  );
}
