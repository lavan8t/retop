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

const buttonByLabel = (label: string) =>
  Array.from(host.querySelectorAll('m3e-button')).find(
    (b) => b.textContent?.trim() === label,
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

  it('renders the course list and pills as M3E primitives with data intact', async () => {
    await mount();
    expect(host.querySelectorAll('m3e-list')).toHaveLength(1);
    expect(host.querySelector('m3e-list')!.getAttribute('aria-label')).toBe(
      'Courses',
    );
    expect(host.querySelectorAll('m3e-list-item')).toHaveLength(2);
    expect(host.querySelectorAll('m3e-chip').length).toBeGreaterThan(0);
    expect(host.querySelectorAll('m3e-button').length).toBeGreaterThan(0);
    expect(host.textContent).toContain('BCSE302L');
    expect(host.textContent).toContain('Database Systems');
  });

  it('uses sentence case for headings, statuses and actions', async () => {
    await mount();
    const text = host.textContent || '';
    for (const label of [
      'Courses',
      'Assignments',
      'Syncing',
      'Submitted',
      'Pending',
      'Re-upload',
      'Question paper',
    ]) {
      expect(text).toContain(label);
    }
    for (const label of [
      'SYNCING...',
      'SUBMITTED',
      'PENDING',
      'RE-UPLOAD',
      'ASSIGNMENTS',
      'COURSES',
    ]) {
      expect(text).not.toContain(label);
    }
    expect(buttonByLabel('QP')).toBeUndefined();
    expect(buttonByLabel('Question paper')).toBeDefined();
  });

  it('uses M3 semantic colour tokens instead of ad-hoc app colours', async () => {
    await mount();
    const html = host.innerHTML;
    expect(html).toContain('--md-sys-color-');
    for (const token of [
      '--accent-base',
      '--text-inverse',
      '--bg-main',
      '--bg-highlight',
      '--text-main',
      '--text-muted',
      '--bg-surface',
      '--border-dim',
    ]) {
      expect(html).not.toContain(token);
    }
  });
});

describe('digital assignments page interactions are preserved', () => {
  it('selects a course by click and by keyboard', async () => {
    await mount();
    const rows = () => Array.from(host.querySelectorAll('m3e-list-item'));
    expect(rows()[0].getAttribute('aria-pressed')).toBe('true');

    await click(rows()[1]);
    expect(rows()[1].getAttribute('aria-pressed')).toBe('true');
    expect(host.textContent).toContain('Data Structures');

    await act(async () => {
      rows()[0].dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          composed: true,
        }),
      );
    });
    expect(rows()[0].getAttribute('aria-pressed')).toBe('true');
    expect(host.textContent).toContain('Database Systems');
  });

  it('routes question paper and submission downloads through the network', async () => {
    await mount();
    await click(buttonByLabel('Question paper')!);
    expect(downloadQP).toHaveBeenCalledWith(
      'c1',
      'AST01',
      'BCSE302L_AST01_QP.pdf',
    );

    await click(buttonByLabel('Download')!);
    expect(downloadStudentDA).toHaveBeenCalledWith(
      'c1',
      'AST02',
      'BCSE302L_AST02_Submission.pdf',
    );
  });
});
