"use client"

import Link from "next/link"

const ZIZU_AVATAR = "https://cdn.zmobiles.pk/uploads/2026/06/7551268b-d645-4cbc-a802-ae3d94f96df4-aoFCInV_.webp"

export default function NotFoundVariants() {
  const channelUrl = "https://whatsapp.com/channel/0029Vb8N78aAzNbxxZXzdo10"

  return (
    <>
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-16 sm:py-24 relative overflow-hidden bg-bg">
        {/* Animated ambient background sparks */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
          <div className="absolute top-[15%] left-[15%] w-2 h-2 bg-primary rounded-full animate-ping" />
          <div className="absolute top-[45%] right-[25%] w-2.5 h-2.5 bg-accent rounded-full animate-ping [animation-delay:1.5s]" />
          <div className="absolute bottom-[25%] left-[40%] w-1.5 h-1.5 bg-primary rounded-full animate-ping [animation-delay:0.8s]" />
        </div>

        <div className="max-w-md w-full text-center relative z-10 flex flex-col items-center">
          
          {/* Big Creative 404 Layout with Zizu as the '0' */}
          <div className="flex items-center justify-center gap-3.5 sm:gap-6 select-none font-sans tracking-tight">
            {/* First "4" */}
            <span className="text-[110px] sm:text-[160px] font-black text-ink leading-none opacity-90">
              4
            </span>

            {/* Zizu Floating Astronaut Illustration (acting as the "0") */}
            <div className="relative w-28 h-28 sm:w-40 sm:h-40 flex items-center justify-center">
              {/* Glowing orbital ring */}
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20 animate-[spin_24s_linear_infinite]" />
              <div 
                className="absolute w-[85%] h-[85%] rounded-full bg-gradient-to-tr from-primary/15 via-accent/5 to-transparent blur-xl"
                style={{ animation: "waFloat 4s ease-in-out infinite" }}
              />

              {/* Float wrapper */}
              <div 
                className="relative w-[75%] h-[75%]"
                style={{ animation: "waFloat 5s ease-in-out infinite" }}
              >
                {/* Zizu avatar with astronaut helmet shape */}
                <div className="w-full h-full rounded-full relative overflow-hidden p-1 bg-surface border-2 border-line shadow-2xl">
                  <img
                    src={ZIZU_AVATAR}
                    alt="Zizu"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Second "4" */}
            <span className="text-[110px] sm:text-[160px] font-black text-ink leading-none opacity-90">
              4
            </span>
          </div>

          {/* Heading and text info */}
          <div className="mt-8 space-y-3.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              Oops! Zizu is lost in space... 🚀
            </h1>
            <p className="text-xs sm:text-sm leading-relaxed text-ink/65 font-medium max-w-sm mx-auto">
              We couldn't find the page you were looking for. It might have been moved, renamed, or no longer exists.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto px-4 sm:px-0">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-sm bg-primary text-primary-fg hover:bg-primary/95"
            >
              <i className="ph-fill ph-house text-sm" />
              Go to Homepage
            </Link>
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full text-xs font-bold uppercase tracking-wider transition-all active:scale-95 border border-line bg-surface text-ink hover:bg-bg"
            >
              <i className="ph-fill ph-whatsapp-logo text-sm text-[#25D366]" />
              WhatsApp Channel
            </a>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes waFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </>
  )
}
