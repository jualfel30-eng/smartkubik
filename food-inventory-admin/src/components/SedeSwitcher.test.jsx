import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SedeSwitcher } from './SedeSwitcher.jsx';

// ─── Mocks ───────────────────────────────────────────────────────────────────
const { mockSelectTenant } = vi.hoisted(() => ({ mockSelectTenant: vi.fn() }));
let authValue;

vi.mock('@/hooks/use-auth.jsx', () => ({
  useAuth: () => authValue,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
// ─────────────────────────────────────────────────────────────────────────────

const membership = (id, name, { isSubsidiary = true } = {}) => ({
  id,
  tenant: { id: `t-${id}`, name, isSubsidiary },
});

const baseAuth = (overrides = {}) => ({
  memberships: [
    membership('m1', 'Sede Centro'),
    membership('m2', 'Sede Norte'),
    membership('m3', 'Broas', { isSubsidiary: false }),
  ],
  activeMembershipId: 'm1',
  tenant: { id: 't-m1', name: 'Sede Centro', isSubsidiary: true },
  isMultiTenantEnabled: true,
  isSwitchingTenant: false,
  selectTenant: mockSelectTenant,
  ...overrides,
});

beforeEach(() => {
  mockSelectTenant.mockReset();
  mockSelectTenant.mockResolvedValue({});
  authValue = baseAuth();
});

describe('SedeSwitcher', () => {
  it('no renderiza con una sola membresía', () => {
    authValue = baseAuth({ memberships: [membership('m1', 'Sede Centro')] });
    const { container } = render(<SedeSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('no renderiza si multi-tenant está deshabilitado', () => {
    authValue = baseAuth({ isMultiTenantEnabled: false });
    const { container } = render(<SedeSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el nombre de la membresía activa en el trigger', () => {
    render(<SedeSwitcher />);
    expect(screen.getByRole('button', { name: /Sede Centro/ })).toBeInTheDocument();
  });

  it('cambia de sede llamando selectTenant con el id de la membresía elegida', async () => {
    const user = userEvent.setup();
    render(<SedeSwitcher />);
    await user.click(screen.getByRole('button', { name: /Sede Centro/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Sede Norte/ }));
    expect(mockSelectTenant).toHaveBeenCalledWith('m2', { rememberAsDefault: false });
  });
});
