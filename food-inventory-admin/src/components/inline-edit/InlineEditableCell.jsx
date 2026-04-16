
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
            <div className={cn("relative flex items-center min-w-[100px] animate-in fade-in-0 zoom-in-95 duration-150", className)}>
                <Input
                    ref={inputRef}
                    type={type === 'currency' ? 'number' : type}
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="h-8 text-sm pr-16 ring-2 ring-primary/30 border-primary/50"
                    autoFocus
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleSave(); }}
                        className="p-0.5 rounded hover:bg-primary/10 text-primary transition-colors"
                        tabIndex={-1}
                    >
                        <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleCancel(); }}
                        className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        tabIndex={-1}
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={handleStartEdit}
            className={cn(
                "group relative cursor-pointer hover:bg-muted/50 p-1 rounded-md transition-all duration-150 min-h-[28px] flex items-center",
                "hover:ring-1 hover:ring-border",
                disabled && "cursor-default hover:bg-transparent hover:ring-0",
                className
            )}
        >
            <span className={cn("truncate w-full", type === 'currency' ? 'text-right font-medium' : '')}>
                {displayValue()}
            </span>

            {!disabled && (
                <Pencil className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity duration-150 absolute right-1" />
            )}
        </div>
    );
};

export default InlineEditableCell;
