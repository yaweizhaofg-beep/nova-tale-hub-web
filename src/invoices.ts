import type { SpaceKind } from "./billing";

export interface InvoiceRequest {
  id: string;
  scope: SpaceKind;
  title: string;
  email: string;
  amount: number;
  orderIds: string[];
  createdAt: string;
  status: "待开具";
}

const requests: InvoiceRequest[] = [];

export function getInvoiceRequests(scope: SpaceKind): InvoiceRequest[] {
  return requests.filter(request => request.scope === scope);
}

export function submitInvoiceRequest(input: Omit<InvoiceRequest, "id" | "createdAt" | "status">):
  { ok: true } | { ok: false; reason: string } {
  if (!input.title.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return { ok: false, reason: "请填写发票抬头和有效邮箱" };
  }
  if (!input.orderIds.length || input.amount <= 0) return { ok: false, reason: "请先选择可开票订单" };
  if (requests.some(request => request.scope === input.scope && request.orderIds.some(id => input.orderIds.includes(id)))) {
    return { ok: false, reason: "所选订单已有发票申请，请到「我的发票」查看" };
  }
  requests.unshift({
    ...input, title: input.title.trim(), email: input.email.trim(), orderIds: [...input.orderIds],
    id: crypto.randomUUID(), createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    status: "待开具",
  });
  return { ok: true };
}
