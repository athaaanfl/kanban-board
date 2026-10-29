import { nanoid } from 'nanoid';

export async function POST() {
  const boardId = nanoid(10);
  return Response.json({ boardId });
}
