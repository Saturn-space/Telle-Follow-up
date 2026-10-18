'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Copy, Video } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function TeleconsultDemoRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { role, isAuthenticated, isLoading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const roomCode = typeof params.roomCode === 'string' ? params.roomCode : '';
  const validRoomCode = /^[a-fA-F0-9]{32}$/.test(roomCode);
  const domain = (process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  const roomName = `teleflow-demo-${roomCode.toLowerCase()}`;
  const meetingUrl = `https://${domain}/${roomName}#config.prejoinPageEnabled=false&interfaceConfig.SHOW_JITSI_WATERMARK=false`;
  const canJoin = !isLoading && isAuthenticated && (role === 'PATIENT' || role === 'CLINICIAN') && validRoomCode;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (role !== 'PATIENT' && role !== 'CLINICIAN') {
      router.replace(role === 'ADMIN' ? '/admin/dashboard' : '/coordinator/dashboard');
      return;
    }
    if (!validRoomCode) {
      router.replace('/follow-ups/my-appointments');
      return;
    }
  }, [isLoading, isAuthenticated, role, validRoomCode, router]);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyError(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  };

  if (isLoading || !canJoin) {
    return <div className="p-8 text-sm text-slate-600">Checking video room access…</div>;
  }

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#DCE5F5] bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700"><Video className="h-6 w-6" /></div>
          <div>
            <h1 className="text-lg font-bold text-[#0E1C30]">Live video consultation demo</h1>
            <p className="text-xs text-slate-500">Signed in as {role === 'CLINICIAN' ? 'clinician' : 'patient'} · room {roomCode.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void copyInvite()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Invite copied' : 'Copy invite'}
          </button>
          <button type="button" onClick={() => router.push('/follow-ups/my-appointments')} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">
            <ArrowLeft className="h-4 w-4" /> Leave demo
          </button>
        </div>
      </header>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
        This is a demo room for testing video with two accounts. Share the invite with the other signed-in patient or clinician. Do not enter patient information; this room is not attached to an appointment and does not save notes.
      </div>
      {copyError && <p role="status" className="text-xs text-slate-600">Clipboard access was blocked. You can copy the room invitation from your browser address bar.</p>}

      <div className="aspect-video min-h-[420px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-lg">
        <iframe
          key={roomName}
          src={meetingUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full min-h-[420px] w-full border-0"
          title="Live video consultation demo room"
        />
      </div>
    </main>
  );
}
