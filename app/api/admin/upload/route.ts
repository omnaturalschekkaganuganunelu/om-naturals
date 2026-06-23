import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = `data:${file.type};base64,${buffer.toString('base64')}`;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      return NextResponse.json({ error: 'Cloudinary credentials are not configured in environment.' }, { status: 500 });
    }

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    const bodyData = new FormData();
    bodyData.append('file', base64Image);
    bodyData.append('upload_preset', uploadPreset);

    const uploadRes = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: bodyData,
    });

    if (!uploadRes.ok) {
      const errData = await uploadRes.json();
      console.error('Cloudinary API error details:', errData);
      return NextResponse.json({ error: errData.error?.message || 'Failed to upload image' }, { status: 500 });
    }

    const uploadData = await uploadRes.json();
    return NextResponse.json({ url: uploadData.secure_url });
  } catch (err: any) {
    console.error('Upload API error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
