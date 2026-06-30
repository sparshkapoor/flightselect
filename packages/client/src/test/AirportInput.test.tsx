import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AirportInput } from '../components/search/AirportInput';

describe('AirportInput', () => {
  it('pressing Enter selects the top match instead of submitting the form or doing nothing', () => {
    const onChange = vi.fn();
    render(<AirportInput value="" onChange={onChange} placeholder="Origin airport" />);

    const input = screen.getByPlaceholderText('Origin airport');
    fireEvent.change(input, { target: { value: 'ewr' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('EWR');
    expect(input).toHaveValue('EWR — Newark');
  });

  it('ArrowDown moves the highlight and Enter selects the highlighted item, not always the first', () => {
    const onChange = vi.fn();
    render(<AirportInput value="" onChange={onChange} placeholder="Origin airport" />);

    const input = screen.getByPlaceholderText('Origin airport');
    // "new" matches multiple cities (New York x2, Newark via city-word/contains) — a real list to navigate.
    fireEvent.change(input, { target: { value: 'new' } });

    const options = screen.getAllByRole('button');
    expect(options.length).toBeGreaterThan(1);
    const secondOptionCode = options[1].textContent;

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(secondOptionCode).toContain((onChange.mock.calls[0][0] as string));
  });

  it('Escape closes the dropdown without selecting anything', () => {
    const onChange = vi.fn();
    render(<AirportInput value="" onChange={onChange} placeholder="Origin airport" />);

    const input = screen.getByPlaceholderText('Origin airport');
    fireEvent.change(input, { target: { value: 'ewr' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
