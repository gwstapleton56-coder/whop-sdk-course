"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { slugifyKey } from "@/lib/slug";
import { AVAILABLE_ICONS, type IconValue } from "@/lib/available-icons";
import { suggestIconForNiche } from "@/lib/niche-icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MessageSquare, FileText, Link as LinkIcon, Video, File, Upload, X, Plus, Settings, Sparkles, BookOpen, Trash2, Edit2 } from "lucide-react";
import {
  TrendingUp,
  Dumbbell,
  Scissors,
  ShoppingBag,
  HeartPulse,
  Sparkles as SparklesIcon,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  TrendingUp,
  Dumbbell,
  Scissors,
  ShoppingBag,
  HeartPulse,
  Sparkles: SparklesIcon,
};

type CreatorSettings = {
  experienceId: string;
  globalContext?: string;
  resources?: Resource[];
  updatedAt?: string;
};

type Preset = {
  id: string;
  experienceId: string;
  key: string;
  label: string;
  aiContext: string | null;
  icon: string | null;
  enabled: boolean;
  sortOrder: number;
};

type Resource = {
  id: string;
  type: "pdf" | "link" | "doc" | "video";
  title: string;
  url: string;
  description?: string;
};

type CoachSettings = {
  id: string;
  experienceId: string;
  coachName?: string | null;
  systemPrompt: string;
  communityContext?: string | null;
  resources?: Resource[];
  tone: string;
  enableQuiz: boolean;
  enablePlan: boolean;
  enableRoleplay: boolean;
} | null;

