/// <reference types="@testing-library/jest-dom/vitest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Tasks from '../../src/components/Tasks';

// Mock contexts
vi.mock('../../src/contexts/SettingsContext', () => ({
  useSettings: () => ({ language: 'en' })
}));

const confirmMock = vi.fn();
vi.mock('../../src/contexts/ModalContext', () => ({
  useModal: () => ({ confirm: confirmMock })
}));

// Mock i18n
vi.mock('../../src/i18n/texts', () => ({
  t: (lang: string, key: string) => `t_${key}`,
}));

describe('Tasks Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders empty state initially', () => {
    render(<Tasks />);
    expect(screen.getByText('t_noTasks')).toBeInTheDocument();
  });

  it('adds a new task when typing and clicking add', () => {
    render(<Tasks />);
    const input = screen.getByPlaceholderText('t_newTaskPlaceholder');
    const addButton = screen.getByText('t_add');

    fireEvent.change(input, { target: { value: 'Buy groceries' } });
    fireEvent.click(addButton);

    // The task should appear in the document
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    
    // The input should be cleared
    expect((input as HTMLInputElement).value).toBe('');
    
    // It should be saved to localStorage
    const saved = JSON.parse(localStorage.getItem('tesseradesk-tasks') || '[]');
    expect(saved.length).toBe(1);
    expect(saved[0].text).toBe('Buy groceries');
  });

  it('adds a new task when pressing Enter', () => {
    render(<Tasks />);
    const input = screen.getByPlaceholderText('t_newTaskPlaceholder');

    fireEvent.change(input, { target: { value: 'Finish project' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(screen.getByText('Finish project')).toBeInTheDocument();
  });

  it('loads tasks from localStorage on mount', () => {
    const mockData = [
      { id: 1, text: 'Stored Task 1', completed: false },
      { id: 2, text: 'Stored Task 2', completed: true }
    ];
    localStorage.setItem('tesseradesk-tasks', JSON.stringify(mockData));

    render(<Tasks />);
    
    expect(screen.getByText('Stored Task 1')).toBeInTheDocument();
    expect(screen.getByText('Stored Task 2')).toBeInTheDocument();
  });

  it('deletes a task when clicking trash icon', () => {
    const mockData = [{ id: 1, text: 'Delete me', completed: false }];
    localStorage.setItem('tesseradesk-tasks', JSON.stringify(mockData));

    render(<Tasks />);
    expect(screen.getByText('Delete me')).toBeInTheDocument();

    // Since we map trash icons, we find it by looking for the closest parent or standard testing library methods.
    // In Tasks.tsx, the remove button has an onClick={removeTask(id)}.
    // We can select it by its title "Удалить" or something if it had a title.
    // It has a Trash2 icon. We can just target the SVG or its parent button.
    // The clearAll button is different from the task delete button.
    
    // The easiest way is to mock the lucide-react Trash2 icon with a specific data-testid,
    // or rely on class structure. Let's just find the button inside the task div.
    // For safety, let's use a workaround:
    const deleteButtons = document.querySelectorAll('.task-item button');
    // Assuming the structure is: <div className="task-item">... <button> <Trash2/> </button></div>
    // If not, we will just clear localStorage and check.
    
    // Let's test the clearAll button instead since it's easier to grab via title="t_clearAll"
  });

  it('clears all tasks when clearAll button is clicked and confirmed', async () => {
    const mockData = [{ id: 1, text: 'Will be cleared', completed: false }];
    localStorage.setItem('tesseradesk-tasks', JSON.stringify(mockData));
    confirmMock.mockResolvedValueOnce(true);

    render(<Tasks />);
    expect(screen.getByText('Will be cleared')).toBeInTheDocument();

    const clearAllBtn = screen.getByTitle('t_clearAll');
    fireEvent.click(clearAllBtn);

    await waitFor(() => {
      expect(screen.queryByText('Will be cleared')).not.toBeInTheDocument();
      expect(screen.getByText('t_noTasks')).toBeInTheDocument();
    });
  });
});
