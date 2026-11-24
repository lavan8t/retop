import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SpotlightSection } from '../SpotlightSection';
import { AssignmentRow, AttendanceRow } from '../HomeRows';
import { HomeWidgets } from '../HomeWidgets';
import { LazyCalendarDay } from '../LazyCalendarDay';
import { DAY_LIST_STYLE, HOME_LIST_STYLE } from '../m3eListStyles';
import { DEFAULT_SETTINGS } from '../../../utils/settings-store';
import { useDataStore } from '../../../store/dataStore';
import type { Assignment, CourseSummary } from '../../../types/vtop';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root | undefined;

const mount = async (element: React.ReactElement) => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(element);
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

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  mock.restore();
});

const course: CourseSummary = {
  code: 'BCSE203E',
  name: 'Web Programming',
  type: 'ETH',
  attendance: '82',
  slot: 'A1',
  faculty: 'Dr X',
};

const assignment: Assignment = {
  title: 'Assignment 1',
  course: 'Web Programming',
  dueDate: '24-11-2026',
  dueDateMs: Date.now() + 86_400_000,
  status: 'pending',
};

describe('Home lists use M3E primitives', () => {
  it('does not collapse M3E list rows to zero height', () => {
    for (const style of [HOME_LIST_STYLE, DAY_LIST_STYLE]) {
      expect(style).not.toHaveProperty('--m3e-list-item-one-line-height');
      expect(style).not.toHaveProperty('--m3e-list-item-two-line-height');
    }
  });

  it('renders spotlight links as m3e-list-action with trailing icons and live click handling', async () => {
    const open = spyOn(window, 'open').mockImplementation(() => null);
    await mount(
      <SpotlightSection
        spotlightCategories={[
          {
            category: 'Updates',
            items: [
              { title: 'Notice', url: 'notice' },
              { title: 'Form', downloadId: 'form', isDownload: true },
            ],
          },
        ]}
      />,
    );

    const list = host.querySelector('m3e-list')!;
    expect(list.getAttribute('variant')).toBe('segmented');
    const rows = host.querySelectorAll('m3e-list-action');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Notice');
    expect(rows[0].querySelector('[slot="trailing"]')).not.toBeNull();
    expect(rows[1].querySelector('[slot="trailing"]')).not.toBeNull();

    await click(rows[0]);
    expect(open).toHaveBeenCalledWith(
      'https://vtop.vit.ac.in/vtop/notice',
      '_blank',
    );
  });

  it('renders the mobile spotlight widget with the same list rows', async () => {
    await mount(
      <SpotlightSection
        isMobileWidget
        spotlightCategories={[
          {
            category: 'Updates',
            items: [{ title: 'Notice', url: 'notice' }],
          },
        ]}
      />,
    );
    expect(host.querySelectorAll('m3e-list')).toHaveLength(1);
    expect(host.querySelectorAll('m3e-list-action')).toHaveLength(1);
  });

  it('keeps attendance content and trailing value in a static m3e-list-item', async () => {
    await mount(<AttendanceRow course={course} />);
    const row = host.querySelector('m3e-list-item')!;
    expect(row.textContent).toContain('Web Programming');
    expect(row.querySelector('[slot="trailing"]')!.textContent).toContain(
      '82%',
    );
    expect(row.querySelector('[slot="trailing"]')!.textContent).toContain(
      'ETH',
    );
  });

  it('keeps assignment due text in supporting text and forwards clicks', async () => {
    const onClick = mock((_a: Assignment) => {});
    await mount(<AssignmentRow assignment={assignment} onClick={onClick} />);
    const row = host.querySelector('m3e-list-action')!;
    expect(row.getAttribute('aria-label')).toContain('Assignment 1');
    expect(
      row.querySelector('[slot="supporting-text"]')!.textContent,
    ).toContain('DUE TOMORROW');
    expect(row.querySelector('[slot="trailing"]')!.textContent).toContain(
      'Web Programming',
    );

    await click(row);
    expect(onClick).toHaveBeenCalledWith(assignment);
  });

  it('lists only pending assignments in the desktop widget', async () => {
    await mount(
      <HomeWidgets
        settings={DEFAULT_SETTINGS}
        stats={{ cgpa: '9.0', credits: '120' }}
        assignments={[
          assignment,
          { ...assignment, title: 'Done', status: 'submitted' },
        ]}
        onNavigate={() => {}}
      />,
    );
    const list = host.querySelector('m3e-list')!;
    expect(list).not.toBeNull();
    expect(list.querySelectorAll('m3e-list-action')).toHaveLength(1);
    expect(list.textContent).toContain('Assignment 1');
    expect(list.textContent).not.toContain('Done');
  });

  it('groups day-calendar classes and assignments into separate m3e lists', async () => {
    const onNavigate = mock((_link: any) => {});
    const now = new Date();
    await mount(
      <LazyCalendarDay
        d={now}
        dIdx={0}
        calGridData={[]}
        eventFilter="all"
        assignments={[assignment]}
        events={[]}
        examGroups={[]}
        getClassesForDate={() => [
          {
            course: {
              title: 'Web Programming',
              code: 'BCSE203E',
              venue: 'VL201',
            },
            time: '00:00-23:59',
            status: 'Now',
          } as any,
        ]}
        use24HourTime="12h"
        nowRef={{ current: null } as any}
        onNavigate={onNavigate}
      />,
    );

    const lists = host.querySelectorAll('m3e-list');
    expect(lists).toHaveLength(2);
    const classRow = lists[0].querySelector('m3e-list-action')!;
    const assignmentRow = lists[1].querySelector('m3e-list-action')!;
    expect(classRow.getAttribute('aria-label')).toContain('Web Programming');
    expect(classRow.querySelector('[slot="supporting-text"]')).not.toBeNull();
    expect(classRow.querySelector('[slot="trailing"]')!.textContent).toContain(
      'VL201',
    );
    expect(assignmentRow.getAttribute('aria-label')).toContain('Assignment 1');

    await click(classRow);
    expect(useDataStore.getState().highlightedCourseCode).toBe('BCSE203E');
    expect(onNavigate).toHaveBeenCalledWith({
      title: 'Timetable',
      url: 'academics/common/StudentTimeTable',
      category: 'Academics',
    });

    await click(assignmentRow);
    expect(onNavigate).toHaveBeenCalledWith({
      title: 'Assignments',
      url: 'examinations/StudentDA',
      category: 'Examinations',
    });
  });
});
