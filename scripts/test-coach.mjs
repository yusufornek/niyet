// E2E test: replicates the sendChatMessage resolver logic against real DB + Gemini.
// Proves: agent loop works, ChatMessage rows persist (USER + TOOL + ASSISTANT),
// session token counter increments, and multi-turn history flows.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (!m) continue;
  let val = m[2];
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  if (!process.env[m[1]]) process.env[m[1]] = val;
}

const { prisma } = await import('@niyet/db');
const { runSavingCoach } = await import('@niyet/ai');

async function sendMessage({ userId, message, sessionId = null, goalContext = null }) {
  let session;
  if (sessionId) {
    session = await prisma.chatSession.findFirst({ where: { id: sessionId, userId } });
  } else {
    session = await prisma.chatSession.create({
      data: {
        userId,
        title: message.length > 60 ? message.slice(0, 60) + '…' : message,
        goalContext,
        geminiModel: 'pending',
      },
    });
  }

  const historyMsgs = await prisma.chatMessage.findMany({
    where: { sessionId: session.id, role: { in: ['USER', 'ASSISTANT'] } },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });
  const history = historyMsgs.map((m) => ({ role: m.role, content: m.content }));

  await prisma.chatMessage.create({
    data: { sessionId: session.id, role: 'USER', content: message },
  });

  const result = await runSavingCoach({
    userId,
    userMessage: message,
    history,
    goalContext: session.goalContext,
  });

  for (const tc of result.toolCalls) {
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'TOOL',
        content: typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result),
        toolName: tc.name,
        toolPayload: { args: tc.args, result: tc.result },
      },
    });
  }

  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: 'ASSISTANT',
      content: result.reply,
      tokensUsed: result.totalTokens,
      toolPayload: result.recommendation ? { recommendation: result.recommendation } : undefined,
    },
  });

  await prisma.chatSession.update({
    where: { id: session.id },
    data: {
      geminiModel: result.geminiModel,
      totalTokens: { increment: result.totalTokens },
    },
  });

  return { sessionId: session.id, result };
}

const user = await prisma.user.findFirst({ select: { id: true, email: true } });
console.log('Test user:', user.email);

// Turn 1
console.log('\n--- Turn 1: cold start ---');
const t1 = Date.now();
const r1 = await sendMessage({
  userId: user.id,
  message: 'Bu ay nasıl gidiyorum? En çok hangi kategoride para harcıyorum?',
});
console.log('  duration:', Date.now() - t1, 'ms');
console.log('  stubMode:', !!r1.result.stubMode, '| tokens:', r1.result.totalTokens);
console.log('  tools:', r1.result.toolCalls.map((t) => t.name).join(', '));
console.log('  reply:', r1.result.reply.slice(0, 180) + (r1.result.reply.length > 180 ? '…' : ''));

// Turn 2 — same session, follow-up
console.log('\n--- Turn 2: follow-up in same session ---');
const t2 = Date.now();
const r2 = await sendMessage({
  userId: user.id,
  sessionId: r1.sessionId,
  message: 'Aboneliklerimden hangisini iptal etmem makul, kısa cevap ver.',
});
console.log('  duration:', Date.now() - t2, 'ms');
console.log('  stubMode:', !!r2.result.stubMode, '| tokens:', r2.result.totalTokens);
console.log('  tools:', r2.result.toolCalls.map((t) => t.name).join(', '));
console.log('  recommendation:', r2.result.recommendation);
console.log('  reply:', r2.result.reply.slice(0, 220) + (r2.result.reply.length > 220 ? '…' : ''));

// Verify persistence
const session = await prisma.chatSession.findUnique({
  where: { id: r1.sessionId },
  include: { messages: { orderBy: { createdAt: 'asc' } } },
});

console.log('\n--- DB verification ---');
console.log('  Session id:', session.id);
console.log('  Session totalTokens:', session.totalTokens);
console.log('  Session geminiModel:', session.geminiModel);
console.log('  Message count:', session.messages.length);
const byRole = session.messages.reduce((acc, m) => {
  acc[m.role] = (acc[m.role] ?? 0) + 1;
  return acc;
}, {});
console.log('  By role:', byRole);
console.log('  Tools logged:', session.messages.filter((m) => m.role === 'TOOL').map((m) => m.toolName));
const recommendations = session.messages
  .filter((m) => m.role === 'ASSISTANT')
  .map((m) => m.toolPayload?.recommendation?.actionType ?? '(none)');
console.log('  Recommendations on assistant msgs:', recommendations);

// Cleanup so the next dev demo starts fresh
await prisma.chatSession.delete({ where: { id: session.id } });
console.log('\n✓ Session cleaned up.');

await prisma.$disconnect();
