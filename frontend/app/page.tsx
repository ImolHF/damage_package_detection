import { ArrowRight, PackageCheck, ShieldCheck, UserRound } from 'lucide-react';
import { chatGPTSignInPath, getChatGPTUser } from '@/app/chatgpt-auth';
import { getAssignedRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getChatGPTUser();
  const assignedRole = user ? await getAssignedRole(user.userId) : null;
  const userHref = user ? '/enter?role=user' : chatGPTSignInPath('/enter?role=user');
  const staffHref = user ? '/enter?role=staff' : chatGPTSignInPath('/enter?role=staff');
  return (
    <main className="min-h-screen bg-[#f4f6f9] px-5 py-10 text-slate-900 sm:grid sm:place-items-center">
      <div className="w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,.12)] lg:grid lg:grid-cols-[.82fr_1.18fr]">
        <section className="relative overflow-hidden bg-[#111b2d] p-8 text-white sm:p-12">
          <div className="absolute -right-24 -top-24 size-64 rounded-full bg-[#e1251b]/20 blur-3xl" />
          <div className="relative">
            <div className="grid size-12 place-items-center rounded-2xl bg-[#e1251b]"><PackageCheck className="size-6" /></div>
            <p className="mt-7 text-sm font-semibold tracking-[.18em] text-red-300">包裹智检</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight">退货包裹破损<br />AI 识别与智能定损</h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">请选择你的身份进入对应工作区。身份首次确认后会自动绑定，两个工作区互不开放。</p>
            <div className="mt-10 flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="size-4 text-emerald-400" />登录由 ChatGPT 安全验证</div>
          </div>
        </section>
        <section className="p-7 sm:p-12">
          <p className="text-sm font-medium text-slate-400">欢迎使用</p><h2 className="mt-2 text-2xl font-bold">选择登录身份</h2>
          {user && <p className="mt-2 text-sm text-slate-500">当前账号：{user.displayName}{assignedRole ? ` · 已绑定${assignedRole === 'staff' ? '工作人员' : '使用者'}` : ''}</p>}
          <div className="mt-8 grid gap-4">
            <a target="_top" href={assignedRole === 'staff' ? '/staff' : userHref} className={`group flex items-center gap-4 rounded-2xl border p-5 transition ${assignedRole === 'staff' ? 'pointer-events-none opacity-45' : 'border-slate-200 hover:border-red-200 hover:bg-red-50/40'}`}>
              <span className="grid size-12 place-items-center rounded-xl bg-blue-50 text-blue-600"><UserRound className="size-5" /></span><span className="flex-1"><strong className="block text-base">我是使用者</strong><span className="mt-1 block text-sm text-slate-500">上传包裹照片，提交检测并查看自己的结果</span></span><ArrowRight className="size-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#e1251b]" />
            </a>
            <a target="_top" href={assignedRole === 'user' ? '/user' : staffHref} className={`group flex items-center gap-4 rounded-2xl border p-5 transition ${assignedRole === 'user' ? 'pointer-events-none opacity-45' : 'border-slate-200 hover:border-red-200 hover:bg-red-50/40'}`}>
              <span className="grid size-12 place-items-center rounded-xl bg-red-50 text-[#e1251b]"><ShieldCheck className="size-5" /></span><span className="flex-1"><strong className="block text-base">我是工作人员</strong><span className="mt-1 block text-sm text-slate-500">处理复核任务，查看记录和模型监控看板</span></span><ArrowRight className="size-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#e1251b]" />
            </a>
          </div>
          <p className="mt-6 text-xs leading-5 text-slate-400">当前为项目演示版。首次选择会绑定账号身份；如需更改，请由项目管理员处理。</p>
        </section>
      </div>
    </main>
  );
}
