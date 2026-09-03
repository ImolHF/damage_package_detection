'use client';

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Bell,
  Box,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileClock,
  FileSearch,
  Gauge,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  Menu,
  PackageCheck,
  RotateCcw,
  Save,
  ScanLine,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  UploadCloud,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { AnalyticsView } from '@/components/analytics-view';
import { HistoryView } from '@/components/history-view';
import { ReviewView } from '@/components/review-view';

type UploadItem = {
  id: string;
  file: File;
  url: string;
};

type Draft = {
  waybill: string;
  order: string;
  scene: string;
  remark: string;
};

type Feedback = {
  type: 'success' | 'error';
  text: string;
} | null;

type Stage = 'upload' | 'analyzing' | 'result';
type WorkspaceView = 'workspace' | 'history' | 'dashboard' | 'review';

const analysisSteps = [
  { label: '图像质量检查', detail: '检测清晰度、光线与主体完整性' },
  { label: '破损区域定位', detail: '识别破洞、撕裂、浸湿等异常' },
  { label: '破损程度评估', detail: '结合面积、位置与置信度综合分析' },
  { label: '生成定损建议', detail: '匹配退货包裹分级与处理规则' },
];

const navigation = [
  { label: '检测工作台', icon: ScanSearch, view: 'workspace', enabled: true },
  { label: '历史记录', icon: FileClock, view: 'history', enabled: true },
  { label: '数据看板', icon: LayoutDashboard, view: 'dashboard', enabled: true },
  { label: '复核中心', icon: ClipboardCheck, view: 'review', enabled: true },
];

