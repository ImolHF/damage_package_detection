import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const baseUrl = ((env as unknown as { MODEL_API_URL?: string }).MODEL_API_URL || process.env.MODEL_API_URL || '').replace(/\/$/, '');
  if (!baseUrl) return NextResponse.json({ error: '模型服务尚未配置' }, { status: 503 });
  const form = await request.formData();
  const response = await fetch(`${baseUrl}/api/detect`, { method: 'POST', body: form });
  const payload = await response.json() as { data?: { original_image_url?: string; result_image_url?: string } };
  if (payload.data?.original_image_url) payload.data.original_image_url = `${baseUrl}${payload.data.original_image_url}`;
  if (payload.data?.result_image_url) payload.data.result_image_url = `${baseUrl}${payload.data.result_image_url}`;
  return NextResponse.json(payload, { status: response.status });
}
