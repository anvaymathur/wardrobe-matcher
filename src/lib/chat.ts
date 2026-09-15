import { prisma } from "@/lib/prisma";
import { messageText, type StylistUIMessage } from "@/lib/ai/stylistChat";

export type ChatThreadSummary = { id: string; title: string; updatedAt: Date };

/** The user's most recent chats, newest first. */
export async function listThreads(userId: string, take = 30): Promise<ChatThreadSummary[]> {
  const rows = await prisma.chatThread.findMany({
    where: { userId, title: { not: null } },
    orderBy: { updatedAt: "desc" },
    take,
    select: { id: true, title: true, updatedAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.title ?? "New chat", updatedAt: r.updatedAt }));
}

export async function createThread(userId: string): Promise<string> {
  const thread = await prisma.chatThread.create({ data: { userId }, select: { id: true } });
  return thread.id;
}

/** A thread with its messages in order — or null if it isn't this user's. */
export async function getThread(userId: string, threadId: string) {
  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, userId },
    include: { messages: { orderBy: { position: "asc" } } },
  });
  if (!thread) return null;
  const messages: StylistUIMessage[] = [];
  for (const row of thread.messages) {
    try {
      messages.push(JSON.parse(row.data) as StylistUIMessage);
    } catch {
      // A corrupt row shouldn't take down the whole chat.
    }
  }
  return {
    id: thread.id,
    title: thread.title,
    summary: thread.summary,
    summarizedCount: thread.summarizedCount,
    messages,
  };
}

/** Append a message at `position`; the first user message becomes the title. */
export async function appendMessage(threadId: string, position: number, message: StylistUIMessage) {
  await prisma.chatMessage.create({
    data: { threadId, position, role: message.role, data: JSON.stringify(message) },
  });
  const title = position === 0 && message.role === "user" ? messageText(message).slice(0, 60) || "New chat" : undefined;
  await prisma.chatThread.update({
    where: { id: threadId },
    data: title ? { title } : { updatedAt: new Date() },
  });
}

export async function updateSummary(threadId: string, summary: string, summarizedCount: number) {
  await prisma.chatThread.update({ where: { id: threadId }, data: { summary, summarizedCount } });
}

export async function deleteThread(userId: string, threadId: string) {
  await prisma.chatThread.deleteMany({ where: { id: threadId, userId } });
}
