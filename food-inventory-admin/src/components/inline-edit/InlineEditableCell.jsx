
import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * InlineEditableCell
 * 
 * A table cell that switches between text display and input field.
 * Supports Optimistic UI updates.
 * 
 * @param {any} value - Current value to display
 * @param {function} onSave - Async function called on save (value) => Promise<void>
 * @param {string} type - 'text', 'number', 'currency'
 * @param {boolean} disabled - If true, editing is disabled
 * @param {string} className - Additional classes
 */
const InlineEditableCell = ({
    value,
    onSave,
    type = 'text',
    disabled = false,
    className
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const inputRef = useRef(null);

    // Sync state with prop if value changes externally (and we are not editing)
    useEffect(() => {
        if (!isEditing) {
            setTempValue(value);
        }
    }, [value, isEditing]);

    // Focus input when entering edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            if (type !== 'number') {
                inputRef.current.select();
            }
        }
    }, [isEditing, type]);

    const handleStartEdit = () => {
        if (disabled) return;
        setTempValue(value);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setTempValue(value);
    };

    const handleSave = async () => {
        if (tempValue === value) {
            setIsEditing(false);
            return;
        }

        // Optimistic close
        setIsEditing(false);

        try {
            await onSave(tempValue);
        } catch (error) {
            // Revert on error (managed by parent mostly, but we reset local)
            setTempValue(value);
            console.error("Failed to save inline edit", error);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    const displayValue = () => {
        if (type === 'currency') {
            return `$ ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        }
        return value;
    };

    if (isEditing) {
        return (
            <div className={cn("relative flex items-center min-w-[100px]", className)}>
                <Input
                    ref={inputRef}
                    type={type === 'currency' ? 'number' : type}
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="h-8 text-sm pr-8"
                    autoFocus
                />
                {/* Visual indicator for Enter/Esc - purely visual as Blur handles save */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none opacity-50">
                    ⏎
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={handleStartEdit}
            className={cn(
                "group relative cursor-pointer hover:bg-muted/50 p-1 rounded-md transition-colors min-h-[28px] flex items-center",
                disabled && "cursor-default hover:bg-transparent",
                className
            )}
        >
            <span className={cn("truncate w-full", type === 'currency' ? 'text-right font-medium' : '')}>
                {displayValue()}
            </span>

            {/* Edit Indicator on Hover */}
            {!disabled && (
                <Pencil className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity absolute right-1" />
            )}
        </div>
    );
};

export default InlineEditableCell;
