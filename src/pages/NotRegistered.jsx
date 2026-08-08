import { useAuth } from "../hooks/useAuth";

export default function NotRegistered() {
  const { user, signOut } = useAuth();

  return (
    <div className="max-w-md mx-auto px-5 py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-stone-50 flex items-center justify-center mx-auto mb-5">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C43868" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
          <path d="M18 4l3 3M21 4l-3 3" />
        </svg>
      </div>
      <div className="font-display text-2xl text-ink mb-2">You're not registered yet</div>
      <p className="text-sm text-ink/50 leading-relaxed mb-1.5">
        There's no team profile linked to <strong className="text-ink/70">{user?.email}</strong>.
      </p>
      <p className="text-sm text-ink/50 leading-relaxed mb-7">
        Ask your admin to add you from the Team page — once they do, signing in again will link you automatically.
      </p>
      <button onClick={signOut} className="text-xs font-medium text-ink/40 hover:text-ink/60 transition-colors">
        Sign out
      </button>
    </div>
  );
}
