import React from 'react';
import { cn } from '../../lib/utils';

export const Table = ({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
    <div className="relative w-full overflow-auto rounded-lg border border-slate-100 shadow-soft">
        <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
);

export const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className={cn('bg-slate-50 border-b border-slate-200', className)} {...props} />
);

export const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
);

export const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr
        className={cn(
            'border-b border-slate-100 transition-colors hover:bg-slate-50/50 data-[state=selected]:bg-slate-100',
            className
        )}
        {...props}
    />
);

export const TableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th
        className={cn(
            'h-12 px-4 text-left align-middle font-semibold text-hive-text-secondary [&:has([role=checkbox])]:pr-0',
            className
        )}
        {...props}
    />
);

export const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className={cn('p-4 align-middle text-hive-text-primary [&:has([role=checkbox])]:pr-0', className)} {...props} />
);
