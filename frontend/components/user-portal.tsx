'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock3, ImagePlus, Loader2, LogOut, PackageCheck, Send, UploadCloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { type InspectionRecord, levelLabels } from '@/lib/inspection-types';

export function UserPortal({ displayName, signOutHref }: { displayName: string; signOutHref: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [waybill, setWaybill] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [scene, setScene] = useState('customer');
  const [remark, setRemark] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function loadRecords() {
    const response = await fetch('/api/inspections', { cache: 'no-store' });
    if (response.ok) setRecords(((await response.json()) as { records: InspectionRecord[] }).records);
  }

  useEffect(() => {
    void loadRecords();
    const timer = window.setInterval(() => void loadRecords(), 8000);
    return () => window.clearInterval(timer);
  }, []);

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []).filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)).slice(0, 6));
  }

  async function submit() {
    if (!waybill.trim() || files.length === 0) { setMessage('请填写运单号并至少选择一张包裹照片。'); return; }
    setSubmitting(true); setMessage('');
    try {
      const response = await fetch('/api/inspections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ waybill, orderNo, scene, damageTypes: remark.includes('浸湿') ? ['浸湿'] : ['破洞', '撕裂'], confidence: 92, aiLevel: 3 }) });
      if (!response.ok) throw new Error();
      setWaybill(''); setOrderNo(''); setRemark(''); setFiles([]);
      if (inputRef.current) inputRef.current.value = '';
      setMessage('提交成功，列表已自动刷新。');
      await loadRecords();
    } catch { setMessage('提交失败，请稍后再试。'); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen bg-[var(--workspace)] text-slate-900">
      <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-[76px] max-w-6xl items-center px-5"><div className="grid size-10 place-items-center rounded-xl bg-[#e1251b] text-white"><PackageCheck className="size-5" /></div><div className="ml-3"><p className="font-semibold">包裹智检 · 使用者端</p><p className="text-xs text-slate-400">{displayName}</p></div><a target="_top" href={signOutHref} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"><LogOut className="size-4" />退出</a></div></header>
      <main className="mx-auto grid max-w-6xl gap-5 px-5 py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-[#d92319]">提交检测</span><h1 className="mt-4 text-2xl font-bold">上传退货包裹照片</h1><p className="mt-2 text-sm text-slate-500">填写基本信息并上传清晰照片，提交后系统会自动刷新处理状态。</p>
          <button type="button" onClick={() => inputRef.current?.click()} className="mt-6 grid min-h-48 w-full place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-6 text-center hover:border-red-300"><div><UploadCloud className="mx-auto size-8 text-[#e1251b]" /><p className="mt-3 text-sm font-semibold">点击选择包裹照片</p><p className="mt-1 text-xs text-slate-400">JPG、PNG、WEBP，最多 6 张</p></div></button>
          <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={selectFiles} />
          {files.length > 0 && <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><ImagePlus className="size-4" />已选择 {files.length} 张照片</div>}
          <div className="mt-6 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="waybill">运单号</Label><Input id="waybill" className="mt-2" value={waybill} onChange={(e) => setWaybill(e.target.value)} placeholder="请输入运单号" /></div><div><Label htmlFor="order">订单号</Label><Input id="order" className="mt-2" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="选填" /></div></div>
          <div className="mt-4"><Label htmlFor="scene">拍摄场景</Label><NativeSelect id="scene" value={scene} onChange={(e) => setScene(e.target.value)} className="mt-2 w-full"><NativeSelectOption value="customer">用户退货现场</NativeSelectOption><NativeSelectOption value="courier">配送站点</NativeSelectOption><NativeSelectOption value="warehouse">仓库收货台</NativeSelectOption></NativeSelect></div>
          <div className="mt-4"><Label htmlFor="remark">情况说明</Label><Textarea id="remark" className="mt-2" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="例如：纸箱右下角浸湿并出现破洞" /></div>
          {message && <output className="mt-4 block rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{message}</output>}
          <Button onClick={submit} disabled={submitting} className="mt-5 h-11 w-full bg-[#e1251b] hover:bg-[#c91f17]">{submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}{submitting ? '正在提交…' : '提交检测任务'}</Button>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold">我的检测记录</h2><p className="mt-1 text-xs text-slate-400">每 8 秒自动刷新</p></div><Badge variant="outline">{records.length} 条</Badge></div><div className="mt-5 space-y-3">{records.length === 0 ? <div className="grid min-h-48 place-items-center rounded-xl bg-slate-50 text-sm text-slate-400">暂无提交记录</div> : records.map((record) => <article key={record.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-700">{record.waybill}</p><p className="mt-1 text-xs text-slate-400">{record.taskNo}</p></div><Badge className={record.status === 'reviewed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}>{record.status === 'reviewed' ? '已完成' : '处理中'}</Badge></div><div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span className="flex items-center gap-1"><Clock3 className="size-3.5" />{new Date(record.createdAt).toLocaleString('zh-CN')}</span><span className="flex items-center gap-1"><CheckCircle2 className="size-3.5 text-emerald-500" />{levelLabels[record.reviewLevel ?? record.aiLevel]}</span></div></article>)}</div></section>
      </main>
    </div>
  );
}
