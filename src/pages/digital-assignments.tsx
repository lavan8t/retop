import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useDataStore } from '../store/dataStore';
import { useAppStore } from '../store/appStore';
import { useIsDark } from '../hooks/useTheme';
import { getMaterialChipStyle } from '../utils/settings-store';
import { OfflineNotSynced } from '../components/ui/OfflineNotSynced';
import { VTOPNetwork } from '../utils/network';
import { showAlertDialog } from '../components/ui/AlertDialog';
import { useNavigationGuard } from '../utils/navigationGuard';
import { EmptyState } from '../components/EmptyState';
import { DACourse, DAAssignment } from '../parsers/digital-assignments';
import {
  Person,
  Download,
  Upload,
  Description,
  CheckCircle,
  Error as ErrorIcon,
  Close,
  CloudUpload,
  Lock,
  Search,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_EXTENSIONS = ['pdf', 'xls', 'xlsx', 'doc', 'docx'];

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileExtension = (filename: string) => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

const isAllowedFile = (file: File) => {
  const ext = getFileExtension(file.name);
  return ALLOWED_EXTENSIONS.includes(ext);
};

/**
 * Checks VTOP response for success, OTP prompt, or errors.
 */
function checkDAUploadResponse(html: string): {
  success: boolean;
  requiresOtp: boolean;
  emailHint?: string;
  otpPrefix?: string;
  error?: string;
} {
  if (
    html.includes('daUploadOtpAlert') ||
    html.includes('doDAssignmentOtpUpload') ||
    html.includes('otpEmail')
  ) {
    const emailMatch = html.match(
      /sent to your email ID\s*<span[^>]*>([\s\S]*?)<\/span>/i,
    );
    const emailHint = emailMatch
      ? emailMatch[1].replace(/<[^>]+>/g, '').trim()
      : '';

    const prefixMatch = html.match(
      /id=["']otpIdCode["'][^>]*>([\s\S]*?)<\/output>/i,
    );
    const otpPrefix = prefixMatch
      ? prefixMatch[1].replace(/<[^>]+>/g, '').trim()
      : 'SDA -';

    return {
      success: false,
      requiresOtp: true,
      emailHint,
      otpPrefix,
    };
  }

  const successInputMatch = html.match(
    /id=["']success["'][^>]*value=["']([^"']*)["']/i,
  );
  const successVal = successInputMatch ? successInputMatch[1].trim() : '';

  const jsonBomMatch = html.match(
    /id=["']jsonBom["'][^>]*value=["']([^"']*)["']/i,
  );
  const jsonBomVal = jsonBomMatch ? jsonBomMatch[1].trim() : '';

  if (successVal && successVal.length > 0) {
    return { success: true, requiresOtp: false };
  }

  if (html.toLowerCase().includes('uploaded successfully')) {
    return { success: true, requiresOtp: false };
  }

  if (jsonBomVal && jsonBomVal.length > 0) {
    return { success: false, requiresOtp: false, error: jsonBomVal };
  }

  const alertMatch = html.match(
    /<span[^>]*style=["'][^"']*color:\s*red[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
  );
  if (alertMatch && alertMatch[1].trim()) {
    return {
      success: false,
      requiresOtp: false,
      error: alertMatch[1].replace(/<[^>]+>/g, '').trim(),
    };
  }

  // VTOP's own failure page - without this the default below would claim success
  if (
    html.toLowerCase().includes('unable to process your request') ||
    html.includes('HTTP Status 404') ||
    html.includes('404 - Not Found')
  ) {
    return {
      success: false,
      requiresOtp: false,
      error: 'VTOP could not process the upload. Please try again.',
    };
  }

  return { success: false, requiresOtp: false };
}

export default function DigitalAssignments({
  network,
}: {
  network: VTOPNetwork;
}) {
  const isDark = useIsDark();
  const {
    daSemesters,
    daCourses,
    daAssignments,
    daLoading,
    status,
    fetchDASemesters,
    fetchDACourses,
    fetchDAAssignments,
    daSelectedSem,
  } = useDataStore();

  const { daDropFile, setDaDropFile } = useAppStore();

  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Upload state
  const [activeUploadAssgn, setActiveUploadAssgn] = useState<{
    classId: string;
    code: string;
    title: string;
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // OTP state for re-upload verification
  const [otpState, setOtpState] = useState<{
    requiresOtp: boolean;
    emailHint: string;
    otpPrefix: string;
    otpVal: string;
  } | null>(null);

  // Arm navigation guard to protect active upload and OTP sessions from accidental exit
  useNavigationGuard(
    Boolean(otpState || isUploading || selectedFile),
    {
      title: otpState ? 'Exit OTP Verification?' : 'Discard Assignment Upload?',
      message: otpState
        ? 'You have an active OTP verification session for this assignment. If you leave, your upload will be cancelled and the verification code will expire.'
        : 'You have an assignment upload in progress. Are you sure you want to exit without submitting?',
      confirmText: 'Discard & Exit',
      cancelText: 'Stay',
    },
    'da-upload-active',
  );

  const handleDismissModal = async () => {
    if (otpState || isUploading) {
      const confirmed = await showAlertDialog({
        title: 'Cancel OTP Verification?',
        message:
          'You have an active OTP verification session in progress. Leaving will cancel the upload and invalidate this verification code. Are you sure?',
        confirmText: 'Discard & Exit',
        cancelText: 'Stay',
      });
      if (!confirmed) return;
    } else if (selectedFile) {
      const confirmed = await showAlertDialog({
        title: 'Discard Selected File?',
        message:
          'You have attached a file for upload. Are you sure you want to discard it?',
        confirmText: 'Discard',
        cancelText: 'Keep',
      });
      if (!confirmed) return;
    }
    setSelectedFile(null);
    setActiveUploadAssgn(null);
    setOtpState(null);
    setStatusMsg(null);
  };

  // Downloading indicators
  const [downloadingQP, setDownloadingQP] = useState<string | null>(null);
  const [downloadingDA, setDownloadingDA] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Initial semester & courses load
  useEffect(() => {
    if (status !== 'Demo Mode Active' && daSemesters.length === 0) {
      fetchDASemesters(network);
    }
  }, [status, daSemesters.length, fetchDASemesters, network]);

  // 2. Default to first course when courses load
  useEffect(() => {
    if (daCourses && daCourses.length > 0 && !selectedClassId) {
      setSelectedClassId(daCourses[0].classId);
    }
  }, [daCourses, selectedClassId]);

  // 3. Automatically fetch assignments for selected course
  useEffect(() => {
    if (selectedClassId && network) {
      if (!daAssignments[selectedClassId]) {
        fetchDAAssignments(network, selectedClassId);
      }
    }
  }, [selectedClassId, daAssignments, fetchDAAssignments, network]);

  // 4. Handle global drag and drop file from anywhere in retop
  useEffect(() => {
    if (daDropFile) {
      setSelectedFile(daDropFile);
      setDaDropFile(null);
    }
  }, [daDropFile, setDaDropFile]);

  // Active selected course
  const activeCourse = useMemo(() => {
    return (
      daCourses.find((c) => c.classId === selectedClassId) ||
      daCourses[0] ||
      null
    );
  }, [daCourses, selectedClassId]);

  // Assignments for current active course
  const currentAssignments = useMemo(() => {
    if (!activeCourse) return [];
    const list = daAssignments[activeCourse.classId] || [];
    return [...list].sort((a, b) => {
      const aSubmitted = Boolean(a.lastUpdated && a.lastUpdated.trim() !== '');
      const bSubmitted = Boolean(b.lastUpdated && b.lastUpdated.trim() !== '');
      if (aSubmitted !== bSubmitted) return aSubmitted ? 1 : -1;
      const msA = a.dueDateMs ?? Infinity;
      const msB = b.dueDateMs ?? Infinity;
      return msA - msB;
    });
  }, [activeCourse, daAssignments]);

  // Courses shown in the left sidebar (filter removed).
  const filteredCourses = daCourses || [];

  // Handle Question Paper Download
  const handleDownloadQP = async (e: React.MouseEvent, assgn: DAAssignment) => {
    e.stopPropagation();
    if (!activeCourse) return;
    try {
      setDownloadingQP(assgn.code);
      await network.downloadQP(
        activeCourse.classId,
        assgn.code,
        `${activeCourse.code}_${assgn.code}_QP.pdf`,
      );
    } catch {
      showAlertDialog({
        title: 'Download Failed',
        message: 'Failed to download question paper.',
      });
    } finally {
      setDownloadingQP(null);
    }
  };

  // Handle Student Submission Download
  const handleDownloadStudentDA = async (
    e: React.MouseEvent,
    assgn: DAAssignment,
  ) => {
    e.stopPropagation();
    if (!activeCourse) return;
    try {
      setDownloadingDA(assgn.code);
      await network.downloadStudentDA(
        activeCourse.classId,
        assgn.code,
        `${activeCourse.code}_${assgn.code}_Submission.pdf`,
      );
    } catch {
      showAlertDialog({
        title: 'Download Failed',
        message: 'Failed to download assignment submission.',
      });
    } finally {
      setDownloadingDA(null);
    }
  };

  // Trigger file selection for an assignment
  const handleOpenUploadForAssgn = (assgn: DAAssignment) => {
    if (!activeCourse) return;
    setActiveUploadAssgn({
      classId: activeCourse.classId,
      code: assgn.code,
      title: assgn.title,
    });
    setOtpState(null);
    setStatusMsg(null);
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAllowedFile(file)) {
      showAlertDialog({
        title: 'Unsupported File Format',
        message: 'Allowed formats: PDF, XLS, XLSX, DOC, DOCX.',
      });
      return;
    }
    if (file.size > MAX_FILE_SIZE && getFileExtension(file.name) !== 'pdf') {
      showAlertDialog({
        title: 'File Size Limit Exceeded',
        message: 'File size exceeds the 4MB limit.',
      });
      return;
    }

    setSelectedFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Execute Upload
  const handleExecuteUpload = async () => {
    if (!selectedFile || !activeUploadAssgn || !activeCourse) return;

    setIsUploading(true);
    setStatusMsg({ type: 'success', text: 'Processing file...' });

    try {
      let fileToUpload = selectedFile;
      if (
        selectedFile.size > MAX_FILE_SIZE &&
        getFileExtension(selectedFile.name) === 'pdf'
      ) {
        setStatusMsg({
          type: 'success',
          text: 'Compressing PDF to under 4MB...',
        });
        const buffer = await selectedFile.arrayBuffer();
        // pdf.js is ~1.5 MB and probes for `eval` at module load, which trips the PWA's
        // Content-Security-Policy on every page if it is statically imported. Load
        // it only for the one case that needs it.
        const { compressBalanced, compressMax } =
          await import('@quicktoolsone/pdf-compress');
        let compressed = await compressBalanced(buffer);
        if (compressed.stats.compressedSize > MAX_FILE_SIZE) {
          compressed = await compressMax(buffer);
        }
        if (compressed.stats.compressedSize > MAX_FILE_SIZE) {
          setStatusMsg({
            type: 'error',
            text: 'PDF too large even after compression.',
          });
          setIsUploading(false);
          return;
        }
        fileToUpload = new File([compressed.pdf], selectedFile.name, {
          type: 'application/pdf',
        });
      }

      setStatusMsg({ type: 'success', text: 'Uploading to VTOP...' });
      await network.getDAUploadView(
        activeUploadAssgn.classId,
        activeUploadAssgn.code,
      );
      const responseHtml = await network.uploadStudentDA(
        activeUploadAssgn.classId,
        activeUploadAssgn.code,
        activeUploadAssgn.title,
        fileToUpload,
      );

      const checkResult = checkDAUploadResponse(responseHtml);

      if (checkResult.requiresOtp) {
        setOtpState({
          requiresOtp: true,
          emailHint: checkResult.emailHint || '',
          otpPrefix: checkResult.otpPrefix || 'SDA -',
          otpVal: '',
        });
        setStatusMsg(null);
      } else if (checkResult.success) {
        setStatusMsg({
          type: 'success',
          text: 'Assignment uploaded successfully!',
        });
        setTimeout(() => {
          fetchDAAssignments(network, activeUploadAssgn.classId, true);
          setSelectedFile(null);
          setActiveUploadAssgn(null);
          setStatusMsg(null);
          setOtpState(null);
        }, 1200);
      } else {
        setStatusMsg({
          type: 'error',
          text: checkResult.error || 'Upload failed. Please try again.',
        });
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Upload failed. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Submit OTP for re-upload
  const handleOtpSubmit = async () => {
    if (!otpState || !otpState.otpVal.trim() || !activeUploadAssgn) return;

    setIsUploading(true);
    setStatusMsg({ type: 'success', text: 'Verifying OTP with VTOP...' });

    try {
      const responseHtml = await network.submitDAUploadOtp(
        otpState.otpVal.trim(),
      );
      const checkResult = checkDAUploadResponse(responseHtml);

      if (checkResult.success) {
        setStatusMsg({
          type: 'success',
          text: 'Verified & uploaded successfully!',
        });
        setTimeout(() => {
          fetchDAAssignments(network, activeUploadAssgn.classId, true);
          setSelectedFile(null);
          setActiveUploadAssgn(null);
          setStatusMsg(null);
          setOtpState(null);
        }, 1200);
      } else {
        // VTOP answers a wrong or stale code with the same OTP prompt and no error text
        setStatusMsg({
          type: 'error',
          text:
            checkResult.error ||
            (checkResult.requiresOtp
              ? 'That code was not accepted. Use the latest code from your email.'
              : 'OTP verification failed. Please check the code.'),
        });
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Failed to verify OTP.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (status === 'Offline - Not Synced') {
    return <OfflineNotSynced pageName="Digital Assignments" />;
  }

  return (
    <div
      id="retop-da-page"
      className="h-full w-full bg-(--bg-main) text-(--text-main) overflow-y-auto custom-scrollbar relative z-0"
    >
      {/* Clearance for floating TopBar */}
      <div className="w-full h-20 md:h-24 shrink-0" />

      {/* Main Container: Leftward aligned */}
      <div className="px-4 sm:px-6 md:px-8 pb-16 w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-start">
        {/* ================= LEFT COLUMN: COMPACT COURSE LIST ================= */}
        <div className="w-full md:w-80 lg:w-96 shrink-0 flex flex-col gap-3">
          {/* Header & Course Count */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-(--text-muted)">
                Courses ({daCourses.length})
              </span>
            </div>
            {daLoading && (
              <span className="text-[10px] font-mono font-bold text-(--accent-base) animate-pulse">
                SYNCING...
              </span>
            )}
          </div>

          {/* Courses List */}
          <div className="flex flex-col gap-2 w-full">
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course) => {
                const isSelected = course.classId === activeCourse?.classId;
                const assgns = daAssignments[course.classId] || [];
                const pendingCount = assgns.filter(
                  (a) => !a.lastUpdated || a.lastUpdated.trim() === '',
                ).length;

                return (
                  <button
                    key={course.classId}
                    onClick={() => {
                      setSelectedClassId(course.classId);
                      setSelectedFile(null);
                      setActiveUploadAssgn(null);
                    }}
                    className={`w-full p-3.5 rounded-2xl text-left transition-all cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-(--accent-base)/15 border-2 border-(--accent-base) shadow-xs'
                        : 'bg-(--bg-surface)/40 hover:bg-(--bg-surface)/80 border border-transparent hover:border-(--border-dim)/40'
                    }`}
                  >
                    {/* Top Row: Code + Type + Pending Chip */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                            isSelected
                              ? 'bg-(--accent-base) text-(--text-inverse)'
                              : 'bg-(--bg-highlight) text-(--text-main)'
                          }`}
                        >
                          {course.code}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full font-mono font-black text-[10px] uppercase"
                          style={getMaterialChipStyle('blue', isDark)}
                        >
                          {course.type}
                        </span>
                      </div>
                      {pendingCount > 0 && (
                        <span
                          className="px-2 py-0.5 rounded-full font-mono text-[10px] font-black uppercase shrink-0"
                          style={getMaterialChipStyle('amber', isDark)}
                        >
                          {pendingCount} Pending
                        </span>
                      )}
                    </div>

                    {/* Course Title */}
                    <h4 className="text-sm font-bold text-(--text-main) line-clamp-1 leading-snug">
                      {course.title}
                    </h4>

                    {/* Faculty */}
                    <div className="flex items-center gap-1.5 text-xs text-(--text-muted) truncate">
                      <Person className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      <span className="truncate">
                        {course.faculty || 'Faculty'}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-(--text-muted) bg-(--bg-surface)/30 rounded-2xl border border-(--border-dim)/20">
                No matching courses found.
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: ASSIGNMENTS & ACTIONS ================= */}
        <div className="flex-1 min-w-0 w-full flex flex-col gap-5">
          {activeCourse ? (
            <>
              {/* Active Course Hero Card */}
              <div className="p-5 md:p-6 rounded-3xl bg-(--bg-surface)/50 border border-(--border-dim)/40 flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-(--accent-base) text-(--text-inverse) text-xs font-mono font-bold">
                    {activeCourse.code}
                  </span>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black uppercase"
                    style={getMaterialChipStyle('blue', isDark)}
                  >
                    {activeCourse.type}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-(--bg-highlight) text-(--text-muted) text-xs font-mono">
                    Class ID: {activeCourse.classId}
                  </span>
                </div>

                <h2 className="text-xl md:text-2xl font-bold font-expanded text-(--text-main) leading-tight">
                  {activeCourse.title}
                </h2>

                <div className="flex items-center gap-2 text-xs text-(--text-muted) pt-1 border-t border-(--border-dim)/20">
                  <Person className="w-4 h-4 shrink-0 text-(--accent-base)" />
                  <span className="font-medium text-(--text-main)">
                    {activeCourse.faculty}
                  </span>
                </div>
              </div>

              {/* Upload Modal / Active Attachment Bar if a file is selected */}
              {selectedFile && activeUploadAssgn && (
                <div className="p-5 rounded-3xl bg-(--accent-base)/10 border-2 border-(--accent-base) flex flex-col gap-4 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CloudUpload className="w-5 h-5 text-(--accent-base)" />
                      <span className="font-bold text-sm text-(--text-main)">
                        Upload for{' '}
                        <strong className="text-(--accent-base)">
                          {activeUploadAssgn.title}
                        </strong>
                      </span>
                    </div>
                    <button
                      onClick={handleDismissModal}
                      className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-(--text-muted) cursor-pointer"
                    >
                      <Close className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Attached File Card */}
                  <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-(--bg-main) border border-(--border-dim)/40">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="px-2.5 py-1 rounded-lg bg-(--accent-base) text-(--text-inverse) font-mono font-black text-xs uppercase">
                        {getFileExtension(selectedFile.name)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span
                          className="text-xs font-bold text-(--text-main) truncate"
                          title={selectedFile.name}
                        >
                          {selectedFile.name}
                        </span>
                        <span className="text-[10px] font-mono text-(--text-muted)">
                          {formatFileSize(selectedFile.size)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* OTP Verification Prompt if Required */}
                  {otpState ? (
                    <div
                      className="flex flex-col gap-3 p-4 rounded-2xl border"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${getMaterialChipStyle('amber', isDark).color} 10%, transparent)`,
                        borderColor: `color-mix(in srgb, ${getMaterialChipStyle('amber', isDark).color} 30%, transparent)`,
                      }}
                    >
                      <div
                        className="flex items-center gap-2 font-bold text-xs"
                        style={{
                          color: getMaterialChipStyle('amber', isDark).color,
                        }}
                      >
                        <Lock className="w-4 h-4" />
                        <span>OTP Verification Required</span>
                      </div>
                      <p className="text-xs text-(--text-muted)">
                        Enter the code sent to your student email (
                        {otpState.emailHint || 'registered email'}):
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-2 rounded-xl bg-(--bg-main) font-mono font-bold text-xs text-(--text-muted)">
                          {otpState.otpPrefix}
                        </span>
                        <input
                          type="text"
                          maxLength={6}
                          autoFocus
                          value={otpState.otpVal}
                          onChange={(e) =>
                            setOtpState({
                              ...otpState,
                              otpVal: e.target.value.replace(/[^0-9]/g, ''),
                            })
                          }
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (
                              e.key === 'Enter' &&
                              otpState.otpVal.length >= 4 &&
                              !isUploading
                            ) {
                              e.preventDefault();
                              handleOtpSubmit();
                            }
                          }}
                          placeholder="123456"
                          className="flex-1 px-3.5 py-2 rounded-xl bg-(--bg-main) border border-(--border-dim)/40 font-mono font-bold text-sm tracking-widest text-(--text-main) outline-none focus:border-(--accent-base)"
                        />
                        <button
                          onClick={handleOtpSubmit}
                          disabled={isUploading || otpState.otpVal.length < 4}
                          className="px-5 py-2 rounded-xl bg-(--accent-base) text-(--text-inverse) font-bold text-xs cursor-pointer disabled:opacity-50 border-0"
                        >
                          {isUploading ? 'Verifying...' : 'Confirm OTP'}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Status Banner */}
                  {statusMsg && (
                    <div
                      className="p-3 rounded-xl text-xs font-bold flex items-center gap-2 border"
                      style={getMaterialChipStyle(
                        statusMsg.type === 'success' ? 'emerald' : 'red',
                        isDark,
                      )}
                    >
                      {statusMsg.type === 'success' ? (
                        <CheckCircle className="w-4 h-4 shrink-0" />
                      ) : (
                        <ErrorIcon className="w-4 h-4 shrink-0" />
                      )}
                      <span>{statusMsg.text}</span>
                    </div>
                  )}

                  {!otpState && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={handleDismissModal}
                        disabled={isUploading}
                        className="px-4 py-2 rounded-full text-xs font-bold bg-(--bg-surface) hover:bg-(--bg-highlight) text-(--text-muted) transition-colors cursor-pointer border border-(--border-dim)/40"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleExecuteUpload}
                        disabled={isUploading}
                        className="px-6 py-2 rounded-full text-xs font-black uppercase bg-(--accent-base) text-(--text-inverse) hover:opacity-90 transition-opacity cursor-pointer border-0 flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {isUploading ? 'Uploading...' : 'Submit File'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Assignments List */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-mono font-black uppercase tracking-wider text-(--text-muted) px-1">
                  Assignments ({currentAssignments.length})
                </span>

                {currentAssignments.length > 0 ? (
                  currentAssignments.map((assgn, idx) => {
                    const isSubmitted = Boolean(
                      assgn.lastUpdated && assgn.lastUpdated.trim() !== '',
                    );

                    return (
                      <div
                        key={idx}
                        className="p-5 rounded-3xl bg-(--bg-surface)/40 hover:bg-(--bg-surface)/70 border border-(--border-dim)/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        {/* Assignment Details */}
                        <div className="flex flex-col gap-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base text-(--text-main) truncate">
                              {assgn.title}
                            </h3>
                            <span
                              className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black uppercase shrink-0"
                              style={getMaterialChipStyle(
                                isSubmitted ? 'emerald' : 'amber',
                                isDark,
                              )}
                            >
                              {isSubmitted ? 'Submitted' : 'Pending'}
                            </span>
                          </div>

                          {/* Chips: Max Mark, Weightage */}
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-(--text-muted)">
                            <span className="bg-(--bg-main) px-2.5 py-0.5 rounded-full border border-(--border-dim)/30">
                              Max Mark:{' '}
                              <strong className="text-(--text-main)">
                                {assgn.maxMark}
                              </strong>
                            </span>
                            <span className="bg-(--bg-main) px-2.5 py-0.5 rounded-full border border-(--border-dim)/30">
                              Weightage:{' '}
                              <strong className="text-(--text-main)">
                                {assgn.weightage}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {/* Right Area: Due Dates & Actions */}
                        <div className="shrink-0 flex flex-col items-start md:items-end gap-2.5">
                          <div className="flex flex-col items-start md:items-end text-xs font-mono">
                            <div className="text-(--text-muted)">
                              Due:{' '}
                              <span className="text-(--text-main) font-bold">
                                {assgn.dueDate || 'N/A'}
                              </span>
                            </div>
                            <div className="text-[11px] text-(--text-muted)/80">
                              Updated: {assgn.lastUpdated || 'Not Uploaded'}
                            </div>
                          </div>

                          {/* Action Pill Buttons */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Question Paper Download */}
                            {assgn.hasQP && (
                              <button
                                onClick={(e) => handleDownloadQP(e, assgn)}
                                disabled={downloadingQP === assgn.code}
                                title="Download Question Paper"
                                className="px-3.5 py-1.5 rounded-full flex items-center gap-1.5 bg-(--bg-main) hover:bg-(--bg-highlight) text-xs font-bold text-(--text-main) transition-colors cursor-pointer border border-(--border-dim)/50"
                              >
                                <Description className="w-3.5 h-3.5 text-(--accent-base)" />
                                {downloadingQP === assgn.code
                                  ? 'Downloading...'
                                  : 'QP'}
                              </button>
                            )}

                            {/* Submission Download */}
                            {isSubmitted && (
                              <button
                                onClick={(e) =>
                                  handleDownloadStudentDA(e, assgn)
                                }
                                disabled={downloadingDA === assgn.code}
                                title="Download Your Submitted File"
                                className="px-3.5 py-1.5 rounded-full flex items-center gap-1.5 bg-(--bg-main) hover:bg-(--bg-highlight) text-xs font-bold text-(--text-main) transition-colors cursor-pointer border border-(--border-dim)/50"
                              >
                                <Download className="w-3.5 h-3.5 text-(--accent-base)" />
                                {downloadingDA === assgn.code
                                  ? 'Downloading...'
                                  : 'Download'}
                              </button>
                            )}

                            {/* Upload / Re-upload Button */}
                            <button
                              onClick={() => handleOpenUploadForAssgn(assgn)}
                              className="px-4 py-1.5 rounded-full flex items-center gap-1.5 bg-(--accent-base) text-(--text-inverse) hover:opacity-90 transition-opacity text-xs font-mono font-bold uppercase cursor-pointer border-0 shadow-xs"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              {isSubmitted ? 'Re-upload' : 'Upload'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 rounded-3xl bg-(--bg-surface)/30 border border-(--border-dim)/20 text-center flex flex-col items-center justify-center gap-2">
                    <Description className="w-8 h-8 text-(--text-muted)/60" />
                    <span className="text-xs font-medium text-(--text-muted)">
                      No digital assignments found for this course.
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <EmptyState
              msg="No Course Selected"
              subMsg="Select a course from the left menu to view and submit digital assignments."
            />
          )}
        </div>
      </div>

      {/* Hidden File Input Trigger */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".pdf,.xls,.xlsx,.doc,.docx"
        onChange={handleFileInputChange}
      />
    </div>
  );
}
