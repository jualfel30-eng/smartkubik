import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import FilterPill from './FilterPill';

describe('FilterPill', () => {
  it('renderiza el label', () => {
    render(<FilterPill label="Urgente" />);
    expect(screen.getByText('Urgente')).toBeInTheDocument();
  });

  it('muestra el contador cuando se pasa count', () => {
    render(<FilterPill label="Urgente" count={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('no muestra badge cuando count es undefined', () => {
    render(<FilterPill label="Todas" />);
    // Solo el label, sin número
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('muestra count=0 como badge', () => {
    render(<FilterPill label="Pagadas" count={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('llama onClick al hacer clic', async () => {
    const onClick = vi.fn();
    render(<FilterPill label="Al día" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('aplica clases active cuando active=true', () => {
    const { rerender } = render(<FilterPill label="Urgente" color="red" active={false} />);
    const btn = screen.getByRole('button');
    const inactiveClass = btn.className;

    rerender(<FilterPill label="Urgente" color="red" active={true} />);
    expect(btn.className).not.toBe(inactiveClass);
  });
});