export function CreatorAdminClient({
  experienceId,
  initialSettings,
  initialPresets = [],
  initialCoachSettings = null,
  isOwner = false,
}: {
  experienceId: string;
  initialSettings: CreatorSettings | null;
  initialPresets?: Preset[];
  initialCoachSettings?: CoachSettings | null;
  isOwner?: boolean;
}) {
  const router = useRouter();
  const [presets, setPresets] = useState<Preset[]>(initialPresets);
  const [adding, setAdding] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [resourcesStatus, setResourcesStatus] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"practice" | "coach">("practice");
  
  // Practice Area Resources
  const [practiceResources, setPracticeResources] = useState<Resource[]>([]);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [newResource, setNewResource] = useState<Partial<Resource>>({ type: "link" });
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [loadingResources, setLoadingResources] = useState(true);
  
  // Global context state
  const [globalContext, setGlobalContext] = useState(
    initialSettings?.globalContext ?? ""
  );

  // Coach AI Settings state
  const [coachName, setCoachName] = useState(
    initialCoachSettings?.coachName || "AI Coach",
  );
  const [systemPrompt, setSystemPrompt] = useState(
    initialCoachSettings?.systemPrompt || "You are a strict but helpful coach...",
  );
  const [communityContext, setCommunityContext] = useState(
    initialCoachSettings?.communityContext || "",
  );
  const [tone, setTone] = useState(initialCoachSettings?.tone || "direct");
  const [enableQuiz, setEnableQuiz] = useState(initialCoachSettings?.enableQuiz ?? true);
  const [enablePlan, setEnablePlan] = useState(initialCoachSettings?.enablePlan ?? true);
  const [enableRoleplay, setEnableRoleplay] = useState(initialCoachSettings?.enableRoleplay ?? true);
  const [coachSaving, setCoachSaving] = useState(false);
  const [coachSaved, setCoachSaved] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  // Coach Resources
  const [coachResources, setCoachResources] = useState<Resource[]>([]);
  const [showCoachResourceModal, setShowCoachResourceModal] = useState(false);
  const [newCoachResource, setNewCoachResource] = useState<Partial<Resource>>({ type: "link" });
  const [isDraggingCoach, setIsDraggingCoach] = useState(false);
  const [loadingCoachResources, setLoadingCoachResources] = useState(true);

  // Load practice resources on mount
  useEffect(() => {
    async function loadResources() {
      try {
        setLoadingResources(true);
        const res = await fetch(`/api/knowledge-resources?experienceId=${encodeURIComponent(experienceId)}&scope=practice`);
        if (res.ok) {
          const data = await res.json();
          if (data.resources && Array.isArray(data.resources)) {
            // Convert database format to Resource format
            const resources: Resource[] = data.resources.map((r: any) => ({
              id: r.id,
              type: r.type,
              title: r.title,
              url: r.url,
              description: r.description || undefined,
            }));
            setPracticeResources(resources);
            console.log("✅ Loaded practice resources from API:", resources.length, "items");
          }
        } else {
          console.error("Failed to load practice resources:", res.status);
        }
      } catch (e) {
        console.error("Failed to load practice resources:", e);
      } finally {
        setLoadingResources(false);
      }
    }
    loadResources();
  }, [experienceId]);

  // Load coach resources on mount
  useEffect(() => {
    async function loadCoachResources() {
      try {
        setLoadingCoachResources(true);
        const res = await fetch(`/api/knowledge-resources?experienceId=${encodeURIComponent(experienceId)}&scope=coach`);
        if (res.ok) {
          const data = await res.json();
          if (data.resources && Array.isArray(data.resources)) {
            // Convert database format to Resource format
            const resources: Resource[] = data.resources.map((r: any) => ({
              id: r.id,
              type: r.type,
              title: r.title,
              url: r.url,
              description: r.description || undefined,
            }));
            setCoachResources(resources);
            console.log("✅ Loaded coach resources from API:", resources.length, "items");
          }
        } else {
          console.error("Failed to load coach resources:", res.status);
        }
      } catch (e) {
        console.error("Failed to load coach resources:", e);
      } finally {
        setLoadingCoachResources(false);
      }
    }
    loadCoachResources();
  }, [experienceId]);

  // Add preset modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAiContext, setNewAiContext] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<IconValue | "">("");
  
  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<string | null>(null);

  const customRow = useMemo(
    () => ({
      key: "custom",
      label: "Custom",
      aiContext: "Adapt to the user-provided niche and keep examples aligned.",
    }),
    []
  );

  async function refresh() {
    const res = await fetch(`/api/experiences/${experienceId}/admin/niche-presets`, {
      cache: "no-store",
    });
    const data = await res.json();
    setPresets(data.presets ?? []);
  }

  async function addPreset() {
    if (!newLabel.trim()) {
      setError("Label is required");
      return;
    }

    setError(null);
    setAdding(true);

    const label = newLabel.trim();
    const key = slugifyKey(label);
    const aiContext = newAiContext.trim();
    const icon = selectedIcon || suggestIconForNiche(label, key);

    const res = await fetch(`/api/experiences/${experienceId}/admin/niche-presets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, label, aiContext, icon, enabled: true }),
    });

    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch {}

    if (!res.ok) {
      setError(data?.error || text || `Failed to add preset (status ${res.status})`);
      setAdding(false);
      return;
    }

    setNewLabel("");
    setNewAiContext("");
    setSelectedIcon("");
    setShowAddModal(false);
    await refresh();
    setAdding(false);
  }

  async function restoreDefaults() {
    setError(null);
    setRestoring(true);
    try {
      const res = await fetch(
        `/api/experiences/${experienceId}/admin/niche-presets/restore`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Restore failed (${res.status})`);
      }
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to restore defaults");
    } finally {
      setRestoring(false);
    }
  }

  function handleDeleteClick(key: string) {
    setPresetToDelete(key);
    setDeleteConfirmOpen(true);
  }

  async function deletePreset() {
    if (!presetToDelete) return;
    
    setError(null);
    const key = presetToDelete;
    setDeleteConfirmOpen(false);
    setPresetToDelete(null);

    const res = await fetch(
      `/api/experiences/${experienceId}/admin/niche-presets?key=${encodeURIComponent(key)}`,
      { method: "DELETE" }
    );
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error || "Failed to delete preset");
      return;
    }

    await refresh();
  }

  async function saveGlobalContext() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/creator/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          experienceId, 
          globalContext,
          // No longer sending resources here - they're stored in KnowledgeResource table
        }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setStatus("Saved ✅");
    } catch (e: any) {
      setStatus(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // Create a new practice resource via API
  async function createPracticeResource(resource: Omit<Resource, "id">) {
    try {
      const payload: any = {
        experienceId,
        scope: "practice",
        type: resource.type,
        title: resource.title,
        url: resource.url,
      };
      if (resource.description) {
        payload.description = resource.description;
      }
      
      console.log("[createPracticeResource] Sending payload:", payload);
      
      const res = await fetch("/api/knowledge-resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to create resource (${res.status})`);
      }

      const data = await res.json();
      return data.resource;
    } catch (e: any) {
      console.error("Failed to create practice resource:", e);
      throw e;
    }
  }

  // Delete a practice resource via API
  async function deletePracticeResource(resourceId: string) {
    try {
      const res = await fetch(`/api/knowledge-resources/${resourceId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to delete resource (${res.status})`);
      }
    } catch (e: any) {
      console.error("Failed to delete practice resource:", e);
      throw e;
    }
  }

  // Create a new coach resource via API
  async function createCoachResource(resource: Omit<Resource, "id">) {
    try {
      const res = await fetch("/api/knowledge-resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceId,
          scope: "coach",
          type: resource.type,
          title: resource.title,
          url: resource.url,
          description: resource.description,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to create resource (${res.status})`);
      }

      const data = await res.json();
      return data.resource;
    } catch (e: any) {
      console.error("Failed to create coach resource:", e);
      throw e;
    }
  }

  // Delete a coach resource via API
  async function deleteCoachResource(resourceId: string) {
    try {
      const res = await fetch(`/api/knowledge-resources/${resourceId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to delete resource (${res.status})`);
      }
    } catch (e: any) {
      console.error("Failed to delete coach resource:", e);
      throw e;
    }
  }

  async function handleAddResource() {
    if (!newResource.title || !newResource.url) {
      setError("Title and URL are required");
      return;
    }

    try {
      setError(null);
      setResourcesStatus(null);

      const savedResource = await createPracticeResource({
        type: newResource.type || "link",
        title: newResource.title,
        url: newResource.url,
        description: newResource.description,
      });

      // Update state with the saved resource (includes the ID from DB)
      setPracticeResources([...practiceResources, {
        id: savedResource.id,
        type: savedResource.type,
        title: savedResource.title,
        url: savedResource.url,
        description: savedResource.description,
      }]);

      setNewResource({ type: "link" });
      setShowResourceModal(false);
      setResourcesStatus("Resource added ✅");
      setTimeout(() => setResourcesStatus(null), 3000);
    } catch (e: any) {
      console.error("Failed to add resource:", e);
      setError(e?.message || "Failed to add resource. Please try again.");
    }
  }

  async function handleFileUpload(file: File) {
    const fileType = file.type;
    let resourceType: Resource["type"] = "link";
    
    if (fileType.includes("pdf")) {
      resourceType = "pdf";
    } else if (fileType.includes("video")) {
      resourceType = "video";
    } else if (fileType.includes("document") || fileType.includes("word") || fileType.includes("text")) {
      resourceType = "doc";
    }

    try {
      setUploadingFile(true);
      setError(null);
      setResourcesStatus(null);

      // Step 1: Upload file to server
      const formData = new FormData();
      formData.append("file", file);
      formData.append("experienceId", experienceId);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => null);
        throw new Error(errorData?.error || `Upload failed (${uploadRes.status})`);
      }

      const uploadData = await uploadRes.json();
      const fileUrl = uploadData.url;

      if (!fileUrl) {
        throw new Error("No URL returned from upload");
      }
      
      // Step 2: Create resource record in database
      const savedResource = await createPracticeResource({
        type: resourceType,
        title: file.name,
        url: fileUrl,
        description: `Uploaded file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
      });
      
      // Step 3: Update state with the saved resource
      setPracticeResources([...practiceResources, {
        id: savedResource.id,
        type: savedResource.type,
        title: savedResource.title,
        url: savedResource.url,
        description: savedResource.description,
      }]);

      setResourcesStatus("File uploaded ✅");
      setTimeout(() => setResourcesStatus(null), 3000);
    } catch (e: any) {
      console.error("Failed to upload file:", e);
      setError(e?.message || "Failed to upload file. Please try again.");
    } finally {
      setUploadingFile(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Upload files sequentially to avoid overwhelming the server
      for (const file of files) {
        await handleFileUpload(file);
      }
    }
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Upload files sequentially to avoid overwhelming the server
      for (const file of Array.from(files)) {
        await handleFileUpload(file);
      }
    }
    // Reset input
    e.target.value = "";
  }

  async function handleDeleteResource(id: string) {
    try {
      setError(null);
      // Delete from database
      await deletePracticeResource(id);
      // Update state
      setPracticeResources(practiceResources.filter(r => r.id !== id));
      setResourcesStatus("Resource deleted ✅");
      setTimeout(() => setResourcesStatus(null), 3000);
    } catch (e: any) {
      console.error("Failed to delete resource:", e);
      setError(e?.message || "Failed to delete resource. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-12 mb-2">Admin Panel</h1>
              <p className="text-4 text-gray-10">Customize your Skill Accelerator experience</p>
            </div>
            <div className="flex items-center gap-3">
              {isOwner && (
                <a
                  href="/support/inbox"
                  className="rounded-xl border border-gray-a5 bg-white px-4 py-2.5 text-3 font-medium text-gray-11 hover:bg-gray-a1 transition-colors"
                >
                  Support Inbox
                </a>
              )}
              <Link
                href={`/experiences/${experienceId}/home`}
                className="rounded-xl border border-gray-a5 bg-white px-4 py-2.5 text-3 font-medium text-gray-11 hover:bg-gray-a1 transition-colors"
              >
                ← View Member Experience
              </Link>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex gap-2 border-b border-gray-a5">
            <button
              onClick={() => setActiveSection("practice")}
              className={`px-6 py-3 text-4 font-semibold border-b-2 transition-colors ${
                activeSection === "practice"
                  ? "border-blue-11 text-blue-12"
                  : "border-transparent text-gray-10 hover:text-gray-12"
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Practice Area Settings
              </div>
            </button>
            <button
              onClick={() => setActiveSection("coach")}
              className={`px-6 py-3 text-4 font-semibold border-b-2 transition-colors ${
                activeSection === "coach"
                  ? "border-blue-11 text-blue-12"
                  : "border-transparent text-gray-10 hover:text-gray-12"
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Coach AI Settings
              </div>
            </button>
          </div>
        </div>

        {/* Practice Area Section */}
        {activeSection === "practice" && (
          <div className="space-y-6">
            {/* Global Context */}
            <div className="rounded-2xl border border-gray-a5 bg-white p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-5 font-bold text-gray-12 mb-2">Global Context</h2>
                <p className="text-3 text-gray-10">
                  This context applies to all niches and affects AI reasoning across all drills.
                </p>
              </div>
              <textarea
                className="w-full rounded-xl border border-gray-a5 bg-gray-a1 p-4 text-3 font-mono min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-a5"
                value={globalContext}
                onChange={(e) => setGlobalContext(e.target.value)}
                placeholder="e.g., Focus on practical, actionable advice. Keep examples realistic and applicable to real-world scenarios..."
              />
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={saveGlobalContext}
                  disabled={saving}
                  className="rounded-xl bg-blue-11 px-6 py-2.5 text-3 font-semibold text-white hover:bg-blue-12 disabled:opacity-60 transition-colors"
                >
                  {saving ? "Saving..." : "Save Global Context"}
                </button>
                {status && <div className="text-3 text-gray-11">{status}</div>}
              </div>
            </div>

            {/* Resources Section */}
            <div className="rounded-2xl border border-gray-a5 bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-5 font-bold text-gray-12 mb-2">Knowledge Resources</h2>
                  <p className="text-3 text-gray-10">
                    Add PDFs, links, docs, and videos to enhance AI reasoning for practice drills.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {resourcesStatus && (
                    <div className="text-3 text-green-11 font-medium">{resourcesStatus}</div>
                  )}
                  <button
                    onClick={() => {
                      setShowResourceModal(true);
                      setNewResource({ type: "link" });
                      setError(null);
                    }}
                    className="flex items-center gap-2 rounded-xl border border-blue-a5 bg-blue-a1 px-4 py-2.5 text-3 font-medium text-blue-12 hover:bg-blue-a2 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Resource
                  </button>
                </div>
              </div>

              {practiceResources.length === 0 ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`rounded-xl border-2 border-dashed transition-all ${
                    isDragging
                      ? "border-blue-11 bg-blue-a1 border-solid"
                      : "border-gray-a5 bg-gray-a1"
                  } p-12 text-center cursor-pointer relative`}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.multiple = true;
                    input.accept = ".pdf,.doc,.docx,.txt,.mp4,.mov,.avi,.webm,application/pdf,video/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                    input.onchange = (e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.files) {
                        Array.from(target.files).forEach(file => handleFileUpload(file));
                      }
                    };
                    input.click();
                  }}
                >
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.mp4,.mov,.avi,.webm,application/pdf,video/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileInput}
                    className="hidden"
                    id="resource-file-input"
                  />
                  <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${isDragging ? "text-blue-11" : "text-gray-8"}`} />
                  <p className={`text-3 mb-2 transition-colors ${isDragging ? "text-blue-12 font-semibold" : "text-gray-10"}`}>
                    {isDragging ? "Drop files here" : "No resources added yet"}
                  </p>
                  <p className="text-2 text-gray-9">Drag and drop files here or click to browse</p>
                  <p className="text-2 text-gray-8 mt-2">Supports PDFs, docs, videos, and links</p>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`rounded-xl border-2 border-dashed transition-all p-4 ${
                    isDragging
                      ? "border-blue-11 bg-blue-a1 border-solid"
                      : "border-transparent"
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {practiceResources.map((resource) => (
                    <div key={resource.id} className="rounded-xl border border-gray-a5 bg-gray-a1 p-4 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-blue-a1 border border-blue-a5 flex items-center justify-center shrink-0">
                          {resource.type === "pdf" && <File className="h-5 w-5 text-blue-11" />}
                          {resource.type === "link" && <LinkIcon className="h-5 w-5 text-blue-11" />}
                          {resource.type === "doc" && <FileText className="h-5 w-5 text-blue-11" />}
                          {resource.type === "video" && <Video className="h-5 w-5 text-blue-11" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-3 font-semibold text-gray-12 truncate">{resource.title}</h3>
                          {resource.description && (
                            <p className="text-2 text-gray-10 mt-1 line-clamp-2">{resource.description}</p>
                          )}
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-2 text-blue-11 hover:text-blue-12 mt-1 inline-block truncate max-w-full"
                          >
                            {resource.url}
                          </a>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteResource(resource.id)}
                        className="p-2 hover:bg-red-a1 rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-11" />
                    </button>
                  </div>
                ))}
                  </div>
                  {isDragging && (
                    <div className="mt-4 rounded-xl border-2 border-dashed border-blue-11 bg-blue-a1 p-8 text-center">
                      <Upload className="h-8 w-8 text-blue-11 mx-auto mb-2" />
                      <p className="text-3 text-blue-12 font-semibold">Drop files here to add</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Niche Presets */}
            <div className="rounded-2xl border border-gray-a5 bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-5 font-bold text-gray-12 mb-2">Niche Presets</h2>
                  <p className="text-3 text-gray-10">
                    Manage niche presets for your community. Custom is always available.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={restoreDefaults}
                    disabled={restoring}
                    className="rounded-xl border border-gray-a5 bg-white px-4 py-2.5 text-3 font-medium text-gray-11 hover:bg-gray-a1 disabled:opacity-60 transition-colors"
                  >
                    {restoring ? "Restoring..." : "Restore Defaults"}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(true);
                      setNewLabel("");
                      setNewAiContext("");
                      setSelectedIcon("");
                      setError(null);
                    }}
                    className="flex items-center gap-2 rounded-xl border border-gray-a5 bg-white px-4 py-2.5 text-3 font-medium text-gray-11 hover:bg-gray-a1 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Preset
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-a5 bg-red-a1 p-4 text-3 text-red-12">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                {presets.length === 0 ? (
                  <div className="rounded-xl border border-gray-a5 bg-gray-a1 p-6 text-center">
                    <p className="text-3 text-gray-10">No presets yet. Users will still see <b>Custom</b>.</p>
                  </div>
                ) : (
                  presets.map((p) => (
                    <div key={p.id} className="rounded-xl border border-gray-a5 bg-gray-a1 p-5 hover:bg-gray-a2 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="text-4 font-bold text-gray-12">{p.label}</div>
                            <span className="text-2 text-gray-9 bg-gray-a2 px-2 py-0.5 rounded">key: {p.key}</span>
                          </div>
                          <div className="text-2 text-gray-10">
                            AI context: {p.aiContext || <span className="italic text-gray-9">(none)</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteClick(p.key)}
                          className="rounded-lg border border-red-a5 bg-red-a1 px-3 py-2 text-2 font-medium text-red-12 hover:bg-red-a2 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {/* Custom always shows */}
                <div className="mt-4 rounded-xl border-2 border-blue-a5 bg-blue-a1 p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-4 font-bold text-gray-12">Custom</div>
                    <span className="text-2 text-blue-11 bg-blue-a2 px-2 py-0.5 rounded">Always available</span>
                  </div>
                  <div className="text-2 text-gray-11 italic">{customRow.aiContext}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coach AI Section */}
        {activeSection === "coach" && (
          <div className="space-y-6">
            {!isOwner && (
              <div className="rounded-2xl border border-gray-a5 bg-white p-8 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-5 font-bold text-gray-12 mb-2">Coach AI Configuration</h2>
                  <p className="text-3 text-gray-10">
                    Coach AI settings are only available to the community owner.
                  </p>
                </div>
              </div>
            )}

            {isOwner && (
              <>
                {coachError && (
                  <div className="rounded-xl border border-red-a5 bg-red-a1 p-4 text-3 text-red-12">
                    {coachError}
                  </div>
                )}

                {/* Coach Name */}
                <div className="rounded-2xl border border-gray-a5 bg-white p-8 shadow-sm">
                  <div className="mb-4">
                    <label className="block text-4 font-bold text-gray-12 mb-2">
                      Coach Name
                    </label>
                    <p className="text-3 text-gray-10 mb-4">
                      Customize the name that appears for your AI coach (e.g., "Trading Mentor", "Fitness Coach").
                    </p>
                  </div>
                  <input
                    type="text"
                    value={coachName}
                    onChange={(e) => setCoachName(e.target.value)}
                    placeholder="AI Coach"
                    className="w-full rounded-xl border border-gray-a5 bg-gray-a1 px-4 py-3 text-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-a5"
                  />
                  <p className="mt-3 text-2 text-gray-9">
                    This name will be displayed to users when they interact with the coach.
                  </p>
                  <div className="mt-4">
                    <button
                      onClick={async () => {
                        setCoachSaving(true);
                        setCoachSaved(false);
                        setCoachError(null);
                        try {
                          const res = await fetch("/api/admin/coach/settings", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              experienceId,
                              coachName: coachName || "AI Coach",
                            }),
                          });
                          if (!res.ok) {
                            const data = await res.json().catch(() => null);
                            throw new Error(data?.error || "Failed to save");
                          }
                          setCoachSaved(true);
                          setTimeout(() => setCoachSaved(false), 3000);
                        } catch (error: any) {
                          setCoachError(error?.message || "Failed to save");
                        } finally {
                          setCoachSaving(false);
                        }
                      }}
                      disabled={coachSaving}
                      className="rounded-xl bg-blue-11 px-6 py-2.5 text-3 font-semibold text-white hover:bg-blue-12 disabled:opacity-60 transition-colors"
                    >
                      {coachSaving ? "Saving..." : "Save Coach Name"}
                    </button>
                    {coachSaved && <span className="ml-3 text-3 text-green-11 font-medium">Saved!</span>}
                  </div>
                </div>

                {/* Community Context */}
                <div className="rounded-2xl border border-gray-a5 bg-white p-8 shadow-sm">
                  <div className="mb-4">
                    <label className="block text-4 font-bold text-gray-12 mb-2">
                      Community Context
                    </label>
                    <p className="text-3 text-gray-10 mb-4">
                      Describe your community or group to help the AI understand your audience and tailor its responses.
                    </p>
                  </div>
                  <textarea
                    value={communityContext}
                    onChange={(e) => setCommunityContext(e.target.value)}
                    rows={5}
                    className="w-full rounded-xl border border-gray-a5 bg-gray-a1 px-4 py-3 text-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-a5"
                    placeholder="e.g., 'Trading community focused on day trading', 'Fitness group for beginners', etc."
                  />
                  <p className="mt-3 text-2 text-gray-9">
                    This context helps the AI understand your community and tailor its reasoning and responses accordingly.
                  </p>
                  <div className="mt-4">
                    <button
                      onClick={async () => {
                        setCoachSaving(true);
                        setCoachSaved(false);
                        setCoachError(null);
                        try {
                          const res = await fetch("/api/admin/coach/settings", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              experienceId,
                              communityContext: communityContext || null,
                            }),
                          });
                          if (!res.ok) {
                            const data = await res.json().catch(() => null);
                            throw new Error(data?.error || "Failed to save");
                          }
                          setCoachSaved(true);
                          setTimeout(() => setCoachSaved(false), 3000);
                        } catch (error: any) {
                          setCoachError(error?.message || "Failed to save");
                        } finally {
                          setCoachSaving(false);
                        }
                      }}
                      disabled={coachSaving}
                      className="rounded-xl bg-blue-11 px-6 py-2.5 text-3 font-semibold text-white hover:bg-blue-12 disabled:opacity-60 transition-colors"
                    >
                      {coachSaving ? "Saving..." : "Save Community Context"}
                    </button>
                    {coachSaved && <span className="ml-3 text-3 text-green-11 font-medium">Saved!</span>}
                  </div>
                </div>

                {/* System Prompt */}
                <div className="rounded-2xl border border-gray-a5 bg-white p-8 shadow-sm">
                  <div className="mb-4">
                    <label className="block text-4 font-bold text-gray-12 mb-2">
                      System Prompt
                    </label>
                    <p className="text-3 text-gray-10 mb-4">
                      Define how the coach should behave and respond to community members.
                    </p>
                  </div>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={10}
                    className="w-full rounded-xl border border-gray-a5 bg-gray-a1 px-4 py-3 text-3 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-a5"
                    placeholder="You are a strict but helpful coach..."
                  />
                  <p className="mt-3 text-2 text-gray-9">
                    This prompt defines the core personality and behavior of the AI coach.
                  </p>
                  <div className="mt-4">
                    <button
                      onClick={async () => {
                        setCoachSaving(true);
                        setCoachSaved(false);
                        setCoachError(null);
                        try {
                          const res = await fetch("/api/admin/coach/settings", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              experienceId,
                              systemPrompt,
                            }),
                          });
                          if (!res.ok) {
                            const data = await res.json().catch(() => null);
                            throw new Error(data?.error || "Failed to save");
                          }
                          setCoachSaved(true);
                          setTimeout(() => setCoachSaved(false), 3000);
                        } catch (error: any) {
                          setCoachError(error?.message || "Failed to save");
                        } finally {
                          setCoachSaving(false);
                        }
                      }}
                      disabled={coachSaving}
                      className="rounded-xl bg-blue-11 px-6 py-2.5 text-3 font-semibold text-white hover:bg-blue-12 disabled:opacity-60 transition-colors"
                    >
                      {coachSaving ? "Saving..." : "Save System Prompt"}
                    </button>
                    {coachSaved && <span className="ml-3 text-3 text-green-11 font-medium">Saved!</span>}
                  </div>
                </div>

                {/* Coach Resources Section */}
                <div className="rounded-2xl border border-gray-a5 bg-white p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-4 font-bold text-gray-12 mb-2">Knowledge Resources</h2>
                      <p className="text-3 text-gray-10">
                        Add PDFs, links, docs, and videos to enhance the coach's knowledge base.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowCoachResourceModal(true);
                        setNewCoachResource({ type: "link" });
                        setCoachError(null);
                      }}
                      className="flex items-center gap-2 rounded-xl border border-blue-a5 bg-blue-a1 px-4 py-2.5 text-3 font-medium text-blue-12 hover:bg-blue-a2 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Resource
                    </button>
                  </div>

                  {coachResources.length === 0 ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingCoach(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingCoach(false);
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingCoach(false);
                        const files = Array.from(e.dataTransfer.files);
                        const newResources: Resource[] = [];
                        
                        for (const file of files) {
                          try {
                            const fileType = file.type;
                            let resourceType: Resource["type"] = "link";
                            if (fileType.includes("pdf")) resourceType = "pdf";
                            else if (fileType.includes("video")) resourceType = "video";
                            else if (fileType.includes("document") || fileType.includes("word") || fileType.includes("text")) resourceType = "doc";
                            
                            // Upload file to server
                            const formData = new FormData();
                            formData.append("file", file);
                            formData.append("experienceId", experienceId);

                            const uploadRes = await fetch("/api/upload", {
                              method: "POST",
                              body: formData,
                            });

                            if (!uploadRes.ok) {
                              const errorData = await uploadRes.json().catch(() => null);
                              console.error("Failed to upload file:", errorData?.error || `Upload failed (${uploadRes.status})`);
                              continue;
                            }

                            const uploadData = await uploadRes.json();
                            const fileUrl = uploadData.url;

                            if (!fileUrl) {
                              console.error("No URL returned from upload");
                              continue;
                            }

                            // Create resource record in database
                            const savedResource = await createCoachResource({
                              type: resourceType,
                              title: file.name,
                              url: fileUrl,
                              description: `Uploaded file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
                            });
                            newResources.push({
                              id: savedResource.id,
                              type: savedResource.type,
                              title: savedResource.title,
                              url: savedResource.url,
                              description: savedResource.description,
                            });
                          } catch (err) {
                            console.error("Error uploading file:", err);
                          }
                        }
                        
                        if (newResources.length > 0) {
                          setCoachResources([...coachResources, ...newResources]);
                        }
                      }}
                      className={`rounded-xl border-2 border-dashed transition-all ${
                        isDraggingCoach
                          ? "border-blue-11 bg-blue-a1 border-solid"
                          : "border-gray-a5 bg-gray-a1"
                      } p-12 text-center cursor-pointer`}
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.multiple = true;
                        input.accept = ".pdf,.doc,.docx,.txt,.mp4,.mov,.avi,.webm,application/pdf,video/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                        input.onchange = async (e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.files) {
                            const newResources: Resource[] = [];
                            for (const file of Array.from(target.files)) {
                              try {
                                const fileType = file.type;
                                let resourceType: Resource["type"] = "link";
                                if (fileType.includes("pdf")) resourceType = "pdf";
                                else if (fileType.includes("video")) resourceType = "video";
                                else if (fileType.includes("document") || fileType.includes("word") || fileType.includes("text")) resourceType = "doc";
                                
                                // Upload file to server
                                const formData = new FormData();
                                formData.append("file", file);
                                formData.append("experienceId", experienceId);

                                const uploadRes = await fetch("/api/upload", {
                                  method: "POST",
                                  body: formData,
                                });

                                if (!uploadRes.ok) {
                                  const errorData = await uploadRes.json().catch(() => null);
                                  console.error("Failed to upload file:", errorData?.error || `Upload failed (${uploadRes.status})`);
                                  continue;
                                }

                                const uploadData = await uploadRes.json();
                                const fileUrl = uploadData.url;

                                if (!fileUrl) {
                                  console.error("No URL returned from upload");
                                  continue;
                                }

                                // Create resource record in database
                                const savedResource = await createCoachResource({
                                  type: resourceType,
                                  title: file.name,
                                  url: fileUrl,
                                  description: `Uploaded file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
                                });
                                newResources.push({
                                  id: savedResource.id,
                                  type: savedResource.type,
                                  title: savedResource.title,
                                  url: savedResource.url,
                                  description: savedResource.description,
                                });
                              } catch (err) {
                                console.error("Error uploading file:", err);
                              }
                            }
                            
                            if (newResources.length > 0) {
                              setCoachResources([...coachResources, ...newResources]);
                            }
                          }
                        };
                        input.click();
                      }}
                    >
                      <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${isDraggingCoach ? "text-blue-11" : "text-gray-8"}`} />
                      <p className={`text-3 mb-2 transition-colors ${isDraggingCoach ? "text-blue-12 font-semibold" : "text-gray-10"}`}>
                        {isDraggingCoach ? "Drop files here" : "No resources added yet"}
                      </p>
                      <p className="text-2 text-gray-9">Drag and drop files here or click to browse</p>
                      <p className="text-2 text-gray-8 mt-2">Supports PDFs, docs, videos, and links</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {coachResources.map((resource) => (
                        <div key={resource.id} className="rounded-xl border border-gray-a5 bg-gray-a1 p-4 flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="h-10 w-10 rounded-lg bg-blue-a1 border border-blue-a5 flex items-center justify-center shrink-0">
                              {resource.type === "pdf" && <File className="h-5 w-5 text-blue-11" />}
                              {resource.type === "link" && <LinkIcon className="h-5 w-5 text-blue-11" />}
                              {resource.type === "doc" && <FileText className="h-5 w-5 text-blue-11" />}
                              {resource.type === "video" && <Video className="h-5 w-5 text-blue-11" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-3 font-semibold text-gray-12 truncate">{resource.title}</h3>
                              {resource.description && (
                                <p className="text-2 text-gray-10 mt-1 line-clamp-2">{resource.description}</p>
                              )}
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-2 text-blue-11 hover:text-blue-12 mt-1 inline-block truncate max-w-full"
                              >
                                {resource.url}
                              </a>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                await deleteCoachResource(resource.id);
                                setCoachResources(coachResources.filter(r => r.id !== resource.id));
                              } catch (e: any) {
                                console.error("Failed to delete coach resource:", e);
                                setCoachError(e?.message || "Failed to delete resource");
                              }
                            }}
                            className="p-2 hover:bg-red-a1 rounded-lg transition-colors shrink-0"
                          >
                            <Trash2 className="h-4 w-4 text-red-11" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tone */}
                <div className="rounded-2xl border border-gray-a5 bg-white p-8 shadow-sm">
                  <div className="mb-4">
                    <label className="block text-4 font-bold text-gray-12 mb-2">Tone</label>
                    <p className="text-3 text-gray-10 mb-4">
                      Choose the communication style for the AI coach.
                    </p>
                  </div>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full rounded-xl border border-gray-a5 bg-white px-4 py-3 text-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-a5"
                  >
                    <option value="direct">Direct - Straightforward and to the point</option>
                    <option value="friendly">Friendly - Warm and supportive</option>
                    <option value="intense">Intense - High energy and motivational</option>
                  </select>
                  <div className="mt-4">
                    <button
                      onClick={async () => {
                        setCoachSaving(true);
                        setCoachSaved(false);
                        setCoachError(null);
                        try {
                          const res = await fetch("/api/admin/coach/settings", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              experienceId,
                              tone,
                            }),
                          });
                          if (!res.ok) {
                            const data = await res.json().catch(() => null);
                            throw new Error(data?.error || "Failed to save");
                          }
                          setCoachSaved(true);
                          setTimeout(() => setCoachSaved(false), 3000);
                        } catch (error: any) {
                          setCoachError(error?.message || "Failed to save");
                        } finally {
                          setCoachSaving(false);
                        }
                      }}
                      disabled={coachSaving}
                      className="rounded-xl bg-blue-11 px-6 py-2.5 text-3 font-semibold text-white hover:bg-blue-12 disabled:opacity-60 transition-colors"
                    >
                      {coachSaving ? "Saving..." : "Save Tone"}
                    </button>
                    {coachSaved && <span className="ml-3 text-3 text-green-11 font-medium">Saved!</span>}
                  </div>
                </div>

                {/* Feature Toggles */}
                <div className="rounded-2xl border border-gray-a5 bg-white p-8 shadow-sm">
                  <div className="mb-4">
                    <label className="block text-4 font-bold text-gray-12 mb-2">Quick Actions</label>
                    <p className="text-3 text-gray-10 mb-4">
                      Enable or disable quick action buttons in the coach chat interface.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-gray-a5 bg-gray-a1 hover:bg-gray-a2 transition-colors">
                      <input
                        type="checkbox"
                        checked={enableQuiz}
                        onChange={(e) => setEnableQuiz(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-a5 text-blue-11 focus:ring-2 focus:ring-blue-500/20"
                      />
                      <div>
                        <span className="text-3 font-semibold text-gray-12">Enable Quiz me</span>
                        <p className="text-2 text-gray-10 mt-0.5">Allow users to request quiz-style questions</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-gray-a5 bg-gray-a1 hover:bg-gray-a2 transition-colors">
                      <input
                        type="checkbox"
                        checked={enablePlan}
                        onChange={(e) => setEnablePlan(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-a5 text-blue-11 focus:ring-2 focus:ring-blue-500/20"
                      />
                      <div>
                        <span className="text-3 font-semibold text-gray-12">Enable Make a plan</span>
                        <p className="text-2 text-gray-10 mt-0.5">Allow users to request action plans</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-gray-a5 bg-gray-a1 hover:bg-gray-a2 transition-colors">
                      <input
                        type="checkbox"
                        checked={enableRoleplay}
                        onChange={(e) => setEnableRoleplay(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-a5 text-blue-11 focus:ring-2 focus:ring-blue-500/20"
                      />
                      <div>
                        <span className="text-3 font-semibold text-gray-12">Enable Roleplay me</span>
                        <p className="text-2 text-gray-10 mt-0.5">Allow users to practice scenarios through roleplay</p>
                      </div>
                    </label>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={async () => {
                        setCoachSaving(true);
                        setCoachSaved(false);
                        setCoachError(null);
                        try {
                          const res = await fetch("/api/admin/coach/settings", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              experienceId,
                              enableQuiz,
                              enablePlan,
                              enableRoleplay,
                            }),
                          });
                          if (!res.ok) {
                            const data = await res.json().catch(() => null);
                            throw new Error(data?.error || "Failed to save");
                          }
                          setCoachSaved(true);
                          setTimeout(() => setCoachSaved(false), 3000);
                        } catch (error: any) {
                          setCoachError(error?.message || "Failed to save");
                        } finally {
                          setCoachSaving(false);
                        }
                      }}
                      disabled={coachSaving}
                      className="rounded-xl bg-blue-11 px-6 py-2.5 text-3 font-semibold text-white hover:bg-blue-12 disabled:opacity-60 transition-colors"
                    >
                      {coachSaving ? "Saving..." : "Save Quick Actions"}
                    </button>
                    {coachSaved && <span className="ml-3 text-3 text-green-11 font-medium">Saved!</span>}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Add Preset Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => {
            setShowAddModal(false);
            setNewLabel("");
            setNewAiContext("");
            setSelectedIcon("");
            setError(null);
          }}>
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col m-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-gray-a5">
                <h3 className="text-5 font-bold text-gray-12">Add New Preset</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewLabel("");
                    setNewAiContext("");
                    setSelectedIcon("");
                    setError(null);
                  }}
                  className="p-2 hover:bg-gray-a1 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-11" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {error && (
                  <div className="mb-4 rounded-xl border border-red-a5 bg-red-a1 p-4 text-3 text-red-12">
                    {error}
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <label className="block text-3 font-semibold text-gray-12 mb-2">
                      Preset Label <span className="text-red-11">*</span>
                    </label>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => {
                        setNewLabel(e.target.value);
                        if (e.target.value.trim() && !selectedIcon) {
                          const suggested = suggestIconForNiche(e.target.value.trim());
                          if (AVAILABLE_ICONS.some((i) => i.value === suggested)) {
                            setSelectedIcon(suggested as IconValue);
                          }
                        }
                      }}
                      placeholder="e.g., Monetize Audience"
                      className="w-full rounded-xl border border-gray-a5 bg-white p-3 text-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-a5"
                      autoFocus
                    />
                    <div className="mt-1 text-2 text-gray-9">
                      Key: <code className="text-xs bg-gray-a1 px-1.5 py-0.5 rounded">{slugifyKey(newLabel || "example")}</code>
                    </div>
                  </div>

                  <div>
                    <label className="block text-3 font-semibold text-gray-12 mb-2">AI Context (optional)</label>
                    <textarea
                      value={newAiContext}
                      onChange={(e) => setNewAiContext(e.target.value)}
                      placeholder="Additional context for AI when generating drills for this niche..."
                      rows={3}
                      className="w-full rounded-xl border border-gray-a5 bg-white p-3 text-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-a5"
                    />
                  </div>

                  <div>
                    <label className="block text-3 font-semibold text-gray-12 mb-2">Icon</label>
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-64 overflow-y-auto p-3 border border-gray-a5 rounded-xl bg-gray-a1">
                      {AVAILABLE_ICONS.map((icon) => {
                        const IconComponent = iconMap[icon.value] || SparklesIcon;
                        const isSelected = selectedIcon === icon.value;
                        return (
                          <button
                            key={icon.value}
                            type="button"
                            onClick={() => setSelectedIcon(icon.value)}
                            className={`
                              flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all
                              ${isSelected
                                ? "border-blue-11 bg-blue-a1 shadow-lg scale-105"
                                : "border-gray-a5 bg-white hover:border-gray-a6 hover:bg-gray-a1"
                              }
                            `}
                            title={icon.label}
                          >
                            <IconComponent className={`h-6 w-6 ${isSelected ? "text-blue-11" : "text-gray-11"}`} />
                            <span className={`mt-1 text-[10px] truncate w-full text-center ${isSelected ? "text-blue-12 font-semibold" : "text-gray-10"}`}>
                              {icon.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-a5 bg-gray-a1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewLabel("");
                    setNewAiContext("");
                    setSelectedIcon("");
                    setError(null);
                  }}
                  className="rounded-xl border border-gray-a5 bg-white px-6 py-2.5 text-3 font-semibold text-gray-11 hover:bg-gray-a1 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addPreset}
                  disabled={adding || !newLabel.trim()}
                  className="rounded-xl bg-blue-11 px-6 py-2.5 text-3 font-semibold text-white hover:bg-blue-12 disabled:opacity-60 transition-colors"
                >
                  {adding ? "Adding..." : "Add Preset"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Resource Modal */}
        {showResourceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => {
            setShowResourceModal(false);
            setNewResource({ type: "link" });
            setError(null);
          }}>
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-5 font-bold text-gray-12">Add Resource</h3>
                <button
                  onClick={() => {
                    setShowResourceModal(false);
                    setNewResource({ type: "link" });
                    setError(null);
                  }}
                  className="p-2 hover:bg-gray-a1 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-11" />
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-a5 bg-red-a1 p-4 text-3 text-red-12">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-3 font-semibold text-gray-12 mb-2">Resource Type</label>
                  <select
                    value={newResource.type || "link"}
                    onChange={(e) => setNewResource({ ...newResource, type: e.target.value as Resource["type"] })}
                    className="w-full rounded-xl border border-gray-a5 bg-white p-3 text-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="link">Link</option>
                    <option value="pdf">PDF</option>
                    <option value="doc">Document</option>
                    <option value="video">Video</option>
                  </select>
                </div>

                <div>
                  <label className="block text-3 font-semibold text-gray-12 mb-2">Title <span className="text-red-11">*</span></label>
                  <input
                    type="text"
                    value={newResource.title || ""}
                    onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                    placeholder="e.g., Trading Guide PDF"
                    className="w-full rounded-xl border border-gray-a5 bg-white p-3 text-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-3 font-semibold text-gray-12 mb-2">
                    URL or File <span className="text-red-11">*</span>
                  </label>
                  <div className="space-y-3">
                    <input
                      type="url"
                      value={newResource.url || ""}
                      onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                      placeholder="https://example.com/resource.pdf"
                      className="w-full rounded-xl border border-gray-a5 bg-white p-3 text-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(false);
                        const files = Array.from(e.dataTransfer.files);
                        if (files.length > 0) {
                          const file = files[0];
                          try {
                            setError(null);
                            // Upload file to server
                            const formData = new FormData();
                            formData.append("file", file);
                            formData.append("experienceId", experienceId);

                            const uploadRes = await fetch("/api/upload", {
                              method: "POST",
                              body: formData,
                            });

                            if (!uploadRes.ok) {
                              const errorData = await uploadRes.json().catch(() => null);
                              setError(errorData?.error || `Upload failed (${uploadRes.status})`);
                              return;
                            }

                            const uploadData = await uploadRes.json();
                            const fileUrl = uploadData.url;

                            if (!fileUrl) {
                              setError("No URL returned from upload");
                              return;
                            }

                            setNewResource({
                              ...newResource,
                              url: fileUrl,
                              title: newResource.title || file.name,
                              type: file.type.includes("pdf") ? "pdf" : file.type.includes("video") ? "video" : "doc",
                            });
                          } catch (err: any) {
                            console.error("Failed to upload file:", err);
                            setError(err?.message || "Failed to upload file. Please try again.");
                          }
                        }
                      }}
                      className={`rounded-xl border-2 border-dashed transition-all ${
                        isDragging
                          ? "border-blue-11 bg-blue-a1 border-solid"
                          : "border-gray-a5 bg-gray-a1"
                      } p-6 text-center cursor-pointer`}
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = ".pdf,.doc,.docx,.txt,.mp4,.mov,.avi,.webm,application/pdf,video/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                        input.onchange = async (e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.files && target.files[0]) {
                            const file = target.files[0];
                            try {
                              setError(null);
                              // Upload file to server
                              const formData = new FormData();
                              formData.append("file", file);
                              formData.append("experienceId", experienceId);

                              const uploadRes = await fetch("/api/upload", {
                                method: "POST",
                                body: formData,
                              });

                              if (!uploadRes.ok) {
                                const errorData = await uploadRes.json().catch(() => null);
                                setError(errorData?.error || `Upload failed (${uploadRes.status})`);
                                return;
                              }

                              const uploadData = await uploadRes.json();
                              const fileUrl = uploadData.url;

                              if (!fileUrl) {
                                setError("No URL returned from upload");
                                return;
                              }

                              setNewResource({
                                ...newResource,
                                url: fileUrl,
                                title: newResource.title || file.name,
                                type: file.type.includes("pdf") ? "pdf" : file.type.includes("video") ? "video" : "doc",
                              });
                            } catch (err: any) {
                              console.error("Failed to upload file:", err);
                              setError(err?.message || "Failed to upload file. Please try again.");
                            }
                          }
                        };
                        input.click();
                      }}
                    >
                      <Upload className={`h-8 w-8 mx-auto mb-2 transition-colors ${isDragging ? "text-blue-11" : "text-gray-8"}`} />
                      <p className={`text-2 transition-colors ${isDragging ? "text-blue-12 font-semibold" : "text-gray-10"}`}>
                        {isDragging ? "Drop file here" : "Or drag and drop a file here"}
                      </p>
                      <p className="text-2 text-gray-9 mt-1">Click to browse</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-3 font-semibold text-gray-12 mb-2">Description (optional)</label>
                  <textarea
                    value={newResource.description || ""}
                    onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                    placeholder="Brief description of this resource..."
                    rows={2}
                    className="w-full rounded-xl border border-gray-a5 bg-white p-3 text-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-a5">
                <button
                  onClick={() => {
                    setShowResourceModal(false);
                    setNewResource({ type: "link" });
                    setError(null);
                  }}
                  className="rounded-xl border border-gray-a5 bg-white px-6 py-2.5 text-3 font-semibold text-gray-11 hover:bg-gray-a1 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddResource}
                  className="rounded-xl bg-blue-11 px-6 py-2.5 text-3 font-semibold text-white hover:bg-blue-12 transition-colors"
                >
                  Add Resource
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Coach Resource Modal */}
        {showCoachResourceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => {
            setShowCoachResourceModal(false);
            setNewCoachResource({ type: "link" });
            setCoachError(null);
          }}>
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-5 font-bold text-gray-12">Add Resource</h3>
                <button
                  onClick={() => {
                    setShowCoachResourceModal(false);
                    setNewCoachResource({ type: "link" });
                    setCoachError(null);
                  }}
                  className="p-2 hover:bg-gray-a1 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-11" />
                </button>
              </div>

              {coachError && (
                <div className="mb-4 rounded-xl border border-red-a5 bg-red-a1 p-4 text-3 text-red-12">
                  {coachError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-3 font-semibold text-gray-12 mb-2">Resource Type</label>
                  <select
                    value={newCoachResource.type || "link"}
                    onChange={(e) => setNewCoachResource({ ...newCoachResource, type: e.target.value as Resource["type"] })}
                    className="w-full rounded-xl border border-gray-a5 bg-white p-3 text-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="link">Link</option>
                    <option value="pdf">PDF</option>
                    <option value="doc">Document</option>
                    <option value="video">Video</option>
                  </select>
                </div>

                <div>
                  <label className="block text-3 font-semibold text-gray-12 mb-2">Title <span className="text-red-11">*</span></label>
                  <input
                    type="text"
                    value={newCoachResource.title || ""}
                    onChange={(e) => setNewCoachResource({ ...newCoachResource, title: e.target.value })}
                    placeholder="e.g., Trading Guide PDF"
                    className="w-full rounded-xl border border-gray-a5 bg-white p-3 text-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-3 font-semibold text-gray-12 mb-2">
                    URL or File <span className="text-red-11">*</span>
                  </label>
                  <div className="space-y-3">
                    <input
                      type="url"
                      value={newCoachResource.url || ""}
                      onChange={(e) => setNewCoachResource({ ...newCoachResource, url: e.target.value })}
                      placeholder="https://example.com/resource.pdf"
                      className="w-full rounded-xl border border-gray-a5 bg-white p-3 text-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingCoach(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingCoach(false);
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingCoach(false);
                        const files = Array.from(e.dataTransfer.files);
                        if (files.length > 0) {
                          const file = files[0];
                          try {
                            setCoachError(null);
                            // Upload file to server
                            const formData = new FormData();
                            formData.append("file", file);
                            formData.append("experienceId", experienceId);

                            const uploadRes = await fetch("/api/upload", {
                              method: "POST",
                              body: formData,
                            });

                            if (!uploadRes.ok) {
                              const errorData = await uploadRes.json().catch(() => null);
                              setCoachError(errorData?.error || `Upload failed (${uploadRes.status})`);
                              return;
                            }

                            const uploadData = await uploadRes.json();
                            const fileUrl = uploadData.url;

                            if (!fileUrl) {
                              setCoachError("No URL returned from upload");
                              return;
                            }

                            setNewCoachResource({
                              ...newCoachResource,
                              url: fileUrl,
                              title: newCoachResource.title || file.name,
                              type: file.type.includes("pdf") ? "pdf" : file.type.includes("video") ? "video" : "doc",
                            });
                          } catch (err: any) {
                            console.error("Failed to upload file:", err);
                            setCoachError(err?.message || "Failed to upload file. Please try again.");
                          }
                        }
                      }}
                      className={`rounded-xl border-2 border-dashed transition-all ${
                        isDraggingCoach
                          ? "border-blue-11 bg-blue-a1 border-solid"
                          : "border-gray-a5 bg-gray-a1"
                      } p-6 text-center cursor-pointer`}
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = ".pdf,.doc,.docx,.txt,.mp4,.mov,.avi,.webm,application/pdf,video/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                        input.onchange = async (e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.files && target.files[0]) {
                            const file = target.files[0];
                            try {
                              setCoachError(null);
                              // Upload file to server
                              const formData = new FormData();
                              formData.append("file", file);
                              formData.append("experienceId", experienceId);

                              const uploadRes = await fetch("/api/upload", {
                                method: "POST",
                                body: formData,
                              });

                              if (!uploadRes.ok) {
                                const errorData = await uploadRes.json().catch(() => null);
                                setCoachError(errorData?.error || `Upload failed (${uploadRes.status})`);
                                return;
                              }

                              const uploadData = await uploadRes.json();
                              const fileUrl = uploadData.url;

                              if (!fileUrl) {
                                setCoachError("No URL returned from upload");
                                return;
                              }

                              setNewCoachResource({
                                ...newCoachResource,
                                url: fileUrl,
                                title: newCoachResource.title || file.name,
                                type: file.type.includes("pdf") ? "pdf" : file.type.includes("video") ? "video" : "doc",
                              });
                            } catch (err: any) {
                              console.error("Failed to upload file:", err);
                              setCoachError(err?.message || "Failed to upload file. Please try again.");
                            }
                          }
                        };
                        input.click();
                      }}
                    >
                      <Upload className={`h-8 w-8 mx-auto mb-2 transition-colors ${isDraggingCoach ? "text-blue-11" : "text-gray-8"}`} />
                      <p className={`text-2 transition-colors ${isDraggingCoach ? "text-blue-12 font-semibold" : "text-gray-10"}`}>
                        {isDraggingCoach ? "Drop file here" : "Or drag and drop a file here"}
                      </p>
                      <p className="text-2 text-gray-9 mt-1">Click to browse</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-3 font-semibold text-gray-12 mb-2">Description (optional)</label>
                  <textarea
                    value={newCoachResource.description || ""}
                    onChange={(e) => setNewCoachResource({ ...newCoachResource, description: e.target.value })}
                    placeholder="Brief description of this resource..."
                    rows={2}
                    className="w-full rounded-xl border border-gray-a5 bg-white p-3 text-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-a5">
                <button
                  onClick={() => {
                    setShowCoachResourceModal(false);
                    setNewCoachResource({ type: "link" });
                    setCoachError(null);
                  }}
                  className="rounded-xl border border-gray-a5 bg-white px-6 py-2.5 text-3 font-semibold text-gray-11 hover:bg-gray-a1 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!newCoachResource.title || !newCoachResource.url) {
                      setCoachError("Title and URL are required");
                      return;
                    }
                    const savedResource = await createCoachResource({
                      type: newCoachResource.type || "link",
                      title: newCoachResource.title,
                      url: newCoachResource.url,
                      description: newCoachResource.description,
                    });

                    setCoachResources([...coachResources, {
                      id: savedResource.id,
                      type: savedResource.type,
                      title: savedResource.title,
                      url: savedResource.url,
                      description: savedResource.description,
                    }]);

                    setNewCoachResource({ type: "link" });
                    setShowCoachResourceModal(false);
                    setCoachError(null);
                  }}
                  className="rounded-xl bg-blue-11 px-6 py-2.5 text-3 font-semibold text-white hover:bg-blue-12 transition-colors"
                >
                  Add Resource
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={deleteConfirmOpen}
          title={`Delete preset "${presetToDelete}"?`}
          description="This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={deletePreset}
          onCancel={() => {
            setDeleteConfirmOpen(false);
            setPresetToDelete(null);
          }}
        />
      </div>
    </div>
  );
}
