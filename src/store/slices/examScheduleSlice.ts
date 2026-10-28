import { StateCreator } from 'zustand';
import { DataState } from '../dataStore';
import { VTOPNetwork } from '../../utils/network';
import {
  ExamGroup,
  parseExamSemesters,
  parseExamScheduleData,
} from '../../parsers/exam-schedule';

export interface ExamScheduleSlice {
  examSemesters: { id: string; label: string }[];
  examSelectedSem: string;
  examGroups: ExamGroup[];
  examReportingNote: string;
  examLoading: boolean;
  examError: string | null;
  setExamSelectedSem: (semId: string) => void;
  fetchExamSemesters: (network: VTOPNetwork) => Promise<void>;
  fetchExamSchedule: (network: VTOPNetwork, semId: string) => Promise<void>;
}

export const createExamScheduleSlice: StateCreator<
  DataState,
  [],
  [],
  ExamScheduleSlice
> = (set, get) => ({
  examSemesters: [],
  examSelectedSem: '',
  examGroups: [],
  examReportingNote: '',
  examLoading: false,
  examError: null,

  setExamSelectedSem: (semId: string) => set({ examSelectedSem: semId }),

  fetchExamSemesters: async (network: VTOPNetwork) => {
    set({ examLoading: true, examError: null });
    try {
      const html = await network.getExamScheduleView();
      const sems = typeof html === 'string' ? parseExamSemesters(html) : html;
      set({ examSemesters: sems });
      if (sems.length > 0 && !get().examSelectedSem) {
        set({ examSelectedSem: sems[0].id });
        get().fetchExamSchedule(network, sems[0].id);
      }
    } catch (e: any) {
      if (e.message !== 'OFFLINE_CACHE_MISS') {
        set({ examError: e.message || 'Failed to fetch exam semesters' });
      } else {
        set({ status: 'Offline - Not Synced' });
      }
    } finally {
      set({ examLoading: false });
    }
  },

  fetchExamSchedule: async (network: VTOPNetwork, semId: string) => {
    set({ examLoading: true, examError: null, examGroups: [] });
    try {
      const html = await network.getExamScheduleData(semId);
      const { groups, reportingNote } =
        typeof html === 'string'
          ? parseExamScheduleData(html)
          : (html as any)?.groups
            ? (html as any)
            : { groups: (html as any) || [], reportingNote: '' };
      set({ examGroups: groups, examReportingNote: reportingNote });
    } catch (e: any) {
      if (e.message !== 'OFFLINE_CACHE_MISS') {
        set({ examError: e.message || 'Failed to fetch exam schedule' });
      } else {
        set({ status: 'Offline - Not Synced' });
      }
    } finally {
      set({ examLoading: false });
    }
  },
});
