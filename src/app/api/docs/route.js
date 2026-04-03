import spec from '@/lib/openapi';

export async function GET() {
  return Response.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
