import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { useToast } from "../../hooks/useToast";

// Speak a note instead of typing it. Uses the phone's own speech recognition, with
// an English / Hindi switch (remembered). Where the browser has none — notably an
// app installed to the iPhone home screen — it says so and points to the keyboard's
// own microphone, which works in any text box.

const LANGS = [
  { id: "en-IN", label: "EN", name: "English" },
  { id: "hi-IN", label: "हिं", name: "Hindi" },
];
const STORE_KEY = "pinkcity-voice-lang";

const getSR = () => (typeof window === "undefined" ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null);
const isInstalledIPhone = () =>
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  (navigator.standalone === true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches));

// Join a spoken chunk onto what is already typed.
export const appendSpoken = (prev, chunk) => (prev && prev.trim() ? `${prev.trim()} ${chunk}` : chunk);

export default function VoiceMic({ onText }) {
  const showToast = useToast();
  const SR = getSR();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem(STORE_KEY) || "en-IN";
    } catch {
      return "en-IN";
    }
  });
  const recRef = useRef(null);
  const wantRef = useRef(false);
  const restartsRef = useRef(0);

  useEffect(() => () => {
    wantRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  function chooseLang(id) {
    setLang(id);
    try {
      localStorage.setItem(STORE_KEY, id);
    } catch {
      /* private mode: just don't remember it */
    }
    if (listening) stop(); // the language applies from the next time you start
  }

  function stop() {
    wantRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
    setListening(false);
    setInterim("");
  }

  function start() {
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText.trim()) onText(finalText.trim());
      setInterim(interimText);
      restartsRef.current = 0;
    };
    rec.onerror = (e) => {
      const err = e && e.error;
      if (err === "no-speech" || err === "aborted") return; // normal pauses
      wantRef.current = false;
      if (err === "not-allowed" || err === "service-not-allowed") showToast("The microphone is blocked. Allow it for this site in your browser settings.");
      else if (err === "network") showToast("Voice typing needs an internet connection.");
      else if (err === "audio-capture") showToast("No microphone was found.");
      else showToast("Voice typing stopped. Please try again.");
    };
    rec.onend = () => {
      // Phones often end a session after a pause. Quietly continue if you haven't pressed stop.
      if (wantRef.current && restartsRef.current < 6) {
        restartsRef.current += 1;
        try {
          rec.start();
          return;
        } catch {
          /* fall through and stop */
        }
      }
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    wantRef.current = true;
    restartsRef.current = 0;
    try {
      rec.start();
      setListening(true);
    } catch {
      wantRef.current = false;
      showToast("Couldn't start voice typing. Please try again.");
    }
  }

  if (!SR) {
    return (
      <p className="text-[11.5px] leading-relaxed text-ink/45">
        {isInstalledIPhone()
          ? "Voice typing isn't available inside the installed iPhone app. Tap the microphone on your keyboard to speak your note."
          : "Tip: tap the microphone on your keyboard to speak your note."}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => (listening ? stop() : start())}
        aria-pressed={listening}
        aria-label={listening ? "Stop voice typing" : "Speak your note"}
        className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition-all active:scale-95 ${
          listening ? "bg-red-500 text-white" : "border border-ink/10 bg-white text-crimson"
        }`}
      >
        {listening ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
        {listening ? "Stop" : "Speak"}
      </button>
      <div role="group" aria-label="Voice language" className="inline-flex rounded-full border border-ink/10 bg-white p-0.5">
        {LANGS.map((l) => (
          <button
            key={l.id}
            type="button"
            title={l.name}
            aria-label={`Dictate in ${l.name}`}
            aria-pressed={lang === l.id}
            onClick={() => chooseLang(l.id)}
            className={`min-h-[38px] min-w-[44px] rounded-full px-3 text-[12.5px] font-semibold ${lang === l.id ? "bg-crimson text-white" : "text-ink/55"}`}
          >
            {l.label}
          </button>
        ))}
      </div>
      {listening && (
        <span className="min-w-0 basis-full text-[12px] text-red-600" aria-live="polite">
          Listening… <span className="text-ink/50">{interim}</span>
        </span>
      )}
    </div>
  );
}
