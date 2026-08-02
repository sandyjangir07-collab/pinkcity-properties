export default function PendingApprovalNotice() {
  return (
    <div className="max-w-md mx-auto px-5 py-24 text-center">
      <div className="bg-white rounded-3xl p-10">
        <div className="font-display text-xl text-ink mb-2">Profile Pending Review</div>
        <p className="text-sm text-ink/50 leading-relaxed">
          Your profile has been submitted and is waiting for an admin to approve it. You&apos;ll get access to the team
          directory as soon as it&apos;s reviewed.
        </p>
      </div>
    </div>
  );
}
