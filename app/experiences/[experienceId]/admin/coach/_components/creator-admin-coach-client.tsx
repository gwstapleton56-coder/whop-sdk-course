"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@whop/react/components";
import { ArrowLeft, FileText, Link as LinkIcon, Video, File, Upload, X, Plus, Settings, Trash2, Save } from "lucide-react";

type Settings = {
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

type Resource = {
  id: string;
  type: "pdf" | "link" | "doc" | "video";
  title: string;
  url: string;
  description?: string;
};

export function CreatorAdminCoachClient({
  experienceId,
  initialSettings,
}: {
  experienceId: string;
  initialSettings: Settings;
}) {
  const router = useRouter();
  const [coachName, setCoachName] = useState(
    initialSettings?.coachName || "AI Coach",
  );
  const [systemPrompt, setSystemPrompt] = useState(
    initialSettings?.systemPrompt || "You are a strict but helpful coach...",
  );
  const [communityContext, setCommunityContext] = useState(
    initialSettings?.communityContext || "",
  );
  const [tone, setTone] = useState(initialSettings?.tone || "direct");
  const [enableQuiz, setEnableQuiz] = useState(initialSettings?.enableQuiz ?? true);
  const [enablePlan, setEnablePlan] = useState(initialSettings?.enablePlan ?? true);
  const [enableRoleplay, setEnableRoleplay] = useState(initialSettings?.enableRoleplay ?? true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coach Resources
  const [coachResources, setCoachResources] = useState<Resource[]>(
    initialSettings?.resources || []
  );
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [newResource, setNewResource] = useState<Partial<Resource>>({ type: "link" });
  const [isDragging, setIsDragging] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/coach/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceId,
          coachName: coachName || "AI Coach",
          systemPrompt,
          communityContext: communityContext || null,
          resources: coachResources,
          tone,
          enableQuiz,
          enablePlan,
          enableRoleplay,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save settings");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      setError(error?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function saveResources() {
    try {
      const res = await fetch("/api/admin/coach/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceId,
          resources: coachResources,
        }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
    } catch (e: any) {
      console.error("Failed to save resources:", e);
    }
  }

  function handleAddResource() {
    if (!newResource.title || !newResource.url) {
      setError("Title and URL are required");
      return;
    }
    const resource: Resource = {
      id: Date.now().toString(),
      type: newResource.type || "link",
      title: newResource.title,
      url: newResource.url,
      description: newResource.description,
    };
    const updatedResources = [...coachResources, resource];
    setCoachResources(updatedResources);
    setNewResource({ type: "link" });
    setShowResourceModal(false);
    setError(null);
    // Auto-save resources
    saveResources();
  }

  function handleFileUpload(file: File) {
    const fileType = file.type;
    let resourceType: Resource["type"] = "link";
    
    if (fileType.includes("pdf")) {
      resourceType = "pdf";
    } else if (fileType.includes("video")) {
      resourceType = "video";
    } else if (fileType.includes("document") || fileType.includes("word") || fileType.includes("text")) {
      resourceType = "doc";
    }

    const fileUrl = URL.createObjectURL(file);
    
    const resource: Resource = {
      id: Date.now().toString(),
      type: resourceType,
      title: file.name,
      url: fileUrl,
      description: `Uploaded file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
    };
    
    const updatedResources = [...coachResources, resource];
    setCoachResources(updatedResources);
    setError(null);
    // Auto-save resources
    saveResources();
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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      files.forEach(file => {
        handleFileUpload(file);
      });
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        handleFileUpload(file);
      });
    }
    e.target.value = "";
  }

  function handleDeleteResource(id: string) {
    const updatedResources = coachResources.filter(r => r.id !== id);
    setCoachResources(updatedResources);
    // Auto-save resources
    saveResources();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/experiences/${experienceId}/admin`}
            className="inline-flex items-center gap-2 text-3 text-gray-10 hover:text-gray-12 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Panel
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-12 mb-2">Coach AI Settings</h1>
              <p className="text-4 text-gray-10">Configure the AI coach's behavior and capabilities</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-a5 bg-red-a1 p-4 text-3 text-red-12">
            {error}
          </div>
        )}

        <div className="space-y-6">
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
          </div>

          {/* Resources Section */}
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

            {coachResources.length === 0 ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-xl border-2 border-dashed transition-all ${
                  isDragging
                    ? "border-blue-11 bg-blue-a1 border-solid"
                    : "border-gray-a5 bg-gray-a1"
                } p-12 text-center cursor-pointer`}
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
                  id="coach-resource-file-input"
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
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3 pt-4">
            <Button
              variant="classic"
              size="4"
              onClick={handleSave}
              disabled={saving}
              loading={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Coach Settings
            </Button>
            {saved && <span className="text-3 text-green-11 font-medium">Saved successfully!</span>}
          </div>
        </div>

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
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(false);
                        const files = Array.from(e.dataTransfer.files);
                        if (files.length > 0) {
                          const file = files[0];
                          const fileUrl = URL.createObjectURL(file);
                          setNewResource({
                            ...newResource,
                            url: fileUrl,
                            title: newResource.title || file.name,
                            type: file.type.includes("pdf") ? "pdf" : file.type.includes("video") ? "video" : "doc",
                          });
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
                        input.onchange = (e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.files && target.files[0]) {
                            const file = target.files[0];
                            const fileUrl = URL.createObjectURL(file);
                            setNewResource({
                              ...newResource,
                              url: fileUrl,
                              title: newResource.title || file.name,
                              type: file.type.includes("pdf") ? "pdf" : file.type.includes("video") ? "video" : "doc",
                            });
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
      </div>
    </div>
  );
}
