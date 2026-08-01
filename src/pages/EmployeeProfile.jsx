import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { compressImageFile, fileToUploadableBuffer, initials } from "../lib/utils";
import { PROPERTY_IMAGES_BUCKET } from "../lib/constants";
import { IconCamera, IconPhone } from "../components/ui/Icons";
import CommissionSection from "../components/profile/CommissionSection";
import ComplianceSection from "../components/profile/ComplianceSection";
import PersonalSection from "../components/profile/PersonalSection";
import EmploymentSection from "../components/profile/EmploymentSection";
import HierarchySection from "../components/profile/HierarchySection";
import ActivitySection from "../components/profile/ActivitySection";

export default function EmployeeProfile() {
  const { id } = useParams();
  const { isAdmin, employee: ownEmployee } = useAuth();
  const showToast = useToast();
  const [employee, setEmployee] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const photoInput = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function load() {
    const { data } = await sb.from("employees").select("*").eq("id", id).maybeSingle();
    if (!data) setNotFound(true);
    setEmployee(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isSelf = ownEmployee?.id === id;
  const canEdit = isSelf || isAdmin;

  async function handlePhotoUpload(file) {
    if (!file || !employee) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressImageFile(file);
      const buffer = await fileToUploadableBuffer(compressed);
      const ext = compressed.name.split(".").pop();
      const path = `employees/${employee.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage
        .from(PROPERTY_IMAGES_BUCKET)
        .upload(path, buffer, { cacheControl: "3600", upsert: false, contentType: compressed.type || `image/${ext}` });
      if (upErr) throw upErr;
      const { data: pub } = sb.storage.from(PROPERTY_IMAGES_BUCKET).getPublicUrl(path);
      const { error: updErr } = await sb.from("employees").update({ photo_url: pub.publicUrl }).eq("id", employee.id);
      if (updErr) throw updErr;
      showToast("Photo updated.");
      load();
    } catch (e) {
      showToast(e.message || "Photo upload failed.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  if (notFound) {
    return (
      <div className="page">
        <div className="card empty-state">
          <div className="empty-title">Profile not available</div>
          <p>This profile doesn't exist, or you don't have permission to view it.</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="page">
        <div className="center-loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 640, paddingBottom: 120 }}>
      {/* Identity */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ position: "relative", width: 88, height: 88, margin: "0 auto 14px" }}>
          <div className="avatar" style={{ width: 88, height: 88, fontSize: 26 }}>
            {employee.photo_url ? <img src={employee.photo_url} alt="" /> : initials(employee.full_name)}
          </div>
          {canEdit && (
            <>
              <input
                type="file"
                accept="image/*"
                ref={photoInput}
                style={{ display: "none" }}
                onChange={(e) => handlePhotoUpload(e.target.files[0])}
              />
              <button
                onClick={() => photoInput.current?.click()}
                disabled={uploadingPhoto}
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "var(--primary)",
                  border: "2px solid var(--background)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <IconCamera size={13} stroke="white" />
              </button>
            </>
          )}
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 26 }}>{employee.full_name}</div>
        <div style={{ fontSize: 13.5, color: "var(--muted-foreground)", marginTop: 2 }}>
          {employee.designation || "—"}
          {employee.employee_code ? ` · ${employee.employee_code}` : ""}
        </div>
      </div>

      <CommissionSection employee={employee} isAdmin={isAdmin} refreshKey={refreshKey} />
      <ComplianceSection employee={employee} isAdmin={isAdmin} canEdit={canEdit} refreshKey={refreshKey} />
      <PersonalSection employee={employee} canEdit={canEdit} onUpdated={() => { load(); setRefreshKey((k) => k + 1); }} />
      <EmploymentSection employee={employee} isAdmin={isAdmin} onUpdated={() => { load(); setRefreshKey((k) => k + 1); }} />
      <HierarchySection employee={employee} isAdmin={isAdmin} canEdit={canEdit} refreshKey={refreshKey} />
      <ActivitySection employee={employee} refreshKey={refreshKey} />

      {employee.mobile && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - 32px)",
            maxWidth: 420,
            background: "var(--card)",
            border: "1px solid color-mix(in oklab, var(--border) 60%, transparent)",
            borderRadius: 28,
            boxShadow: "var(--shadow-elev)",
            padding: 10,
            display: "flex",
            gap: 8,
          }}
        >
          <a
            href={`tel:${employee.mobile}`}
            className="btn btn-primary"
            style={{ flex: 1, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <IconPhone size={15} stroke="white" /> Call
          </a>
          <a
            href={`https://wa.me/91${employee.mobile.replace(/\D/g, "").slice(-10)}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ flex: 1, textDecoration: "none" }}
          >
            WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
