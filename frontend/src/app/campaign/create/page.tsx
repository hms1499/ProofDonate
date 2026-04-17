"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import {
  useCreateCampaign,
  useIsVerified,
  useCampaignCount,
} from "@/hooks/useProofDonate";
import { uploadImage, uploadMetadata } from "@/lib/pinata";
import { Plus, Trash2, Loader2, ShieldAlert, ArrowRight, CheckCircle2, ImagePlus, GripVertical } from "lucide-react";
import Link from "next/link";

interface MilestoneInput {
  description: string;
  amount: string;
}

const inputCls =
  "w-full bg-[#132238] border border-white/10 text-white placeholder:text-white/25 text-sm px-4 py-3 rounded-lg focus:outline-none focus:border-[#34D399]/60 focus:ring-1 focus:ring-[#34D399]/30 transition-all";

export default function CreateCampaignPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: isVerified, isLoading: isCheckingVerification } = useIsVerified(address);
  const { data: campaignCount } = useCampaignCount();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("30");
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { description: "", amount: "" },
  ]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePosition, setImagePosition] = useState(50); // 0-100 vertical %
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartPos, setDragStartPos] = useState(50);
  const [isUploading, setIsUploading] = useState(false);
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [github, setGithub] = useState("");
  const [category, setCategory] = useState("");

  const { createCampaign, isPending, isConfirming, isSuccess, error } = useCreateCampaign();

  useEffect(() => {
    if (isSuccess && campaignCount !== undefined) {
      router.push(`/campaign/${Number(campaignCount) - 1}`);
    }
  }, [isSuccess, campaignCount, router]);

  const addMilestone = () => {
    if (milestones.length < 10) setMilestones([...milestones, { description: "", amount: "" }]);
  };
  const removeMilestone = (i: number) => {
    if (milestones.length > 1) setMilestones(milestones.filter((_, idx) => idx !== i));
  };
  const updateMilestone = (i: number, field: keyof MilestoneInput, val: string) => {
    const updated = [...milestones];
    updated[i][field] = val;
    setMilestones(updated);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImagePosition(50);
  };

  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragStartPos(imagePosition);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [imagePosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const containerHeight = containerRef.current.offsetHeight;
    const deltaY = e.clientY - dragStartY;
    const deltaPct = (deltaY / containerHeight) * 100;
    setImagePosition(Math.max(0, Math.min(100, dragStartPos - deltaPct)));
  }, [isDragging, dragStartY, dragStartPos]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const milestoneSum = milestones.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0);
  const targetNum = parseFloat(targetAmount) || 0;
  const milestoneMismatch = targetNum > 0 && milestoneSum > 0 && Math.abs(milestoneSum - targetNum) > 0.001;
  const isFormValid =
    title.trim() &&
    description.trim() &&
    targetNum > 0 &&
    imageFile &&
    milestones.every((m) => m.description.trim() && parseFloat(m.amount) > 0) &&
    !milestoneMismatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !imageFile) return;

    setIsUploading(true);
    try {
      const imageCid = await uploadImage(imageFile);

      const metadata: Record<string, unknown> = { image: imageCid, imagePosition: Math.round(imagePosition) };
      if (website.trim()) metadata.website = website.trim();
      if (twitter.trim() || github.trim()) {
        metadata.socials = {
          ...(twitter.trim() && { twitter: twitter.trim() }),
          ...(github.trim() && { github: github.trim() }),
        };
      }
      if (category.trim()) metadata.category = category.trim();

      const metadataURI = await uploadMetadata(metadata as Parameters<typeof uploadMetadata>[0]);

      const deadline = BigInt(Math.floor(Date.now() / 1000) + parseInt(deadlineDays) * 86400);
      createCampaign(
        title,
        description,
        metadataURI,
        parseEther(targetAmount),
        milestones.map((m) => m.description),
        milestones.map((m) => parseEther(m.amount)),
        deadline
      );
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Gate: not connected ──
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-6 h-6 text-white/40" />
          </div>
          <h1 className="font-['DM_Serif_Display'] text-3xl text-white mb-3">Connect your wallet</h1>
          <p className="text-white/40 text-sm">You need a connected wallet to create a campaign.</p>
        </div>
      </div>
    );
  }

  // ── Gate: checking verification ──
  if (isCheckingVerification) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#34D399] animate-spin" />
      </div>
    );
  }

  // ── Gate: not verified ──
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full border border-yellow-500/20 bg-yellow-500/5 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-6 h-6 text-yellow-400" />
          </div>
          <h1 className="font-['DM_Serif_Display'] text-3xl text-white mb-3">Verification required</h1>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            Proof of Humanity verification is required before launching a campaign.
          </p>
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 bg-[#34D399] text-black font-semibold px-6 py-3 rounded-full text-sm hover:bg-[#10B981] transition-colors"
          >
            Verify Now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12 lg:py-16">

        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <span className="font-mono text-xs text-[#34D399] uppercase tracking-widest mb-3 block">New Campaign</span>
          <h1 className="font-['DM_Serif_Display'] text-3xl sm:text-4xl lg:text-5xl">Launch your campaign</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">

            {/* ── Left: Main form ── */}
            <div className="lg:col-span-2 space-y-5 sm:space-y-6">

              {/* Campaign Image */}
              <div className="border border-white/8 rounded-xl bg-[#0F1D32] p-5 sm:p-6 lg:p-8 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-xs text-white/30 uppercase tracking-widest">01</span>
                  <h2 className="text-sm font-medium text-white/70 uppercase tracking-wider">Campaign Image</h2>
                </div>

                {imagePreview ? (
                  <div className="space-y-3">
                    <div
                      ref={containerRef}
                      className={`relative rounded-lg overflow-hidden h-48 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                    >
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg pointer-events-none"
                        draggable={false}
                        style={{ objectPosition: `center ${imagePosition}%` }}
                      />
                      {/* Drag hint overlay */}
                      <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${isDragging ? 'opacity-0' : 'opacity-0 hover:opacity-100'}`}>
                        <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-white/70" />
                          <span className="text-white/70 text-xs font-mono">Drag to reposition</span>
                        </div>
                      </div>
                      {/* Position indicator */}
                      {isDragging && (
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
                          <span className="text-white/70 text-[10px] font-mono">{Math.round(imagePosition)}%</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-white/25 font-mono">Drag image to adjust visible area</p>
                      <label className="text-[10px] text-[#34D399]/70 font-mono cursor-pointer hover:text-[#34D399] transition-colors">
                        Change image
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-white/10 rounded-lg h-48 flex flex-col items-center justify-center hover:border-[#34D399]/40 transition-colors">
                      <ImagePlus className="w-8 h-8 text-white/20 mb-2" />
                      <p className="text-sm text-white/30">Click to upload campaign image</p>
                      <p className="text-xs text-white/15 mt-1">PNG, JPG, WebP (max 5MB)</p>
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Campaign Details */}
              <div className="border border-white/8 rounded-xl bg-[#0F1D32] p-5 sm:p-6 lg:p-8 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-xs text-white/30 uppercase tracking-widest">02</span>
                  <h2 className="text-sm font-medium text-white/70 uppercase tracking-wider">Campaign Details</h2>
                </div>

                <div>
                  <label className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2 block">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your campaign a clear name"
                    maxLength={100}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2 block">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your campaign and how funds will be used…"
                    rows={5}
                    className={`${inputCls} resize-none`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2 block">Target (USDm)</label>
                    <input
                      type="number" min="1" step="0.01"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="1000"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2 block">Duration (days)</label>
                    <input
                      type="number" min="1" max="365"
                      value={deadlineDays}
                      onChange={(e) => setDeadlineDays(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* Milestones */}
              <div className="border border-white/8 rounded-xl bg-[#0F1D32] p-5 sm:p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-white/30 uppercase tracking-widest">03</span>
                    <h2 className="text-sm font-medium text-white/70 uppercase tracking-wider">Milestones</h2>
                  </div>
                  <button
                    type="button"
                    onClick={addMilestone}
                    disabled={milestones.length >= 10}
                    className="inline-flex items-center gap-1.5 border border-white/10 text-white/60 text-xs font-mono px-3 py-1.5 rounded-full hover:border-[#34D399]/40 hover:text-[#34D399] disabled:opacity-30 transition-all"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>

                <p className="text-xs text-white/30 mb-5 font-mono">
                  Milestone amounts must sum to target · {milestones.length}/10 used
                </p>

                <div className="space-y-3">
                  {milestones.map((m, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="mt-3 font-mono text-xs text-white/20 w-5 shrink-0 text-right">{String(i + 1).padStart(2, '0')}</span>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-0">
                        <input
                          type="text"
                          value={m.description}
                          onChange={(e) => updateMilestone(i, "description", e.target.value)}
                          placeholder={`Milestone ${i + 1} description`}
                          className={`sm:col-span-2 ${inputCls}`}
                        />
                        <div className="relative">
                          <input
                            type="number" min="0" step="0.01"
                            value={m.amount}
                            onChange={(e) => updateMilestone(i, "amount", e.target.value)}
                            placeholder="0.00"
                            className={inputCls}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/20 pointer-events-none">USDm</span>
                        </div>
                      </div>
                      {milestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMilestone(i)}
                          className="mt-2.5 p-1.5 text-white/20 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {milestoneMismatch && (
                  <div className="mt-4 border border-red-500/20 bg-red-500/5 rounded-lg px-4 py-3">
                    <p className="text-xs text-red-400 font-mono">
                      Total {milestoneSum.toFixed(2)} ≠ target {targetNum.toFixed(2)} USDm
                    </p>
                  </div>
                )}
              </div>

              {/* Optional Info */}
              <div className="border border-white/8 rounded-xl bg-[#0F1D32] p-5 sm:p-6 lg:p-8 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-xs text-white/30 uppercase tracking-widest">04</span>
                  <h2 className="text-sm font-medium text-white/70 uppercase tracking-wider">Additional Info</h2>
                  <span className="text-xs text-white/15">(optional)</span>
                </div>

                <div>
                  <label className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2 block">Website</label>
                  <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://your-project.com" className={inputCls} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2 block">Twitter</label>
                    <input type="url" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://twitter.com/..." className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2 block">GitHub</label>
                    <input type="url" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/..." className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2 block">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                    <option value="">Select category</option>
                    <option value="education">Education</option>
                    <option value="charity">Charity</option>
                    <option value="environment">Environment</option>
                    <option value="health">Health</option>
                    <option value="technology">Technology</option>
                    <option value="community">Community</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="border border-red-500/20 bg-red-500/5 rounded-lg px-4 py-3">
                  <p className="text-xs text-red-400">{error.message.slice(0, 120)}</p>
                </div>
              )}
            </div>

            {/* ── Right: Summary sidebar ── */}
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="border border-white/8 rounded-xl bg-[#0F1D32] p-5 sm:p-6">
                <h3 className="text-xs font-mono text-white/30 uppercase tracking-widest mb-5">Summary</h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-white/30 mb-1">Title</p>
                    <p className="text-sm text-white truncate">{title || <span className="text-white/20 italic">Untitled</span>}</p>
                  </div>
                  <div className="h-px bg-white/6" />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-white/30 mb-1">Target</p>
                      <p className="font-['DM_Serif_Display'] text-xl text-white">{targetAmount || '—'}</p>
                      <p className="text-xs text-white/25">USDm</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/30 mb-1">Duration</p>
                      <p className="font-['DM_Serif_Display'] text-xl text-white">{deadlineDays}</p>
                      <p className="text-xs text-white/25">days</p>
                    </div>
                  </div>
                  <div className="h-px bg-white/6" />
                  <div>
                    <p className="text-xs text-white/30 mb-3">Milestones ({milestones.length})</p>
                    <div className="space-y-2">
                      {milestones.map((m, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.description && m.amount ? 'bg-[#34D399]' : 'bg-white/15'}`} />
                            <span className="text-xs text-white/50 truncate">{m.description || `Milestone ${i + 1}`}</span>
                          </div>
                          <span className="text-xs font-mono text-white/40 shrink-0">{m.amount || '0'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {targetNum > 0 && milestoneSum > 0 && (
                    <>
                      <div className="h-px bg-white/6" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/30">Milestone total</span>
                        <span className={`text-xs font-mono ${milestoneMismatch ? 'text-red-400' : 'text-[#34D399]'}`}>
                          {milestoneSum.toFixed(2)} / {targetNum.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!isFormValid || isPending || isConfirming || isUploading}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#34D399] text-black font-semibold px-6 py-4 rounded-xl text-sm hover:bg-[#10B981] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isPending || isConfirming ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating on-chain…</>
                ) : isUploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading to IPFS…</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Launch Campaign</>
                )}
              </button>

              <p className="text-center text-xs text-white/20 font-mono">
                Transaction will be signed via your wallet
              </p>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
