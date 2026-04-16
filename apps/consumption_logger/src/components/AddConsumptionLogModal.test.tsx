import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddConsumptionLogModal } from './AddConsumptionLogModal';
import type { ProductWithRelations } from '@product-repos/contracts';

vi.mock('../api/client', () => ({
  api: {
    consumptionLogs: {
      create: vi.fn(),
    },
    units: {
      getAll: vi.fn().mockResolvedValue([
        { id: 1, type: 'ml' },
        { id: 2, type: 'gram' },
      ]),
    },
  },
}));

const mockProducts: ProductWithRelations[] = [
  {
    id: 1,
    consumptionsId: 1,
    brandId: 1,
    servingContent: 250,
    servingUnitId: 1,
    content: 330,
    contentunitId: 1,
    brand: { id: 1, name: 'TestMerk' },
    consumption: { id: 1, name: 'Koffie' },
    servingUnit: { id: 1, type: 'ml' },
    contentUnit: { id: 1, type: 'ml' },
  },
];

function renderModal(props: Partial<React.ComponentProps<typeof AddConsumptionLogModal>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  render(
    <QueryClientProvider client={queryClient}>
      <AddConsumptionLogModal
        onClose={onClose}
        products={mockProducts}
        onSuccess={onSuccess}
        {...props}
      />
    </QueryClientProvider>,
  );

  return { onClose, onSuccess, queryClient };
}

describe('AddConsumptionLogModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rendert de vereiste velden', () => {
    renderModal();
    expect(screen.getByPlaceholderText('Zoek op productnaam...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('bijv. 250')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/T\d{2}:\d{2}/)).toBeInTheDocument(); // datetime-local
    expect(screen.getByRole('button', { name: 'Voeg toe' })).toBeInTheDocument();
  });

  it('toont per-veld validatiefouten bij lege submit', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Voeg toe' }));
    expect(await screen.findByText('Kies een product')).toBeInTheDocument();
    expect(screen.getByText('Voer een geldige hoeveelheid in')).toBeInTheDocument();
    expect(screen.getByText('Kies een eenheid')).toBeInTheDocument();
  });

  it('filtert producten bij typen en selecteert suggestie', async () => {
    const user = userEvent.setup();
    renderModal();
    const input = screen.getByPlaceholderText('Zoek op productnaam...');
    await user.type(input, 'Kof');
    const suggestion = await screen.findByText(/Koffie/);
    await user.click(suggestion);
    expect((input as HTMLInputElement).value).toContain('Koffie');
  });

  it('roept onSuccess aan na succesvolle submit', async () => {
    const { api } = await import('../api/client');
    vi.mocked(api.consumptionLogs.create).mockResolvedValue({
      id: 99,
      productId: 1,
      amount: 250,
      unitsId: 1,
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    const user = userEvent.setup();
    const { onSuccess } = renderModal();

    // Selecteer product
    await user.type(screen.getByPlaceholderText('Zoek op productnaam...'), 'Kof');
    await user.click(await screen.findByText(/Koffie/));

    // Vul hoeveelheid in
    await user.type(screen.getByPlaceholderText('bijv. 250'), '250');

    // Wacht op units dropdown en selecteer
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByRole('combobox'), '1');

    // Submit
    await user.click(screen.getByRole('button', { name: 'Voeg toe' }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('rendert de modal overlay', () => {
    renderModal();
    expect(screen.getByText('Consumptie toevoegen')).toBeInTheDocument();
  });
});
