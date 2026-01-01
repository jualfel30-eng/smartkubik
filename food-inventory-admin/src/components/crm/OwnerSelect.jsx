import React from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';

export const OwnerSelect = ({
    value,
    onChange,
    disabled,
    searchTerm,
    onSearchChange,
    onSearch,
    loading,
    owners
}) => {
    return (
        <div className="space-y-1">
            <Label>Owner (usuario)</Label>
            <div className="flex gap-2">
                <Input
                    placeholder="Buscar por email"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    disabled={disabled}
                />
                <Button type="button" variant="outline" onClick={() => onSearch(searchTerm)} disabled={loading || disabled}>
                    {loading ? '...' : 'Buscar'}
                </Button>
            </div>
            {owners.length > 0 ? (
                <Select value={value || '_unassigned'} onValueChange={(val) => onChange(val === '_unassigned' ? '' : val)} disabled={disabled}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona owner" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_unassigned">Sin owner</SelectItem>
                        {owners.map((o) => (
                            <SelectItem key={o._id} value={o._id}>
                                {o.firstName ? `${o.firstName} ${o.lastName || ''}`.trim() : o.email}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <Input
                    placeholder="OwnerId (opcional)"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                />
            )}
        </div>
    );
};
