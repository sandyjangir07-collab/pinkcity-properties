export default function PendingApprovalNotice() {
  return (
    <div className="page" style={{ maxWidth: 480 }}>
      <div className="card empty-state">
        <div className="empty-title">Profile Pending Review</div>
        <p>
          Your profile has been submitted and is waiting for an admin to approve it. You'll get access to the team
          directory as soon as it's reviewed.
        </p>
      </div>
    </div>
  );
}
