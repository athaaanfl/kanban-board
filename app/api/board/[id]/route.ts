import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await redis.get(`board:${id}`);
    
    if (!data) {
      return Response.json({ error: 'Board not found' }, { status: 404 });
    }
    
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: 'Failed to load board' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    await redis.set(`board:${id}`, JSON.stringify(body));
    
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Failed to save board' }, { status: 500 });
  }
}