const MAX_FILES = 6;
const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function StaffPortal({ displayName, signOutHref, role = 'staff' }: { displayName: string; signOutHref: string; role?: 'user' | 'staff' }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [images, setImages] = useState<UploadItem[]>([]);
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState<Draft>({
    waybill: '',
    order: '',
    scene: 'warehouse',
    remark: '',
  });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [stage, setStage] = useState<Stage>('upload');
  const [analysisStep, setAnalysisStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [resultSaved, setResultSaved] = useState(false);
  const [savingResult, setSavingResult] = useState(false);
  const [resultError, setResultError] = useState('');
  const [activeView, setActiveView] = useState<WorkspaceView>(role === 'user' ? 'workspace' : 'dashboard');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationCounts, setNotificationCounts] = useState({ reviewed: 0, pending: 0, uncertain: 0 });
  const [notificationTargets, setNotificationTargets] = useState<{ reviewed?: string; pending?: string; uncertain?: string }>({});
  const [focusedTaskId, setFocusedTaskId] = useState<string | undefined>();
  const [notificationsRead, setNotificationsRead] = useState(false);

  useEffect(() => {
    async function refreshNotifications() {
      try {
        const response = await fetch('/api/inspections', { cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as { records: Array<{ id: string; status: string; confidence: number }> };
        const next = {
          reviewed: data.records.filter((item) => item.status === 'reviewed').length,
          pending: data.records.filter((item) => item.status === 'pending_review').length,
          uncertain: data.records.filter((item) => item.confidence < 90).length,
        };
        setNotificationCounts(next);
        setNotificationTargets({
          reviewed: data.records.find((item) => item.status === 'reviewed')?.id,
          pending: data.records.find((item) => item.status === 'pending_review')?.id,
          uncertain: data.records.find((item) => item.confidence < 90)?.id,
        });
        const signature = `${role}-${next.reviewed}-${next.pending}-${next.uncertain}`;
        setNotificationsRead(window.localStorage.getItem(`notification-read-${role}`) === signature);
      } catch { /* 下一轮自动刷新 */ }
    }
    const first = window.setTimeout(() => void refreshNotifications(), 0);
    const timer = window.setInterval(() => void refreshNotifications(), 8000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, [role]);

  function markNotificationsRead() {
    const signature = `${role}-${notificationCounts.reviewed}-${notificationCounts.pending}-${notificationCounts.uncertain}`;
    window.localStorage.setItem(`notification-read-${role}`, signature);
    setNotificationsRead(true);
  }

  useEffect(() => {
    const saved = window.localStorage.getItem('package-inspection-draft');
    if (!saved) return;
    const timer = window.setTimeout(() => {
      try {
        setDraft(JSON.parse(saved) as Draft);
      } catch {
        window.localStorage.removeItem('package-inspection-draft');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (stage !== 'analyzing') return;
    const timers = [
      window.setTimeout(() => {
        setAnalysisStep(1);
        setProgress(38);
      }, 900),
      window.setTimeout(() => {
        setAnalysisStep(2);
        setProgress(67);
      }, 1900),
      window.setTimeout(() => {
        setAnalysisStep(3);
        setProgress(91);
      }, 3000),
      window.setTimeout(() => {
        setProgress(100);
        setStage('result');
      }, 4100),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [stage]);

  function updateDraft(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFeedback(null);
  }

  function saveDraft() {
    window.localStorage.setItem('package-inspection-draft', JSON.stringify(draft));
    setFeedback({ type: 'success', text: '草稿已保存在当前浏览器中。' });
  }

  function prepareTask() {
    if (!draft.waybill.trim()) {
      setFeedback({ type: 'error', text: '请先填写运单号。' });
      document.querySelector<HTMLInputElement>('#waybill')?.focus();
      return;
    }
    if (images.length === 0) {
      setFeedback({ type: 'error', text: '请至少上传一张包裹照片。' });
      inputRef.current?.focus();
      return;
    }
    window.localStorage.setItem('package-inspection-draft', JSON.stringify(draft));
    setFeedback(null);
    setResultSaved(false);
    setResultError('');
    setAnalysisStep(0);
    setProgress(14);
    setStage('analyzing');
  }

  async function loadDemoImage() {
    try {
      const response = await fetch('/og.png');
      const blob = await response.blob();
      const file = new File([blob], 'damaged-package-demo.png', { type: 'image/png' });
      addFiles([file]);
      if (!draft.waybill) updateDraft('waybill', 'JD-DEMO-20260902');
      if (!draft.order) updateDraft('order', 'TH-DEMO-0001');
      setMessage('演示样例已载入，可直接开始智能检测。');
    } catch {
      setMessage('演示样例载入失败，请选择本地图片。');
    }
  }

  function restartAnalysis() {
    setResultSaved(false);
    setResultError('');
    setAnalysisStep(0);
    setProgress(14);
    setStage('analyzing');
  }

  async function saveResult() {
    setSavingResult(true);
    setResultError('');
    try {
      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waybill: draft.waybill,
          orderNo: draft.order,
          scene: draft.scene,
          damageTypes: ['破洞', '撕裂'],
          confidence: 95,
          aiLevel: 3,
        }),
      });
      if (!response.ok) throw new Error('save_failed');
      setResultSaved(true);
    } catch {
      setResultError('保存失败，请稍后重试。');
    } finally {
      setSavingResult(false);
    }
  }

  function addFiles(files: File[]) {
    setMessage('');
    const validFiles = files.filter(
      (file) => ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_SIZE,
    );

    if (validFiles.length !== files.length) {
      setMessage('部分图片格式不支持或超过 10MB，已自动跳过。');
    }

    const remaining = Math.max(0, MAX_FILES - images.length);
    const next = validFiles.slice(0, remaining).map((file) => ({
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      url: URL.createObjectURL(file),
    }));

    if (validFiles.length > remaining) {
      setMessage(`每个任务最多上传 ${MAX_FILES} 张图片，超出的图片未添加。`);
    }

    setImages((current) => [...current, ...next]);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function removeImage(id: string) {
    setImages((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((item) => item.id !== id);
    });
  }

  return (
    <div className="min-h-screen bg-[var(--workspace)] text-slate-900">
      {isSidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          aria-label="关闭导航"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-[#111b2d] text-white transition-transform lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-5">
          <div className="grid size-10 place-items-center rounded-xl bg-[#e1251b] shadow-[0_8px_24px_rgba(225,37,27,.32)]">
            <PackageCheck className="size-5" />
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-wide">包裹智检</p>
            <p className="mt-0.5 text-[11px] text-slate-400">AI DAMAGE INSPECTION</p>
          </div>
          <button
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="关闭导航"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-6" aria-label="主导航">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[.16em] text-slate-500">
            工作空间
          </p>
          <div className="space-y-1">
            {navigation.filter((item) => role === 'user' ? ['workspace', 'history'].includes(item.view) : ['dashboard', 'review'].includes(item.view)).map((item) => {
              const Icon = item.icon;
              const isActive = item.view === activeView;
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={!item.enabled}
                  onClick={() => {
                    if (item.enabled) {
                      setActiveView(item.view as WorkspaceView);
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    isActive
                      ? 'bg-white/10 font-medium text-white shadow-[inset_3px_0_0_#e1251b]'
                      : item.enabled
                        ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        : 'cursor-not-allowed text-slate-600'
                  }`}
                >
                  <Icon className={`size-[18px] ${isActive ? 'text-[#ff665e]' : ''}`} />
                  <span>{item.label}</span>
                  {!item.enabled && (
                    <span className="ml-auto rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-500">
                      待开放
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-xl bg-white/[.05] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-200">
              <ShieldCheck className="size-4 text-emerald-400" />
              系统运行正常
            </div>
            <p className="text-[11px] leading-5 text-slate-500">当前为前端演示环境，AI 模型将在第二轮接入。</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-7">
          <button
            className="mr-3 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="打开导航"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>工作空间</span>
            <ChevronRight className="size-4" />
            <span className="font-medium text-slate-700">
              {activeView === 'workspace' ? '检测工作台' : activeView === 'history' ? '历史记录' : activeView === 'review' ? '复核中心' : '数据看板'}
            </span>
          </div>
          <div className="relative ml-auto flex items-center gap-2">
            <button onClick={() => setNotificationOpen((open) => !open)} className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100" aria-label="通知" aria-expanded={notificationOpen}>
              <Bell className="size-[18px]" />
              {!notificationsRead && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-[#e1251b] px-1 text-[9px] font-bold leading-4 text-white ring-2 ring-white">{role === 'user' ? Math.min(notificationCounts.reviewed, 9) : Math.min(notificationCounts.pending + notificationCounts.uncertain, 9)}</span>}
            </button>
            {notificationOpen && <section className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,.18)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><p className="text-sm font-semibold">消息中心</p><p className="mt-0.5 text-[11px] text-slate-400">每 8 秒自动更新</p></div><button onClick={markNotificationsRead} className="text-xs font-medium text-[#d92319] hover:underline">全部已读</button></div>
              <div className="divide-y divide-slate-100">
                {role === 'user' ? <>
                  <button onClick={() => { setFocusedTaskId(notificationTargets.reviewed); setActiveView('history'); setNotificationOpen(false); markNotificationsRead(); }} className="flex w-full gap-3 px-4 py-4 text-left hover:bg-slate-50"><span className="mt-0.5 grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ClipboardCheck className="size-4" /></span><span><strong className="text-sm">人工复核结果已更新</strong><span className="mt-1 block text-xs leading-5 text-slate-500">当前共有 {notificationCounts.reviewed} 条已复核记录，点击查看最新最终结论。</span></span></button>
                  <div className="flex gap-3 px-4 py-4"><span className="mt-0.5 grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600"><Activity className="size-4" /></span><span><strong className="text-sm">检测任务自动同步中</strong><span className="mt-1 block text-xs leading-5 text-slate-500">提交后的检测与复核状态会自动刷新，无需重复提交。</span></span></div>
                </> : <>
                  <button onClick={() => { setFocusedTaskId(notificationTargets.pending); setActiveView('review'); setNotificationOpen(false); markNotificationsRead(); }} className="flex w-full gap-3 px-4 py-4 text-left hover:bg-slate-50"><span className="mt-0.5 grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600"><ClipboardCheck className="size-4" /></span><span><strong className="text-sm">{notificationCounts.pending} 条任务等待复核</strong><span className="mt-1 block text-xs leading-5 text-slate-500">点击直接打开最新待复核任务。</span></span></button>
                  <button onClick={() => { setFocusedTaskId(notificationTargets.uncertain); setActiveView('dashboard'); setNotificationOpen(false); markNotificationsRead(); }} className="flex w-full gap-3 px-4 py-4 text-left hover:bg-slate-50"><span className="mt-0.5 grid size-9 place-items-center rounded-xl bg-red-50 text-[#e1251b]"><TriangleAlert className="size-4" /></span><span><strong className="text-sm">发现 {notificationCounts.uncertain} 条存疑样本</strong><span className="mt-1 block text-xs leading-5 text-slate-500">置信度低于 90%，可在数据看板查看样本回流情况。</span></span></button>
                </>}
              </div>
            </section>}
            <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="grid size-9 place-items-center rounded-xl bg-slate-900 text-xs font-semibold text-white">检</div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-700">{displayName}</p>
                <a target="_top" href={signOutHref} className="text-[10px] text-slate-400 hover:text-[#e1251b]">返回身份选择</a>
              </div>
            </div>
          </div>
        </header>

        {activeView === 'workspace' ? (
        <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:py-9">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-md bg-red-50 px-2 py-1 text-[11px] font-semibold text-[#d92319]">
                  {stage === 'upload' ? '第一轮 · 新建任务' : stage === 'analyzing' ? '第二轮 · 智能分析' : '第二轮 · 检测结果'}
                </span>
                <span className="text-xs text-slate-400">
                  {stage === 'upload' ? '草稿保存在当前页面' : stage === 'analyzing' ? '预计约 5 秒完成' : 'AI 模拟结果可用于前端联调'}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">退货包裹破损检测</h1>
              <p className="mt-2 text-sm text-slate-500">
                {stage === 'upload'
                  ? '上传包裹照片并补充基本信息，为智能识别准备检测任务。'
                  : stage === 'analyzing'
                    ? '正在定位包裹破损区域并评估损伤程度，请保持页面开启。'
                    : '检测已完成，请核对破损位置、识别类别与智能定损建议。'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="grid size-6 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="size-3.5" /></span>
              <span className={stage === 'upload' ? 'font-medium text-slate-700' : ''}>提交资料</span>
              <span className={`h-px w-7 ${stage !== 'upload' ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              <span className={`grid size-6 place-items-center rounded-full ${stage === 'analyzing' ? 'bg-red-50 font-semibold text-[#e1251b]' : stage === 'result' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100'}`}>
                {stage === 'result' ? <CheckCircle2 className="size-3.5" /> : '2'}
              </span>
              <span className={stage === 'analyzing' ? 'font-medium text-slate-700' : ''}>AI 检测</span>
              <span className={`h-px w-7 ${stage === 'result' ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              <span className={`grid size-6 place-items-center rounded-full ${stage === 'result' ? 'bg-red-50 font-semibold text-[#e1251b]' : 'bg-slate-100'}`}>3</span>
              <span className={stage === 'result' ? 'font-medium text-slate-700' : ''}>定损结果</span>
            </div>
          </div>

          {stage === 'upload' ? (
            <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.72fr)]">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,.045)]">
              <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                <div>
                  <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
                    <ImagePlus className="size-[18px] text-[#e1251b]" />
                    包裹照片
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">建议上传正面、侧面及破损细节，多角度照片有助于提高识别准确率。</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                  {images.length}/{MAX_FILES}
                </span>
              </div>

              <div className="p-5 sm:p-6">
                <input
                  ref={inputRef}
                  className="sr-only"
                  type="file"
                  aria-label="选择包裹照片"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  aria-label="拖拽或选择包裹照片"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`group grid min-h-[276px] w-full cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
                    isDragging
                      ? 'border-[#e1251b] bg-red-50/80'
                      : 'border-slate-200 bg-slate-50/55 hover:border-red-300 hover:bg-red-50/30'
                  }`}
                >
                  <div>
                    <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-white text-[#e1251b] shadow-[0_8px_28px_rgba(15,23,42,.09)] ring-1 ring-slate-100 transition group-hover:-translate-y-1">
                      <UploadCloud className="size-7" />
                    </div>
                    <p className="mt-5 text-sm font-semibold text-slate-700">拖拽包裹照片到这里</p>
                    <p className="mt-1.5 text-xs text-slate-400">或者 <span className="font-medium text-[#d92319]">点击选择图片</span></p>
                    <p className="mt-4 text-[11px] text-slate-400">支持 JPG、PNG、WEBP · 单张不超过 10MB · 最多 6 张</p>
                  </div>
                </button>

                {images.length === 0 && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <span>暂时没有合适照片？</span>
                    <button
                      type="button"
                      onClick={loadDemoImage}
                      className="inline-flex items-center gap-1 font-medium text-[#d92319] hover:underline"
                    >
                      <Sparkles className="size-3.5" />
                      载入演示样例
                    </button>
                  </div>
                )}

                {message && (
                  <output className="mt-3 block rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    {message}
                  </output>
                )}

                {images.length > 0 && (
                  <div className="mt-5">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-600">已选择照片</p>
                      <button
                        className="text-xs text-slate-400 hover:text-[#d92319]"
                        onClick={() => images.forEach((image) => removeImage(image.id))}
                      >
                        清空全部
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {images.map((image, index) => (
                        <div key={image.id} className="group/image relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={image.url} alt={`包裹照片 ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 flex items-center bg-gradient-to-t from-slate-950/75 to-transparent px-2.5 pb-2 pt-7">
                            <p className="min-w-0 flex-1 truncate text-[10px] text-white">{image.file.name}</p>
                            <button
                              className="ml-2 grid size-7 place-items-center rounded-lg bg-white/15 text-white backdrop-blur hover:bg-[#e1251b]"
                              onClick={(event) => {
                                event.stopPropagation();
                                removeImage(image.id);
                              }}
                              aria-label={`删除 ${image.file.name}`}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,.045)]">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
                    <Box className="size-[18px] text-[#e1251b]" />
                    包裹信息
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">用于关联退货订单和后续检测记录。</p>
                </div>
                <div className="space-y-4 p-5">
                  <div className="space-y-2">
                    <Label htmlFor="waybill">运单号 <span className="text-[#e1251b]">*</span></Label>
                    <Input
                      id="waybill"
                      value={draft.waybill}
                      onChange={(event) => updateDraft('waybill', event.target.value)}
                      placeholder="请输入或扫描运单号"
                      className="h-10 bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order">退货订单号</Label>
                    <Input
                      id="order"
                      value={draft.order}
                      onChange={(event) => updateDraft('order', event.target.value)}
                      placeholder="请输入京东退货订单号"
                      className="h-10 bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scene">拍摄场景</Label>
                    <NativeSelect
                      id="scene"
                      value={draft.scene}
                      onChange={(event) => updateDraft('scene', event.target.value)}
                      className="w-full [&_select]:h-10 [&_select]:bg-slate-50/50"
                    >
                      <NativeSelectOption value="warehouse">仓库收货台</NativeSelectOption>
                      <NativeSelectOption value="courier">配送站点</NativeSelectOption>
                      <NativeSelectOption value="customer">用户退货现场</NativeSelectOption>
                      <NativeSelectOption value="other">其他场景</NativeSelectOption>
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="remark">备注</Label>
                    <Textarea
                      id="remark"
                      value={draft.remark}
                      onChange={(event) => updateDraft('remark', event.target.value)}
                      rows={3}
                      placeholder="可填写包裹异常情况或补充说明"
                      className="min-h-20 resize-none bg-slate-50/50"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,.045)]">
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <CircleHelp className="size-[18px]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700">拍摄建议</h3>
                    <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-500">
                      <li>· 保证包裹主体完整、光线充足</li>
                      <li>· 破损区域请额外拍摄一张近景</li>
                      <li>· 避免严重反光、遮挡或画面模糊</li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_35px_rgba(15,23,42,.04)]">
            {feedback && (
              <output
                className={`mb-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="mt-px size-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-px size-4 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </output>
            )}
            <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-xs text-slate-400">带 <span className="text-[#e1251b]">*</span> 的项目为必填项，提交后将进入 AI 检测环节。</p>
              <div className="flex gap-2">
                <Button onClick={saveDraft} variant="outline" size="lg" className="h-10 flex-1 px-5 sm:flex-none">
                  <Save className="size-4" />
                  保存草稿
                </Button>
                <Button
                  onClick={prepareTask}
                  size="lg"
                  className="h-10 flex-1 bg-[#e1251b] px-5 shadow-[0_8px_20px_rgba(225,37,27,.2)] hover:bg-[#c91f17] sm:flex-none"
                >
                  保存并进入下一步
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
            </>
          ) : stage === 'analyzing' ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.72fr)]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,.045)]">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                  <div>
                    <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
                      <ScanLine className="size-[18px] text-[#e1251b]" />
                      实时检测画面
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">系统正在逐区域分析包裹表面异常。</p>
                  </div>
                  <Badge className="bg-red-50 text-[#d92319]">
                    <span className="size-1.5 animate-pulse rounded-full bg-[#e1251b]" />
                    分析中
                  </Badge>
                </div>
                <div className="p-5 sm:p-6">
                  <div className="relative overflow-hidden rounded-2xl bg-[#08101e]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={images[0]?.url ?? '/og.png'}
                      alt="正在分析的包裹"
                      className="aspect-video w-full object-contain opacity-70"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.07)_1px,transparent_1px)] bg-[size:34px_34px]" />
                    <div className="scan-sweep absolute inset-x-0 top-0 h-[2px] bg-cyan-300 shadow-[0_0_22px_5px_rgba(34,211,238,.65)]" />
                    <div className="absolute left-[57%] top-[25%] h-[55%] w-[27%] border border-cyan-300/70">
                      <span className="absolute -left-px -top-6 bg-cyan-400 px-2 py-1 text-[10px] font-semibold text-slate-950">疑似破损区域</span>
                    </div>
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-slate-950/70 px-3 py-2 text-[11px] text-cyan-100 backdrop-blur">
                      <Activity className="size-3.5 animate-pulse text-cyan-300" />
                      视觉模型正在运行
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,.045)] sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-red-50 text-[#e1251b]">
                    <Loader2 className="size-5 animate-spin" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-800">AI 智能分析</h2>
                    <p className="mt-1 text-xs text-slate-400">任务 {draft.waybill || '未填写'}</p>
                  </div>
                </div>

                <Progress value={progress} className="mt-6 gap-2 [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-indicator]]:bg-[#e1251b]">
                  <ProgressLabel className="text-xs text-slate-500">综合进度</ProgressLabel>
                  <ProgressValue className="text-xs font-semibold text-slate-700">{progress}%</ProgressValue>
                </Progress>

                <div className="mt-6 space-y-1">
                  {analysisSteps.map((item, index) => {
                    const isDone = index < analysisStep;
                    const isActive = index === analysisStep;
                    return (
                      <div
                        key={item.label}
                        className={`flex gap-3 rounded-xl px-3 py-3 transition ${isActive ? 'bg-red-50/70' : ''}`}
                      >
                        <div className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : isActive
                              ? 'bg-[#e1251b] text-white shadow-[0_0_0_4px_rgba(225,37,27,.1)]'
                              : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isDone ? <CheckCircle2 className="size-3.5" /> : isActive ? <Loader2 className="size-3.5 animate-spin" /> : index + 1}
                        </div>
                        <div>
                          <p className={`text-xs font-medium ${isActive ? 'text-slate-800' : isDone ? 'text-slate-600' : 'text-slate-400'}`}>{item.label}</p>
                          <p className="mt-1 text-[10px] leading-4 text-slate-400">{item.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  className="mt-6 h-10 w-full"
                  onClick={() => setStage('upload')}
                >
                  <ArrowLeft className="size-4" />
                  返回修改资料
                </Button>
              </section>
            </div>
          ) : (
            <>
              <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: '检测图片', value: `${images.length} 张`, icon: ImagePlus, tone: 'text-blue-600 bg-blue-50' },
                  { label: '发现破损', value: '2 处', icon: FileSearch, tone: 'text-[#e1251b] bg-red-50' },
                  { label: '最高置信度', value: '94.7%', icon: Gauge, tone: 'text-violet-600 bg-violet-50' },
                  { label: '处理耗时', value: '4.1 秒', icon: Activity, tone: 'text-emerald-600 bg-emerald-50' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,.035)]">
                      <div className={`grid size-10 place-items-center rounded-xl ${item.tone}`}><Icon className="size-[18px]" /></div>
                      <div><p className="text-[11px] text-slate-400">{item.label}</p><p className="mt-0.5 text-base font-bold text-slate-800">{item.value}</p></div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(350px,.72fr)]">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,.045)]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                    <div>
                      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
                        <ScanSearch className="size-[18px] text-[#e1251b]" />
                        破损检测结果
                      </h2>
                      <p className="mt-1 text-xs text-slate-400">检测框位置为前端模拟数据，后续由真实模型坐标替换。</p>
                    </div>
                    <div className="flex gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[#e1251b]" />破洞</span>
                      <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-amber-400" />撕裂</span>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="relative overflow-hidden rounded-2xl bg-[#0a1220]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={images[0]?.url ?? '/og.png'} alt="带破损检测标注的包裹" className="aspect-video w-full object-contain" />
                      <div className="absolute left-[62%] top-[31%] h-[48%] w-[20%] border-2 border-[#ff3b30] shadow-[0_0_0_1px_rgba(255,255,255,.35)]">
                        <span className="absolute -left-0.5 -top-7 whitespace-nowrap rounded-t-md bg-[#e1251b] px-2 py-1 text-[10px] font-semibold text-white">破洞 94.7%</span>
                        <span className="absolute -right-1 -top-1 size-2 rounded-full bg-white ring-2 ring-[#e1251b]" />
                        <span className="absolute -bottom-1 -left-1 size-2 rounded-full bg-white ring-2 ring-[#e1251b]" />
                      </div>
                      <div className="absolute left-[49%] top-[26%] h-[19%] w-[25%] border-2 border-amber-400">
                        <span className="absolute -left-0.5 -top-7 whitespace-nowrap rounded-t-md bg-amber-400 px-2 py-1 text-[10px] font-semibold text-slate-950">撕裂 88.2%</span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                      <span>当前：{images[0]?.file.name ?? '演示样例'}</span>
                      <span>原图尺寸已按比例适配检测坐标</span>
                    </div>
                  </div>
                </section>

                <div className="space-y-5">
                  <section className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-[0_10px_35px_rgba(225,37,27,.07)]">
                    <div className="bg-gradient-to-r from-[#b91c1c] to-[#e1251b] px-5 py-4 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] text-red-100">智能定损等级</p>
                          <h2 className="mt-1 text-xl font-bold">三级 · 严重破损</h2>
                        </div>
                        <TriangleAlert className="size-8 text-white/85" />
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between"><span className="text-slate-400">综合风险分</span><span className="font-semibold text-[#d92319]">82 / 100</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[82%] rounded-full bg-gradient-to-r from-amber-400 to-[#e1251b]" /></div>
                      </div>
                      <div className="mt-5 rounded-xl bg-red-50 p-3.5">
                        <p className="text-xs font-semibold text-red-800">处理建议</p>
                        <p className="mt-1.5 text-xs leading-5 text-red-700/80">建议转入人工复核，检查内部商品完整性；外包装不建议直接二次流通，并保留物流索赔影像。</p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,.045)]">
                    <h3 className="text-sm font-semibold text-slate-800">识别明细</h3>
                    <div className="mt-4 space-y-3">
                      {[
                        { type: '破洞', confidence: '94.7%', level: '重度', color: 'bg-[#e1251b]' },
                        { type: '撕裂', confidence: '88.2%', level: '中度', color: 'bg-amber-400' },
                      ].map((item, index) => (
                        <div key={item.type} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                          <span className={`grid size-7 place-items-center rounded-lg text-[11px] font-bold text-white ${item.color}`}>{index + 1}</span>
                          <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-700">{item.type}</p><p className="mt-0.5 text-[10px] text-slate-400">置信度 {item.confidence}</p></div>
                          <Badge variant="outline" className="text-[10px] text-slate-500">{item.level}</Badge>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>

              <div className="mt-5 flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_10px_35px_rgba(15,23,42,.04)] sm:flex-row sm:items-center">
                <div className={`flex items-center gap-2 text-xs ${resultError ? 'text-red-700' : 'text-emerald-700'}`}>
                  {resultError ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
                  {resultError || (resultSaved ? '检测结果已保存，可在历史记录和复核中心查看。' : '检测已完成，结果等待人工复核。')}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="h-10 flex-1 sm:flex-none" onClick={() => setStage('upload')}>
                    <ArrowLeft className="size-4" />修改资料
                  </Button>
                  <Button variant="outline" className="h-10 flex-1 sm:flex-none" onClick={restartAnalysis}>
                    <RotateCcw className="size-4" />重新检测
                  </Button>
                  <Button
                    className="h-10 flex-1 bg-[#e1251b] hover:bg-[#c91f17] sm:flex-none"
                    onClick={saveResult}
                    disabled={resultSaved || savingResult}
                  >
                    <Save className="size-4" />{savingResult ? '保存中…' : resultSaved ? '已保存' : '保存结果'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </main>
        ) : activeView === 'history' ? (
          <HistoryView onReview={() => setActiveView('review')} canReview={role === 'staff'} initialSelectedId={focusedTaskId} />
        ) : activeView === 'dashboard' ? (
          <AnalyticsView />
        ) : (
          <ReviewView onHistory={() => setActiveView('history')} initialSelectedId={focusedTaskId} />
        )}
      </div>
    </div>
  );
}
