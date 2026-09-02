'use client';

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Box,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileClock,
  ImagePlus,
  LayoutDashboard,
  Menu,
  PackageCheck,
  Save,
  ScanSearch,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

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

const navigation = [
  { label: '检测工作台', icon: ScanSearch, active: true },
  { label: '历史记录', icon: FileClock },
  { label: '数据看板', icon: LayoutDashboard },
  { label: '复核中心', icon: ClipboardCheck },
];

const MAX_FILES = 6;
const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function Home() {
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
    setFeedback({
      type: 'success',
      text: '检测资料已准备完成。下一轮接入模拟 AI 分析后即可继续。',
    });
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
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    item.active
                      ? 'bg-white/10 font-medium text-white shadow-[inset_3px_0_0_#e1251b]'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`size-[18px] ${item.active ? 'text-[#ff665e]' : ''}`} />
                  <span>{item.label}</span>
                  {!item.active && (
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
            <span className="font-medium text-slate-700">检测工作台</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100" aria-label="通知">
              <Bell className="size-[18px]" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#e1251b] ring-2 ring-white" />
            </button>
            <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="grid size-9 place-items-center rounded-xl bg-slate-900 text-xs font-semibold text-white">检</div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-700">检测专员</p>
                <p className="text-[10px] text-slate-400">业务操作员</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:py-9">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-md bg-red-50 px-2 py-1 text-[11px] font-semibold text-[#d92319]">第一轮 · 新建任务</span>
                <span className="text-xs text-slate-400">草稿保存在当前页面</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">退货包裹破损检测</h1>
              <p className="mt-2 text-sm text-slate-500">上传包裹照片并补充基本信息，为智能识别准备检测任务。</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="grid size-6 place-items-center rounded-full bg-emerald-50 text-emerald-600">1</span>
              <span className="font-medium text-slate-700">提交资料</span>
              <span className="h-px w-7 bg-slate-200" />
              <span className="grid size-6 place-items-center rounded-full bg-slate-100">2</span>
              <span>AI 检测</span>
              <span className="h-px w-7 bg-slate-200" />
              <span className="grid size-6 place-items-center rounded-full bg-slate-100">3</span>
              <span>定损结果</span>
            </div>
          </div>

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
        </main>
      </div>
    </div>
  );
}
