"use client";

import { AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface AlreadyClientStateProps {
  message: string;
  redirectTo?: string;
  redirectLabel?: string;
  onBack?: () => void;
}

export function AlreadyClientState({ 
  message, 
  redirectTo,
  redirectLabel ,
  onBack 
}: AlreadyClientStateProps) {
  const router = useRouter();

  const handleRedirect = () => {
    if (redirectTo) {
      router.push(redirectTo);
    }
  };

  return (
    <div style={{ ["--lp-delay" as string]: "0.08s" }} className="lp-enter-up relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -bottom-6 h-24 rounded-[50%] bg-amber-400/20 blur-[60px]"
      />
      <div className="relative overflow-hidden rounded-[26px] border border-amber-200/70 bg-white/95 p-6 shadow-[0_40px_100px_-50px_rgba(30,58,138,0.6)] backdrop-blur-xl sm:p-7">
        <div className="flex gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200/80">
            <AlertCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 pt-1">
            <h2 className="text-[17px] font-semibold leading-snug text-slate-900">{message}</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">
              Vous pouvez suivre l&apos;état de votre demande depuis le bouton ci-dessous.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row-reverse">
          <button
            type="button"
            onClick={handleRedirect}
            className="group/cta relative inline-flex h-13 flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_16px_40px_-16px_rgba(53,99,233,1)] transition-transform duration-300 hover:-translate-y-0.5"
          >
            {redirectLabel}
            <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover/cta:translate-x-1" />
          </button>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-13 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-[15px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
