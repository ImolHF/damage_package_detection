'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Inbox,
  Save,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { InspectionRecord, levelLabels } from '@/lib/inspection-types';

type ReviewViewProps = {
  onHistory: () => void;
  initialSelectedId?: string;
};

const damageOptions = ['破洞', '撕裂', '压瘪', '浸湿', '污损', '开封', '胶带异常', '其他破损'];

export function ReviewView({ onHistory, initialSelectedId }: ReviewViewProps) {
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<'all' | 'high' | 'uncertain'>('all');

  async function loadRecords(preferredId?: string) {
    setLoading(true);
    try {
      const response = await fetch('/api/inspections');
      const data = (await response.json()) as { records: InspectionRecord[] };
      const pending = data.records.filter((record) => record.status === 'pending_review');
      setRecords(pending);
      const targetId = preferredId ?? initialSelectedId;
      setSelectedId(targetId && pending.some((item) => item.id === targetId) ? targetId : pending[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
    const timer = window.setInterval(() => void loadRecords(), 8000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleRecords = records.filter((record) => queueFilter === 'high' ? record.aiLevel >= 3 : queueFilter === 'uncertain' ? record.confidence < 90 : true);
  const selected = visibleRecords.find((record) => record.id === selectedId) ?? visibleRecords[0] ?? null;

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:py-9">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">第三轮 · 人机协同</span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">人工复核中心</h1>
          <p className="mt-2 text-sm text-slate-500">确认 AI 识别结果，修正破损类型并给出最终定损结论。</p>
        </div>
        <Button variant="outline" onClick={onHistory}>查看全部记录<ChevronRight className="size-4" /></Button>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { key: 'all', label: '全部待复核', value: records.length },
          { key: 'high', label: '高优先级', value: records.filter((item) => item.aiLevel >= 3).length },
          { key: 'uncertain', label: '存疑样本', value: records.filter((item) => item.confidence < 90).length },
        ].map((item) => <button key={item.key} type="button" onClick={() => setQueueFilter(item.key as typeof queueFilter)} className={`rounded-2xl border p-4 text-left transition ${queueFilter === item.key ? 'border-red-200 bg-red-50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}><p className="text-[11px] text-slate-400">{item.label}</p><p className="mt-1 text-xl font-bold text-slate-800">{item.value}<span className="ml-1 text-xs font-medium text-slate-400">项</span></p></button>)}
      </div>

      {loading ? (
        <div className="grid min-h-[500px] place-items-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-400">正在加载待复核任务…</div>
      ) : selected ? (
        <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,.045)]">
            <div className="border-b border-slate-100 px-5 py-4"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-800">待复核队列</h2><Badge className="bg-amber-50 text-amber-700">{visibleRecords.length} 项</Badge></div></div>
            <div className="divide-y divide-slate-100">
              {visibleRecords.map((record) => (
                <button key={record.id} onClick={() => setSelectedId(record.id)} className={`w-full px-5 py-4 text-left transition ${record.id === selected.id ? 'bg-red-50/60 shadow-[inset_3px_0_0_#e1251b]' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold text-slate-700">{record.taskNo}</p><span className={`text-[10px] font-medium ${record.confidence < 90 ? 'text-amber-600' : 'text-slate-400'}`}>{record.confidence}%</span></div>
                  <p className="mt-1 text-[10px] text-slate-400">{record.waybill}</p>
                  <div className="mt-2 flex flex-wrap gap-1">{record.aiLevel >= 3 && <Badge className="bg-red-50 text-[9px] text-red-700">高优先级</Badge>}{record.confidence < 90 && <Badge className="bg-amber-50 text-[9px] text-amber-700">存疑样本</Badge>}{record.damageTypes.slice(0, 2).map((type) => <Badge key={type} variant="outline" className="text-[9px]">{type}</Badge>)}</div>
                </button>
              ))}
            </div>
          </section>

          <ReviewForm key={selected.id} record={selected} onSaved={() => loadRecords()} />
        </div>
      ) : (
        <div className="grid min-h-[500px] place-items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_10px_35px_rgba(15,23,42,.045)]">
          <div><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Inbox className="size-7" /></div><h2 className="mt-5 text-lg font-semibold text-slate-800">待复核任务已清空</h2><p className="mt-2 text-sm text-slate-400">当前所有检测记录都已完成复核。</p><Button onClick={onHistory} variant="outline" className="mt-5">查看历史记录</Button></div>
        </div>
      )}
    </main>
  );
}

function ReviewForm({ record, onSaved }: { record: InspectionRecord; onSaved: () => Promise<void> }) {
  const [damageTypes, setDamageTypes] = useState(record.damageTypes);
  const [reviewLevel, setReviewLevel] = useState(String(record.aiLevel));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const waitMinutes = Math.max(1, Math.floor((Date.now() - new Date(record.createdAt).getTime()) / 60000));

  function toggleDamage(type: string) {
    setDamageTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
  }

  async function submitReview() {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/inspections/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ damageTypes, reviewLevel: Number(reviewLevel), reviewNote: note, reviewer: '检测专员' }),
      });
      if (!response.ok) throw new Error('review_failed');
      setSaved(true);
      window.setTimeout(() => void onSaved(), 700);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,.045)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div><h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-800"><ClipboardCheck className="size-[18px] text-[#e1251b]" />复核任务 {record.taskNo}</h2><p className="mt-1 text-xs text-slate-400">AI 原始结论：{levelLabels[record.aiLevel]} · 置信度 {record.confidence}%</p></div>
        <div className="flex gap-2"><Badge className="bg-amber-50 text-amber-700"><TriangleAlert className="size-3" />待人工确认</Badge>{waitMinutes >= 30 && <Badge className="bg-red-50 text-red-700">已等待 {waitMinutes >= 1440 ? `${Math.floor(waitMinutes / 1440)} 天` : `${waitMinutes} 分钟`}</Badge>}</div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(330px,.75fr)]">
        <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r sm:p-6">
          <div className="relative overflow-hidden rounded-2xl bg-[#0a1220]">
            <img src="/og.png" alt="待复核包裹" className="aspect-video w-full object-contain" />
            <div className="absolute left-[62%] top-[31%] h-[48%] w-[20%] border-2 border-[#ff3b30]"><span className="absolute -left-0.5 -top-7 whitespace-nowrap rounded-t-md bg-[#e1251b] px-2 py-1 text-[10px] font-semibold text-white">破洞 94.7%</span></div>
            <div className="absolute left-[49%] top-[26%] h-[19%] w-[25%] border-2 border-amber-400"><span className="absolute -left-0.5 -top-7 whitespace-nowrap rounded-t-md bg-amber-400 px-2 py-1 text-[10px] font-semibold text-slate-950">撕裂 88.2%</span></div>
          </div>
          <div className="mt-4 rounded-xl bg-blue-50/70 p-3 text-xs leading-5 text-blue-700"><span className="font-semibold">复核提示：</span>请结合包裹整体、破损位置及内部商品情况，确认检测类型和最终等级。</div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div><Label>确认破损类型</Label><div className="mt-3 flex flex-wrap gap-2">{damageOptions.map((type) => <button key={type} type="button" onClick={() => toggleDamage(type)} className={`rounded-lg border px-3 py-2 text-xs transition ${damageTypes.includes(type) ? 'border-red-200 bg-red-50 font-medium text-[#d92319]' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{damageTypes.includes(type) && <CheckCircle2 className="mr-1 inline size-3.5" />}{type}</button>)}</div></div>
          <div><Label htmlFor="review-level">最终定损等级</Label><NativeSelect id="review-level" value={reviewLevel} onChange={(event) => setReviewLevel(event.target.value)} className="mt-2 w-full [&_select]:h-10"><NativeSelectOption value="1">一级 · 轻微破损</NativeSelectOption><NativeSelectOption value="2">二级 · 中度破损</NativeSelectOption><NativeSelectOption value="3">三级 · 严重破损</NativeSelectOption><NativeSelectOption value="4">四级 · 无法继续流通</NativeSelectOption></NativeSelect></div>
          <div><Label htmlFor="review-note">复核意见</Label><Textarea id="review-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="填写等级调整依据、内部商品情况或处理意见" className="mt-2 min-h-28 resize-none" /></div>
          {saved && <output className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700"><ShieldCheck className="size-4" />复核结果已保存，正在更新队列。</output>}
          <Button onClick={submitReview} disabled={submitting || damageTypes.length === 0 || saved} className="h-11 w-full bg-[#e1251b] hover:bg-[#c91f17]"><Save className="size-4" />{submitting ? '正在提交…' : saved ? '复核完成' : '确认并提交复核'}</Button>
        </div>
      </div>
    </section>
  );
}
