export type InspectionRecord = {
  id: string;
  taskNo: string;
  waybill: string;
  orderNo: string;
  scene: string;
  damageTypes: string[];
  confidence: number;
  aiLevel: number;
  reviewLevel: number | null;
  reviewNote: string;
  reviewer: string;
  status: 'pending_review' | 'reviewed';
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  ownerUserId: string;
  inferenceMs: number;
};

export const sceneLabels: Record<string, string> = {
  warehouse: '仓库收货台',
  courier: '配送站点',
  customer: '用户退货现场',
  other: '其他场景',
};

export const levelLabels: Record<number, string> = {
  1: '一级 · 轻微破损',
  2: '二级 · 中度破损',
  3: '三级 · 严重破损',
  4: '四级 · 无法流通',
};
