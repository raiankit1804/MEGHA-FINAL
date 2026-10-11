'use client';

import React from 'react';
import DownloadPage from '@/components/DownloadPage';
import { useRouter } from 'next/navigation';

export default function DownloadRoutePage() {
  const router = useRouter();

  return (
    <DownloadPage
      onClose={() => {
        router.push('/');
      }}
    />
  );
}
