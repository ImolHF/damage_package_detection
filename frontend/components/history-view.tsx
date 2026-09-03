'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ClipboardClock,
  FileSearch,
  PackageSearch,
  Search,
  ShieldAlert,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { InspectionRecord, levelLabels, sceneLabels } from '@/lib/inspection-types';

type HistoryViewProps = {
  onReview: () => void;
  canReview?: boolean;
};

export function HistoryView({ onReview, canReview = true }: HistoryViewProps) {
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function loadRecords() {
    setLoading(true);
    try {
      const response = await fetch('/api/inspections');
      const data = (await response.json()) as { records: InspectionRecord[] };
      setRecords(data.records);
      setSelectedId((current) => current ?? data.records[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
    const timer = window.setInterval(() => void loadRecords(), 8000);
    return () => window.clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesQuery = !keyword || [record.taskNo, record.waybill, record.orderNo]
        .some((value) => value.toLowerCase().includes(keyword));
      const matchesStatus = status === 'all' || record.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [query, records, status]);

  const selected = records.find((record) => record.id === selectedId) ?? null;
  const reviewedCount = records.filter((record) => record.status === 'reviewed').length;
  const pendingCount = records.filter((record) => record.status === 'pending_review').length;

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:py-9">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">第三轮 · 记录管理</span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">历史检测记录</h1>
          <p className="mt-2 text-sm text-slate-500">集中查看 AI 检测、定损等级与人工复核状态。</p>
        </div>
        {canReview && <Button onClick={onReview} className="bg-[#e1251b] hover:bg-[#c91f17]">
          <ClipboardClock className="size-4" />前往复核中心
        </Button>}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: '全部任务', value: records.length, icon: PackageSearch, tone: 'bg-blue-50 text-blue-600' },
          { label: '待人工复核', value: pendingCount, icon: ShieldAlert, tone: 'bg-amber-50 text-amber-600' },
          { label: '已完成复核', value: reviewedCount, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' },
          { label: '三级及以上', value: records.filter((item) => (item.reviewLevel ?? item.aiLevel) >= 3).length, icon: FileSearch, tone: 'bg-red-50 text-[#e1251b]' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,.035)]">
              <div className={`grid size-10 place-items-center rounded-xl ${item.tone}`}><Icon className="size-[18px]" /></div>
              <div><p className="text-[11px] text-slate-400">{item.label}</p><p className="mt-0.5 text-xl font-bold text-slate-800">{loading ? '—' : item.value}</p></div>
            </div>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,.045)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索任务号、运单号或订单号" className="h-10 pl-9" />
          </div>
          <NativeSelect value={status} onChange={(event) => setStatus(event.target.value)} className="w-full sm:w-40 [&_select]:h-10">
            <NativeSelectOption value="all">全部状态</NativeSelectOption>
            <NativeSelectOption value="pending_review">待复核</NativeSelectOption>
            <NativeSelectOption value="reviewed">已复核</NativeSelectOption>
          </NativeSelect>
          <span className="text-xs text-slate-400 sm:ml-auto">共 {filtered.length} 条记录</span>
        </div>

        <div className="grid min-h-[450px] lg:grid-cols-[minmax(0,1.5fr)_380px]">
          <div className="overflow-x-auto border-b border-slate-100 lg:border-b-0 lg:border-r">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-medium text-slate-400">
                <tr>
                  <th className="px-5 py-3">检测任务</th><th className="px-4 py-3">破损类型</th><th className="px-4 py-3">定损等级</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">创建时间</th><th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((record) => (
                  <tr key={record.id} onClick={() => setSelectedId(record.id)} className={`cursor-pointer transition hover:bg-slate-50 ${selectedId === record.id ? 'bg-red-50/40' : ''}`}>
                    <td className="px-5 py-4"><p className="font-semibold text-slate-700">{record.taskNo}</p><p className="mt-1 text-[10px] text-slate-400">{record.waybill}</p></td>
                    <td className="px-4 py-4"><div className="flex flex-wrap gap-1">{record.damageTypes.map((type) => <Badge key={type} variant="outline" className="text-[10px]">{type}</Badge>)}</div></td>
                    <td className="px-4 py-4 font-medium text-slate-600">{levelLabels[record.reviewLevel ?? record.aiLevel]}</td>
                    <td className="px-4 py-4"><Badge className={record.status === 'reviewed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}>{record.status === 'reviewed' ? '已复核' : '待复核'}</Badge></td>
                    <td className="px-4 py-4 text-slate-400">{new Date(record.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-4"><ChevronRight className="size-4 text-slate-300" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filtered.length === 0 && <div className="grid h-72 place-items-center text-sm text-slate-400">没有符合条件的检测记录</div>}
          </div>

          <aside className="p-5">
            {selected ? (
              <div>
                <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] text-slate-400">任务详情</p><h2 className="mt-1 text-base font-semibold text-slate-800">{selected.taskNo}</h2></div>{selected.isDemo && <Badge variant="outline">演示数据</Badge>}</div>
                <div className="mt-5 overflow-hidden rounded-xl bg-[#0b1422]"><img src="/og.png" alt="包裹检测缩略图" className="aspect-video w-full object-cover opacity-90" /></div>
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-xs">
                  <div><dt className="text-slate-400">运单号</dt><dd className="mt-1 font-medium text-slate-700">{selected.waybill}</dd></div>
                  <div><dt className="text-slate-400">拍摄场景</dt><dd className="mt-1 font-medium text-slate-700">{sceneLabels[selected.scene]}</dd></div>
                  <div><dt className="text-slate-400">AI 置信度</dt><dd className="mt-1 font-medium text-slate-700">{selected.confidence}%</dd></div>
                  <div><dt className="text-slate-400">最终等级</dt><dd className="mt-1 font-medium text-slate-700">{levelLabels[selected.reviewLevel ?? selected.aiLevel]}</dd></div>
                </dl>
                {selected.reviewNote && <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500"><p className="mb-1 font-semibold text-slate-700">复核意见</p>{selected.reviewNote}</div>}
                {canReview && selected.status === 'pending_review' && <Button onClick={onReview} className="mt-5 h-10 w-full bg-[#e1251b] hover:bg-[#c91f17]">进入人工复核<ChevronRight className="size-4" /></Button>}
              </div>
            ) : <div className="grid h-full place-items-center text-sm text-slate-400">选择一条记录查看详情</div>}
          </aside>
        </div>
      </section>
    </main>
  );
}
