'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Gauge,
  Loader2,
  PackageSearch,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import { InspectionRecord, levelLabels } from '@/lib/inspection-types';

const trendConfig = {
  count: { label: '检测量', color: '#e1251b' },
} satisfies ChartConfig;

const levelConfig = {
  count: { label: '任务数', color: '#1e293b' },
} satisfies ChartConfig;

const damageColors = ['#e1251b', '#f59e0b', '#2563eb', '#8b5cf6', '#10b981', '#64748b'];

export function AnalyticsView() {
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadRecords() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/inspections');
      if (!response.ok) throw new Error('load_failed');
      const data = (await response.json()) as { records: InspectionRecord[] };
      setRecords(data.records);
    } catch {
      setError('暂时无法读取统计数据，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
  }, []);

  const stats = useMemo(() => {
    const reviewed = records.filter((item) => item.status === 'reviewed');
    const pending = records.length - reviewed.length;
    const highRisk = records.filter((item) => (item.reviewLevel ?? item.aiLevel) >= 3).length;
    const averageConfidence = records.length
      ? Math.round(records.reduce((sum, item) => sum + item.confidence, 0) / records.length)
      : 0;
    const consistent = reviewed.filter((item) => item.reviewLevel === item.aiLevel).length;
    const consistency = reviewed.length ? Math.round((consistent / reviewed.length) * 100) : 0;
    const completion = records.length ? Math.round((reviewed.length / records.length) * 100) : 0;
    return { reviewed: reviewed.length, pending, highRisk, averageConfidence, consistency, completion };
  }, [records]);

  const damageData = useMemo(() => {
    const counts = new Map<string, number>();
    records.forEach((record) => record.damageTypes.forEach((type) => counts.set(type, (counts.get(type) ?? 0) + 1)));
    return Array.from(counts, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [records]);

  const levelData = useMemo(() => [1, 2, 3, 4].map((level) => ({
    level: `${level}级`,
    count: records.filter((item) => (item.reviewLevel ?? item.aiLevel) === level).length,
  })), [records]);

  const trendData = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' });
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      return {
        date: formatter.format(date),
        count: records.filter((item) => {
          const createdAt = new Date(item.createdAt);
          return createdAt >= date && createdAt < next;
        }).length,
      };
    });
  }, [records]);

  function exportRecords() {
    const header = ['任务号', '运单号', '订单号', '破损类型', 'AI等级', '复核等级', '置信度', '状态', '复核人', '复核意见', '创建时间'];
    const rows = records.map((item) => [
      item.taskNo,
      item.waybill,
      item.orderNo,
      item.damageTypes.join('、'),
      item.aiLevel,
      item.reviewLevel ?? '',
      `${item.confidence}%`,
      item.status === 'reviewed' ? '已复核' : '待复核',
      item.reviewer,
      item.reviewNote,
      new Date(item.createdAt).toLocaleString('zh-CN'),
    ]);
    const escapeCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const csv = `\uFEFF${[header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `包裹智检记录_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-7 lg:py-9">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="rounded-md bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700">第四轮 · 运营分析</span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">包裹破损数据看板</h1>
          <p className="mt-2 text-sm text-slate-500">汇总检测质量、破损结构和人工复核效率，为运营决策提供依据。</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadRecords()} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />刷新数据
          </Button>
          <Button onClick={exportRecords} disabled={loading || records.length === 0} className="bg-[#e1251b] hover:bg-[#c91f17]">
            <Download className="size-4" />导出记录
          </Button>
        </div>
      </div>

      {error && <output className="mb-5 block rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</output>}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: '累计检测任务', value: records.length, suffix: '单', icon: PackageSearch, tone: 'bg-blue-50 text-blue-600' },
          { label: '高风险包裹', value: stats.highRisk, suffix: '单', icon: AlertTriangle, tone: 'bg-red-50 text-[#e1251b]' },
          { label: '平均识别置信度', value: stats.averageConfidence, suffix: '%', icon: Gauge, tone: 'bg-violet-50 text-violet-600' },
          { label: '待人工复核', value: stats.pending, suffix: '单', icon: ClipboardCheck, tone: 'bg-amber-50 text-amber-600' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,.035)] sm:p-5">
              <div className="flex items-start justify-between"><div className={`grid size-10 place-items-center rounded-xl ${item.tone}`}><Icon className="size-[18px]" /></div><Badge variant="outline" className="text-[9px]">实时</Badge></div>
              <p className="mt-5 text-[11px] text-slate-400">{item.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{loading ? '—' : item.value}<span className="ml-1 text-xs font-medium text-slate-400">{item.suffix}</span></p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,.045)] sm:p-6">
          <div className="flex items-start justify-between"><div><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Activity className="size-[18px] text-[#e1251b]" />近 7 日检测趋势</h2><p className="mt-1 text-xs text-slate-400">每日创建的检测任务数量</p></div><Badge className="bg-emerald-50 text-emerald-700">动态数据</Badge></div>
          <ChartContainer config={trendConfig} className="mt-5 h-[280px] w-full aspect-auto">
            <LineChart data={trendData} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
              <Line dataKey="count" type="monotone" stroke="var(--color-count)" strokeWidth={3} dot={{ r: 4, fill: '#e1251b', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ChartContainer>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,.045)] sm:p-6">
          <div><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><BarChart3 className="size-[18px] text-[#e1251b]" />破损类型分布</h2><p className="mt-1 text-xs text-slate-400">按识别标签累计统计</p></div>
          {loading ? <div className="grid h-[280px] place-items-center"><Loader2 className="size-5 animate-spin text-slate-400" /></div> : (
            <div className="mt-4 grid items-center gap-2 sm:grid-cols-[210px_1fr] xl:grid-cols-1 2xl:grid-cols-[210px_1fr]">
              <ChartContainer config={{}} className="mx-auto h-[210px] w-[210px] aspect-square">
                <PieChart><Pie data={damageData} dataKey="value" nameKey="name" innerRadius={53} outerRadius={82} paddingAngle={3}>{damageData.map((item, index) => <Cell key={item.name} fill={damageColors[index % damageColors.length]} />)}</Pie><ChartTooltip content={<ChartTooltipContent hideLabel />} /></PieChart>
              </ChartContainer>
              <div className="space-y-2">{damageData.map((item, index) => <div key={item.name} className="flex items-center gap-2 text-xs"><span className="size-2.5 rounded-sm" style={{ backgroundColor: damageColors[index % damageColors.length] }} /><span className="flex-1 text-slate-500">{item.name}</span><span className="font-semibold text-slate-700">{item.value}</span></div>)}</div>
            </div>
          )}
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,.045)] sm:p-6 lg:col-span-2">
          <div><h2 className="text-sm font-semibold text-slate-800">定损等级分布</h2><p className="mt-1 text-xs text-slate-400">优先采用人工复核后的最终等级</p></div>
          <ChartContainer config={levelConfig} className="mt-4 h-[220px] w-full aspect-auto">
            <BarChart data={levelData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="4 4" /><XAxis dataKey="level" tickLine={false} axisLine={false} tickMargin={8} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={22} /><ChartTooltip cursor={{ fill: 'rgba(148,163,184,.08)' }} content={<ChartTooltipContent />} /><Bar dataKey="count" fill="var(--color-count)" radius={[7, 7, 0, 0]} maxBarSize={52} /></BarChart>
          </ChartContainer>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-[#111b2d] p-5 text-white shadow-[0_10px_35px_rgba(15,23,42,.12)] sm:p-6">
          <div className="flex items-center gap-2"><Sparkles className="size-[18px] text-[#ff665e]" /><h2 className="text-sm font-semibold">运营质量摘要</h2></div>
          <div className="mt-6 space-y-6">
            <Progress value={stats.completion} className="gap-2 [&_[data-slot=progress-track]]:bg-white/10 [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-indicator]]:bg-emerald-400"><ProgressLabel className="text-xs text-slate-300">复核完成率</ProgressLabel><ProgressValue className="text-xs font-semibold text-white">{stats.completion}%</ProgressValue></Progress>
            <Progress value={stats.consistency} className="gap-2 [&_[data-slot=progress-track]]:bg-white/10 [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-indicator]]:bg-[#ff665e]"><ProgressLabel className="text-xs text-slate-300">AI 与人工一致率</ProgressLabel><ProgressValue className="text-xs font-semibold text-white">{stats.consistency}%</ProgressValue></Progress>
          </div>
          <div className="mt-6 rounded-xl bg-white/[.06] p-3.5 text-xs leading-5 text-slate-300"><CheckCircle2 className="mb-2 size-4 text-emerald-400" />当前共有 {stats.reviewed} 单完成复核，{stats.pending} 单仍需人工确认。高风险包裹建议优先处理并保留影像依据。</div>
          <div className="mt-4 text-[10px] text-slate-500">等级说明：{levelLabels[3]}及以上计入高风险</div>
        </section>
      </div>
    </main>
  );
}
