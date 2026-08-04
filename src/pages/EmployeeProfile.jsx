import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { compressImageFile, fileToUploadableBuffer, initials } from "../lib/utils";
import { PROPERTY_IMAGES_BUCKET } from "../lib/constants";
import CommissionSection from "../components/profile/CommissionSection";
import ComplianceSection from "../components/profile/ComplianceSection";
import PersonalSection from "../components/profile/PersonalSection";
import EmploymentSection from "../components/profile/EmploymentSection";
import HierarchySection from "../components/profile/HierarchySection";
import ActivitySection from "../components/profile/ActivitySection";
import { BrandedLoader } from "../components/ui/BrandedLoader";

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
      <div className="max-w-2xl mx-auto px-5 py-20 text-center">
        <div className="font-display text-2xl text-ink mb-2">Profile not available</div>
        <p className="text-ink/50 text-sm">This profile doesn&apos;t exist, or you don&apos;t have permission to view it.</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-20 flex justify-center">
        <BrandedLoader size={24} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 pt-10 pb-16">
      <div className="text-center mb-6">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="w-24 h-24 rounded-[32px] bg-stone-50 text-stone-600 flex items-center justify-center text-2xl font-medium overflow-hidden shadow-lift">
            {employee.photo_url ? <img src={employee.photo_url} alt="" className="w-full h-full object-cover" /> : initials(employee.full_name)}
          </div>
          {canEdit && (
            <>
              <input type="file" accept="image/*" ref={photoInput} className="hidden" onChange={(e) => handlePhotoUpload(e.target.files[0])} />
              <button
                onClick={() => photoInput.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-stone-600 border-2 border-sand flex items-center justify-center"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </button>
            </>
          )}
        </div>
        <div className="font-display text-[28px] font-medium leading-tight text-ink">{employee.full_name}</div>
        <div className="text-[13px] text-ink/45 mt-1">
          {employee.designation || "—"}
          {employee.employee_code ? ` · ${employee.employee_code}` : ""}
        </div>
      </div>

      <div className="space-y-4">
        <CommissionSection employee={employee} isAdmin={isAdmin} refreshKey={refreshKey} />
        <ComplianceSection employee={employee} isAdmin={isAdmin} canEdit={canEdit} refreshKey={refreshKey} />
        <PersonalSection employee={employee} canEdit={canEdit} onUpdated={() => { load(); setRefreshKey((k) => k + 1); }} />
        <EmploymentSection employee={employee} isAdmin={isAdmin} onUpdated={() => { load(); setRefreshKey((k) => k + 1); }} />
        <HierarchySection employee={employee} isAdmin={isAdmin} canEdit={canEdit} refreshKey={refreshKey} />
        <ActivitySection employee={employee} refreshKey={refreshKey} />
      </div>
    </div>
  );
}
