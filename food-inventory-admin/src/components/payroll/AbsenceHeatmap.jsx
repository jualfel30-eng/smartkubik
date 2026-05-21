import React, { useState, useEffect } from 'react';
import { format, addDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchApi } from '@/lib/api';

function shortName(name = '') {
  const parts = name.split(' ');
  return parts.length >= 2 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
}

export default function AbsenceHeatmap({ employees = [] }) {
  const [absences, setAbsences] = useState([]);
  const [expanded, setExpanded] = useState(false);

  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i));

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchApi('/payroll/absences/requests?status=approved&dateRange=7d');
        if (res.success) setAbsences(res.data || []);
      } catch {
        // non-critical widget
      }
    };
    load();
  }, []);

  const isAbsent = (employeeId, day) => {
    return absences.some(a => {
      const emp = a.employeeId || a.employee?._id;
      if (String(emp) !== String(employeeId)) return false;
      const start = new Date(a.startDate);
      const end = new Date(a.endDate || a.startDate);
      return day >= startOfDay(start) && day <= startOfDay(end);
    });
  };

  if (!employees.length) return null;

  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <button
        className="flex items-center gap-2 text-sm font-medium w-full text-left"
        onClick={() => setExpanded(v => !v)}
      >
        Disponibilidad — próximos 7 días
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="mt-3 overflow-x-auto hidden md:block">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left font-medium text-muted-foreground py-1 pr-3 w-28">
                  Empleado
                </th>
                {days.map(d => (
                  <th key={d.toISOString()} className="text-center font-medium text-muted-foreground py-1 px-1 min-w-[36px]">
                    <div>{format(d, 'EEE', { locale: es })}</div>
                    <div className="font-bold text-foreground">{format(d, 'd')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.slice(0, 8).map(emp => (
                <tr key={emp._id} className="border-t border-muted">
                  <td className="py-1.5 pr-3 font-medium truncate max-w-[112px]">
                    {shortName(emp.name)}
                  </td>
                  {days.map(d => {
                    const absent = isAbsent(emp._id, d);
                    return (
                      <td key={d.toISOString()} className="text-center py-1.5 px-1">
                        <div
                          className="mx-auto h-5 w-5 rounded-sm"
                          title={absent ? `${emp.name} — ausente` : `${emp.name} — disponible`}
                          style={{
                            background: absent
                              ? 'var(--destructive, #ef4444)'
                              : 'var(--success, #22c55e)',
                            opacity: absent ? 0.75 : 0.35,
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-green-500 opacity-35" /> disponible
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-red-500 opacity-75" /> ausente
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
