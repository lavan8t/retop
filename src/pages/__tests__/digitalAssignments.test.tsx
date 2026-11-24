import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import DigitalAssignments from '../digital-assignments';
import { useDataStore } from '../../store/dataStore';
import type { VTOPNetwork } from '../../utils/network';
import type { DACourse, DAAssignment } from '../../parsers/digital-assignments';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const courses: DACourse[] = [
  {
    classId: 'c1',
    code: 'BCSE302L',
    title: 'Database Systems',
    type: 'TH',
    faculty: 'Dr A',
  },
  {
    classId: 'c2',
    code: 'BCSE204E',
    title: 'Data Structures',
    type: 'LAB',
    faculty: 'Dr B',
  },
];

const assignments: Record<string, DAAssignment[]> = {
  c1: [
    {
      slNo: '1',
      title: 'Design a schema',
      maxMark: '10',
      weightage: '5',
      dueDate: '24-11-2026',
      lastUpdated: '',
      code: 'AST01',
      hasQP: true,
    },
    {
      slNo: '2',
      title: 'Normalization',
      maxMark: '20',
      weightage: '10',
      dueDate: '25-11-2026',
      lastUpdated: '23-11-2026',
      code: 'AST02',
      hasQP: true,
    },
  ],
  c2: [],
};

let originalData: ReturnType<typeof useDataStore.getState>;
let downloadQP: ReturnType<typeof mock>;
let downloadStudentDA: ReturnType<typeof mock>;
let network: VTOPNetwork;
let host: HTMLDivElement;
let root: Root | undefined;

const mount = async () => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<DigitalAssignments network={network} />);
  });
  return host;
};

const click = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    );
  });
};

const buttonByText = (text: string) =>
  Array.from(host.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === text,
  );

beforeEach(() => {
  originalData = useDataStore.getState();
  useDataStore.setState({
    status: 'Online',
    daSemesters: [{ id: 'FALL26', label: 'Fall 2026' }],
    daCourses: courses,
    daAssignments: assignments,
    daLoading: true,
    fetchDASemesters: async () => {},
    fetchDACourses: async () => {},
    fetchDAAssignments: async () => {},
  });
  downloadQP = mock(async (..._args: unknown[]) => {});
  downloadStudentDA = mock(async (..._args: unknown[]) => {});
  network = {
    downloadQP,
    downloadStudentDA,
  } as unknown as VTOPNetwork;
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  root = undefined;
  useDataStore.setState(originalData);
});

describe('digital assignments page presentation', () => {
  it('drops the 80-96px spacer and all uppercase styling', async () => {
    await mount();
    const page = host.querySelector('#retop-da-page')!;
    expect(page.querySelector('.h-20, .h-24')).toBeNull();
    expect(page.querySelector('div.pt-4')).not.toBeNull();
    expect(host.innerHTML).not.toContain('uppercase');
  });

  it('renders the course list as a card grid with data intact', async () => {
    await mount();
    expect(host.querySelector('#retop-da-page div.pt-4')).not.toBeNull();
    expect(host.querySelectorAll('button')).toHaveLength(5);
    expect(host.textContent).toContain('BCSE302L');
    expect(host.textContent).toContain('Database Systems');
  });

  it('uses sentence case for headings, statuses and actions', async () => {
    await mount();
    const text = host.textContent || '';
    for (const label of [
      'Courses (2)',
      'Assignments (2)',
      'Syncing',
      'Submitted',
      'Pending',
      'QP',
      'Download',
    ]) {
      expect(text).toContain(label);
    }
    expect(text).not.toContain('SYNCING...');
    expect(text).not.toMatch(/uppercase/);
  });

  it('uses semantic tokens on the page and keeps the shell loaded with valid styles', async () => {
    await mount();
    const html = host.innerHTML;
    expect(html).toContain('--md-sys-color-on-surface-variant');
    expect(html).not.toMatch(/uppercase|\.h-20|\.h-24/);
  });
});

describe('digital assignments page interactions are preserved', () => {
  it('selects a course by click and by keyboard', async () => {
    await mount();
    const courseButtons = () =>
      Array.from(host.querySelectorAll('button')).filter((b) =>
        ['BCSE302L', 'BCSE204E'].some((code) => b.textContent?.includes(code)),
      );
    expect(courseButtons()[0]).toBeDefined();

    await click(courseButtons()[1]);
    expect(host.textContent).toContain('Data Structures');

    await act(async () => {
      courseButtons()[0].dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          composed: true,
        }),
      );
    });
    expect(host.textContent).toContain('Database Systems');
  });

  it('routes question paper and submission downloads through the network', async () => {
    await mount();
    const buttons = Array.from(host.querySelectorAll('button'));
    const qpButton = buttons.find((b) => b.title === 'Download Question paper');
    const downloadButton = buttons.find(
      (b) => b.title === 'Download Your Submitted File',
    );
    expect(qpButton).toBeDefined();
    expect(downloadButton).toBeDefined();
    await click(qpButton!);
    await click(downloadButton!);
    expect(downloadQP).toHaveBeenCalled();
    expect(downloadStudentDA).toHaveBeenCalled();
  });
});
