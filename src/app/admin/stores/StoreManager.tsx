// src/app/admin/stores/StoreManager.tsx
"use client";
import {
  Power,
  Pencil,
  QrCode,
  MessageSquare,
  Trash2,
  X,
  Save,
} from "lucide-react";
import { useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { normalizeGoogleEmbed, extractIframeSrc } from "@/lib/googleMap";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api";

type Category = { id: string; name: string };
type StoreImage = { id: string; image_url: string; order_number?: number | null };
type Store = {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  category_id?: string | null;
  category?: { id: string; name: string } | null;
  cover_image?: string | null;
  images?: StoreImage[];
  order_number?: number | null;
  rank_in_category?: number | null;
  expired_at?: string | null;
  social_links?: string | null;
  is_active?: boolean | null;
  province?: string | null;
  is_featured_home?: boolean | null;
  featured_order?: number | null;
  featured_until?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

/* ---------- UI helpers ---------- */
function labelCls() { return "block text-sm font-medium mb-1"; }
function inputCls() { return "w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-600"; }

const btnBase =
  "cursor-pointer select-none inline-flex items-center justify-center gap-2 " +
  "h-11 rounded-xl shadow transition-all duration-200 " +
  "hover:scale-[1.03] active:scale-95 px-3";

  const iconCircleBase =
  "cursor-pointer select-none inline-flex items-center justify-center " +
  "w-11 h-11 rounded-full shadow-sm transition-all duration-200 " +
  "active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed " +
  "focus:outline-none focus:ring-2 focus:ring-offset-2";

const iconCircleNeutral =
  `${iconCircleBase} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:shadow-md hover:ring-2 hover:ring-slate-200`;

const iconCirclePrimary =
  `${iconCircleBase} bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:ring-2 hover:ring-indigo-300`;

const iconCircleDanger =
  `${iconCircleBase} bg-rose-600 text-white hover:bg-rose-700 hover:shadow-lg hover:ring-2 hover:ring-rose-300`;

const iconCircleSuccess =
  `${iconCircleBase} bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg hover:ring-2 hover:ring-emerald-300`;

const iconCircleDim =
  `${iconCircleBase} bg-slate-700 text-white hover:bg-slate-800 hover:shadow-lg hover:ring-2 hover:ring-slate-300`;
/* =========================================================
   Premium Modal System (UI only)
   ========================================================= */

let LAST_CLICK: { x: number; y: number } | null = null;

let SCROLL_LOCKS = 0;
let PREV_BODY_OVERFLOW = "";
function lockScroll() {
  if (typeof document === "undefined") return;
  SCROLL_LOCKS += 1;
  if (SCROLL_LOCKS === 1) {
    PREV_BODY_OVERFLOW = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
}
function unlockScroll() {
  if (typeof document === "undefined") return;
  SCROLL_LOCKS = Math.max(0, SCROLL_LOCKS - 1);
  if (SCROLL_LOCKS === 0) {
    document.body.style.overflow = PREV_BODY_OVERFLOW || "";
  }
}

function BaseOverlay({
  children, z = 10000, blur = true, role = "dialog",
}: { children: React.ReactNode; z?: number; blur?: boolean; role?: "dialog" | "status" | "alertdialog"; }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); lockScroll(); return () => unlockScroll(); }, []);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: z, touchAction: "none" }} aria-modal="true" role={role}>
      <div className={`absolute inset-0 bg-black/70 ${blur ? "backdrop-blur-[2px]" : ""}`} />
      {children}
    </div>,
    document.body
  );
}

function Modal({ open, children, width = "max-w-xl", z = 10000 }:{
  open:boolean; children: React.ReactNode; width?:string; z?:number;
}) {
  if (!open) return null;
  const origin = LAST_CLICK ? `${LAST_CLICK.x}px ${LAST_CLICK.y}px` : "50% 50%";
  return (
    <BaseOverlay z={z} role="dialog">
      <div
        className={`relative w-full ${width} max-h-[90svh] overflow-auto rounded-2xl bg-white text-slate-900 shadow-2xl ring-1 ring-black/5`}
        style={{ transformOrigin: origin, animation: "modalIn 180ms ease-out" }}
      >
        {children}
      </div>
      <style>{`@keyframes modalIn { from { opacity:.0; transform:scale(.98) } to { opacity:1; transform:scale(1) } }`}</style>
    </BaseOverlay>
  );
}

function LoadingModal({ open, text = "กำลังทำรายการ...", z = 10050 }:{
  open:boolean; text?:string; z?:number;
}) {
  if (!open) return null;
  const origin = LAST_CLICK ? `${LAST_CLICK.x}px ${LAST_CLICK.y}px` : "50% 50%";
  return (
    <BaseOverlay z={z} role="status">
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white text-slate-900 shadow-2xl ring-1 ring-black/5 p-5 flex gap-3 items-center"
        style={{ transformOrigin: origin, animation: "modalIn 160ms ease-out" }}
      >
        <span className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
        <div className="font-medium">{text}</div>
      </div>
      <style>{`@keyframes modalIn { from { opacity:.0; transform:scale(.98) } to { opacity:1; transform:scale(1) } }`}</style>
    </BaseOverlay>
  );
}

function AlertModal({ open, title, message, onClose, z = 10100 }:{
  open:boolean; title:string; message:string; onClose:()=>void; z?:number;
}) {
  if (!open) return null;
  return (
    <Modal open={open} width="max-w-md" z={z}>
      <div className="p-6">
        <div className="text-lg font-bold mb-2">{title}</div>
        <div className="text-sm text-slate-700 mb-6 whitespace-pre-line">{message}</div>
        <div className="flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2">ตกลง</button>
        </div>
      </div>
    </Modal>
  );
}

function ConfirmModal({ open, title, message, onCancel, onConfirm, z = 10080 }:{
  open:boolean; title:string; message:string; onCancel:()=>void; onConfirm:()=>void; z?:number;
}) {
  if (!open) return null;
  return (
    <Modal open={open} z={z} width="max-w-md">
      <div className="p-6">
        <div className="text-lg font-bold mb-2">{title}</div>
        <div className="text-sm text-slate-700 mb-6">{message}</div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2">
  ยกเลิก
</button>

<button type="button" onClick={onConfirm} className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-2">
  ยืนยัน
</button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- MAIN ---------- */
export default function StoreManager({
  initialCategories,
  initialStores,
}: { initialCategories: Category[]; initialStores: Store[]; }) {

  const [cats] = useState<Category[]>(initialCategories || []);
  const [list, setList] = useState<Store[]>(initialStores || []);

   // ✅ ติดตั้ง LAST_CLICK listener (กันซ้อนจาก Fast Refresh)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: PointerEvent) => {
      LAST_CLICK = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("pointerdown", handler, true);

return () => {
  window.removeEventListener("pointerdown", handler, true);
};
  }, []);
  // global states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{open:boolean; title:string; message:string}>({open:false,title:"",message:""});

  // create form states
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [province, setProvince] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [rank, setRank] = useState<number | "">("");
  const [expired, setExpired] = useState<string>("");
  const dateRef = useRef<HTMLInputElement | null>(null);
  // ✅ Featured (create) — ใช้ตอนสร้างเท่านั้น
const [createFeatured, setCreateFeatured] = useState<boolean>(false);
const [createFeaturedOrder, setCreateFeaturedOrder] = useState<number | "">("");
const [createFeaturedUntil, setCreateFeaturedUntil] = useState<string>("");
  const coverRef = useRef<HTMLInputElement | null>(null);
  const fileRefs = useRef<HTMLInputElement[]>([]);
  const [extraFiles, setExtraFiles] = useState<(File | null)[]>([null, null, null, null, null]);
  const [extraOrders, setExtraOrders] = useState<number[]>([1,2,3,4,5]);

  // Social (create)
  const [lineUrl, setLineUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [mapUrl, setMapUrl] = useState("");          // ← create form
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [editMap, setEditMap] = useState("");        // ← edit modal

  // edit modal states
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const editCoverRef = useRef<HTMLInputElement | null>(null);
  const [editImageOrders, setEditImageOrders] = useState<Record<string, number>>({});
  const [editNewFiles, setEditNewFiles] = useState<FileList | null>(null);
  // ✅ Featured (edit)
const [editFeatured, setEditFeatured] = useState<boolean>(false);
const [editFeaturedOrder, setEditFeaturedOrder] = useState<number | "">("");
const [editFeaturedUntil, setEditFeaturedUntil] = useState<string>("");

  // Social (edit)
  const [editLine, setEditLine] = useState("");
  const [editFacebook, setEditFacebook] = useState("");
  const [editTiktok, setEditTiktok] = useState("");
  const [editInstagram, setEditInstagram] = useState("");
  const [editLat, setEditLat] = useState<string>("");
  const [editLng, setEditLng] = useState<string>("");

  // local modal actions
  const [deleteStoreId, setDeleteStoreId] = useState<string | null>(null);
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);

  // loading overlays เฉพาะ action ใน modal edit
  const [editActionLoading, setEditActionLoading] = useState<{open:boolean; text:string}>({open:false, text:""});

  function isStoreActive(s: Store) {
    const now = Date.now();
    const byActiveField = s.is_active !== false; // undefined = active เว้นถูก set false
    const byExpiry = !s.expired_at || new Date(s.expired_at).getTime() > now;
    return byActiveField && byExpiry;
  }
  function isExpired(s: Store) {
    return !!s.expired_at && new Date(s.expired_at).getTime() <= Date.now();
  }

  function orderedImages(s: Store) {
    const arr = [...(s.images || [])];
    arr.sort((a, b) => (a.order_number ?? 0) - (b.order_number ?? 0));
    return arr;
  }
  function showOrder(s: Store) {
    return s.order_number ?? s.rank_in_category ?? "-";
  }

  async function refetch() {
    const r = await fetch(`${API_URL}/admin/stores`, { credentials: "include", cache: "no-store" });
    if (!r.ok) throw new Error("โหลดรายการร้านไม่สำเร็จ");
    const d = await r.json();
    setList(Array.isArray(d) ? d : d?.stores || []);
  }

  function patchOneInList(updated: Store) {
    setList(prev => prev.map(it => it.id === updated.id ? { ...it, ...updated } : it));
  }

  function resetCreateForm() {
    setName(""); setAddress(""); setDescription("");
    setProvince(""); 
    setCategoryId(""); setRank(""); setExpired("");
    setExtraFiles([null,null,null,null,null]);
    setExtraOrders([1,2,3,4,5]);
    setLineUrl(""); setFacebookUrl(""); setTiktokUrl(""); setInstagramUrl("");
    setMapUrl(""); 
    setLatitude("");
    setLongitude("");
    setCreateFeatured(false);
setCreateFeaturedOrder("");
setCreateFeaturedUntil("");
    if (coverRef.current) coverRef.current.value = "";
    fileRefs.current.forEach(el => { if (el) el.value = ""; });
  }

  /* ------- CREATE ------- */
  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true); setError(null);
      if (!name.trim()) throw new Error("กรุณากรอกชื่อร้าน");
      if (!categoryId) throw new Error("กรุณาเลือกหมวดหมู่");

      const fd = new FormData();
      fd.append("name", name.trim());
      if (address.trim()) fd.append("address", address.trim());
      if (description.trim()) fd.append("description", description.trim());
      if (province.trim()) fd.append("province", province.trim());
      fd.append("category_id", categoryId);
      if (latitude !== "") fd.append("latitude", latitude);
      if (longitude !== "") fd.append("longitude", longitude);
      if (rank !== "") fd.append("order_number", String(rank));
      if (expired) fd.append("expired_at", expired);
      if (coverRef.current?.files?.[0]) fd.append("cover", coverRef.current.files[0]);
// ✅ featured fields (create)
fd.append("is_featured_home", createFeatured ? "true" : "false");
if (createFeatured && createFeaturedOrder !== "") fd.append("featured_order", String(createFeaturedOrder));
if (createFeatured && createFeaturedUntil) fd.append("featured_until", createFeaturedUntil);
      const soc: any = {};
if (lineUrl.trim()) soc.line = lineUrl.trim();
if (facebookUrl.trim()) soc.facebook = facebookUrl.trim();
if (tiktokUrl.trim()) soc.tiktok = tiktokUrl.trim();
if (instagramUrl.trim()) soc.instagram = instagramUrl.trim();

if (mapUrl.trim()) {
  const cleaned = normalizeGoogleEmbed(mapUrl.trim());
  soc.map = cleaned ?? mapUrl.trim();  // ✅ เก็บลิงก์ maps.app.goo.gl ตรงๆ ได้
}

if (Object.keys(soc).length) {
  fd.append("social_links", JSON.stringify(soc));
}

      extraFiles.forEach((f, i) => {
        if (f) { fd.append("images", f); fd.append("orders", String(extraOrders[i] || i+1)); }
      });

      

      const r = await fetch(`${API_URL}/admin/stores`, { method: "POST", credentials: "include", body: fd });
      if (!r.ok) {
        let msg = "เพิ่มร้านไม่สำเร็จ";
        try { const d = await r.json(); msg = d?.message || d?.error || msg; } catch {}
        throw new Error(msg);
      }
      resetCreateForm();
      await refetch();
      setSuccess({open:true,title:"สำเร็จ",message:"เพิ่มร้านค้าสำเร็จแล้ว"});
    } catch (e:any) {
      setError(e.message || "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  }

  /* ------- EDIT MODAL ------- */
function openEdit(s: Store) {
  setEditing(s);
  setEditOpen(true);
  // ✅ set featured states
setEditFeatured(Boolean(s.is_featured_home));
setEditFeaturedOrder(typeof s.featured_order === "number" ? s.featured_order : "");
setEditFeaturedUntil(s.featured_until ? String(s.featured_until).slice(0, 10) : "");

  // เตรียมลำดับรูป
  const o: Record<string, number> = {};
  (s.images || []).forEach((im) => {
    if (im.id) o[im.id] = im.order_number ?? 0;
  });
  setEditImageOrders(o);
  setEditNewFiles(null);

  // ✅ รองรับ social_links ที่เป็น object หรือ string
  let json: any = {};
  try {
    const raw = s.social_links as any;
    json = !raw ? {} : (typeof raw === "string" ? JSON.parse(raw) : raw);
  } catch {
    json = {};
  }

    // รองรับชื่อคีย์เดิมหลายรูปแบบ
  const j = json || {};

  setEditLine(j.line || j.line_url || j.lineUrl || j.LINE || "");
  setEditFacebook(j.facebook || j.facebook_url || j.facebookUrl || j.fb || "");
  setEditTiktok(j.tiktok || j.tik_tok || j.tiktok_url || j.tiktokUrl || "");
  setEditInstagram(j.instagram || j.ig || j.instagram_url || j.instagramUrl || "");

  // ✅ เพิ่ม fallback: ถ้าไม่มีใน json.map แต่มีใน s.map ให้ใช้ s.map
  const rawMap =
    j.map ||
    j.gmap ||
    j.googlemap ||
    j.google_maps ||
    (s as any).map || // ✅ fallback
    "";
  const onlySrc = rawMap ? extractIframeSrc(String(rawMap)) : null;
  setEditMap((onlySrc || rawMap || "") as string);
  setEditLat(s.latitude !== null && s.latitude !== undefined ? String(s.latitude) : "");
setEditLng(s.longitude !== null && s.longitude !== undefined ? String(s.longitude) : "");
}

  async function saveEdit() {
    if (!editing) return;
    try {
      setEditActionLoading({open:true, text:"กำลังบันทึกการแก้ไข..."});
      setError(null);

      const fd = new FormData();
      fd.append("name", editing.name);
      if (editing.address) fd.append("address", editing.address);
      if (editing.description) fd.append("description", editing.description);
      if (editing.province) fd.append("province", editing.province);
      if (editing.category?.id || editing.category_id) {
        fd.append("category_id", String(editing.category?.id || editing.category_id));
      }
      const orderVal = editing.order_number ?? editing.rank_in_category;
      if (orderVal !== null && orderVal !== undefined) fd.append("order_number", String(orderVal));
      if (editCoverRef.current?.files?.[0]) fd.append("cover", editCoverRef.current.files[0]);

      const soc: any = {};
if (editLine.trim()) soc.line = editLine.trim();
if (editFacebook.trim()) soc.facebook = editFacebook.trim();
if (editTiktok.trim()) soc.tiktok = editTiktok.trim();
if (editInstagram.trim()) soc.instagram = editInstagram.trim();

if (editMap.trim()) {
  const cleaned = normalizeGoogleEmbed(editMap.trim());
  soc.map = cleaned ?? editMap.trim();  // ✅ เก็บลิงก์เดิมถ้า normalize ไม่ได้
}

fd.append("social_links", JSON.stringify(soc));
if (editLat !== "") fd.append("latitude", editLat);
if (editLng !== "") fd.append("longitude", editLng);

      const payload = (editing.images || [])
  .filter((im) => im.id && typeof editImageOrders[im.id] === "number")
  .map((im) => ({ id: im.id, order_number: editImageOrders[im.id] }));

fd.append("existing_image_orders", JSON.stringify(payload));
      // ✅ featured fields
fd.append("is_featured_home", editFeatured ? "true" : "false");
if (editFeatured && editFeaturedOrder !== "") fd.append("featured_order", String(editFeaturedOrder));
if (editFeatured && editFeaturedUntil) fd.append("featured_until", editFeaturedUntil);

      const r = await fetch(`${API_URL}/admin/stores/${editing.id}`, {
        method: "PATCH", credentials: "include", body: fd,
      });
      if (!r.ok) {
        let msg = "บันทึกไม่สำเร็จ";
        try { const d = await r.json(); msg = d?.message || d?.error || msg; } catch {}
        throw new Error(msg);
      }

      if (editNewFiles && editNewFiles.length > 0) {
        const fd2 = new FormData();
        Array.from(editNewFiles).forEach(f => fd2.append("images", f));
        const r2 = await fetch(`${API_URL}/admin/stores/${editing.id}/images`, {
          method: "POST", credentials: "include", body: fd2
        });
        if (!r2.ok) {
          let msg = "อัปโหลดรูปไม่สำเร็จ";
          try { const d = await r2.json(); msg = d?.message || d?.error || msg; } catch {}
          throw new Error(msg);
        }
      }

      setEditOpen(false);
      setEditing(null);
      await refetch();
      setSuccess({open:true,title:"สำเร็จ",message:"บันทึกเรียบร้อยแล้ว"});
    } catch (e:any) {
      setError(e.message || "เกิดข้อผิดพลาด");
    } finally {
      setEditActionLoading({open:false, text:""});
    }
  }

  // สลับตำแหน่ง (เฉพาะลำดับร้านในหมวด)
  async function swapOrder() {
    if (!editing) return;
    try {
      const cid = String(editing.category?.id || editing.category_id || "");
      const ord = editing.order_number ?? editing.rank_in_category;
      if (!cid || ord === null || ord === undefined) throw new Error("กรุณาเลือกหมวดหมู่และลำดับร้านให้ครบ");
      setEditActionLoading({open:true, text:"กำลังสลับลำดับ..."});
      const r = await fetch(`${API_URL}/admin/stores/${editing.id}/order`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: cid, order_number: ord }),
      });
      if (!r.ok) {
        let msg = "สลับลำดับไม่สำเร็จ";
        try { const d = await r.json(); msg = d?.message || d?.error || msg; } catch {}
        throw new Error(msg);
      }
      await refetch();
      const detail = await fetch(`${API_URL}/admin/stores/${editing.id}`, { credentials: "include" });
      const json = await detail.json();
      setEditing(json);
      setSuccess({open:true,title:"สำเร็จ",message:"สลับลำดับเรียบร้อยแล้ว"});
    } catch (e:any) {
      setError(e.message || "เกิดข้อผิดพลาด");
    } finally {
      setEditActionLoading({open:false, text:""});
    }
  }

  /* ------- ENABLE/DISABLE ------- */
  // ใช้ได้เฉพาะร้านที่ "ยังไม่หมดอายุ"
  async function toggleActive(target: Store, desired: boolean) {
    if (isExpired(target)) {
      setError("ร้านนี้หมดอายุแล้ว กรุณาต่ออายุก่อนจึงจะเปลี่ยนสถานะได้");
      return;
    }

    // optimistic UI
    const before = { ...target };
    patchOneInList({ ...target, is_active: desired });

    try {
      const r = await fetch(`${API_URL}/admin/stores/${target.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: desired }),
      });

      if (!r.ok) {
        // rollback ถ้าพลาด
        patchOneInList(before);
        let msg = "เปลี่ยนสถานะไม่สำเร็จ";
        try { const d = await r.json(); msg = d?.message || d?.error || msg; } catch {}
        throw new Error(msg);
      }

      await refetch();
      setSuccess({
        open: true,
        title: "สำเร็จ",
        message: desired ? "เปิดใช้งานแล้ว" : "ปิดใช้งานแล้ว",
      });
    } catch (e: any) {
      patchOneInList(before);
      setError(e?.message || "เกิดข้อผิดพลาด");
    }
  }

  /* ------- DELETE STORE ------- */
  async function doDeleteStore() {
    if (!deleteStoreId) return;
    try {
      setLoading(true);
      const r = await fetch(`${API_URL}/admin/stores/${deleteStoreId}`, { method:"DELETE", credentials:"include" });
      if (!r.ok) throw new Error("ลบไม่สำเร็จ");
      setDeleteStoreId(null);
      await refetch();
      setSuccess({open:true,title:"ลบสำเร็จ",message:"ลบร้านค้าสำเร็จแล้ว"});
    } catch (e:any) {
      setError(e.message || "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  }

  /* ------- DELETE IMAGE (list & edit) ------- */
  async function doDeleteImage() {
  if (!deleteImageId) return;
  const inEdit = editOpen && !!editing;

  try {
    if (inEdit) setEditActionLoading({ open: true, text: "กำลังลบรูปภาพ..." });
    else setLoading(true);

    const r = await fetch(`${API_URL}/admin/stores/images/${deleteImageId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!r.ok) throw new Error("ลบรูปไม่สำเร็จ");

    setDeleteImageId(null);

    if (inEdit && editing) {
      const detail = await fetch(`${API_URL}/admin/stores/${editing.id}`, { credentials: "include" });
      const json = await detail.json();
      setEditing(json);

      const o: Record<string, number> = {};
      (json.images || []).forEach((im: StoreImage) => { if (im.id) o[im.id] = im.order_number ?? 0; });
      setEditImageOrders(o);
    } else {
      await refetch();
    }

    setSuccess({ open: true, title: "สำเร็จ", message: "ลบรูปสำเร็จแล้ว" });
  } catch (e: any) {
    setError(e.message || "เกิดข้อผิดพลาด");
  } finally {
    if (inEdit) setEditActionLoading({ open: false, text: "" });
    else setLoading(false);
  }
}

  /* ------- UPLOAD IMAGES FROM LIST CARD ------- */
  async function uploadMoreImages(storeId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    try {
      setLoading(true);
      const fd = new FormData();
      Array.from(files).forEach(f => fd.append("images", f));
      const r = await fetch(`${API_URL}/admin/stores/${storeId}/images`, { method:"POST", credentials:"include", body: fd });
      if (!r.ok) {
        let msg = "อัปโหลดรูปไม่สำเร็จ";
        try { const d = await r.json(); msg = d?.message || d?.error || msg; } catch {}
        throw new Error(msg);
      }
      await refetch();
      setSuccess({open:true,title:"สำเร็จ",message:"อัปน์โหลดรูปเพิ่มเรียบร้อย"});
    } catch (e:any) {
      setError(e.message || "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
  }

  /* ------- grouped view ------- */
  const grouped = useMemo(() => {
    const map: Record<string, { cat: Category; items: Store[] }> = {};
    list.forEach((s) => {
      const cid = String(s.category?.id || s.category_id || "unknown");
      const cname = s.category?.name || cats.find(c => String(c.id) === cid)?.name || "ไม่ทราบหมวดหมู่";
      if (!map[cid]) map[cid] = { cat: { id: cid, name: cname }, items: [] };
      map[cid].items.push(s);
    });
    Object.values(map).forEach(g =>
      g.items.sort((a,b) => (a.order_number ?? a.rank_in_category ?? 999) - (b.order_number ?? b.rank_in_category ?? 999))
    );
    return Object.values(map);
  }, [list, cats]);

  /* ------- RENDER ------- */
  const expiredEditing = editing ? isExpired(editing) : false;

  return (
    <>
      {/* Global level overlays */}
      <AlertModal open={!!error} title="เกิดข้อผิดพลาด" message={error || ""} onClose={() => setError(null)} z={13000} />
      <AlertModal open={success.open} title={success.title} message={success.message} onClose={() => setSuccess({ ...success, open:false })} z={13000} />
      <LoadingModal open={loading} text="กำลังดำเนินการ..." z={12500} />

      {/* Local overlays inside edit modal */}
      <LoadingModal open={editActionLoading.open} text={editActionLoading.text} z={14000} />

      {/* ------- Create Form ------- */}
      <form onSubmit={onCreate} className="bg-white text-black rounded-2xl shadow p-6 mb-10">
        <h2 className="text-xl font-bold mb-6">เพิ่มร้านค้า</h2>

        <div className="grid grid-cols-1 gap-5">
          <div>
            <label className={labelCls()}>ชื่อร้าน:</label>
            <input className={inputCls()} value={name} onChange={(e)=>setName(e.target.value)} placeholder="เช่น ร้านอร่อย" required />
          </div>
          <div>
            <label className={labelCls()}>ที่อยู่:</label>
            <input className={inputCls()} value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="ระบุที่อยู่" />
          </div>
          <div>
  <label className={labelCls()}>จังหวัด:</label>
  <input
    className={inputCls()}
    value={province}
    onChange={(e) => setProvince(e.target.value)}
    placeholder="เช่น กรุงเทพมหานคร"
  />
</div>
          <div>
            <label className={labelCls()}>รายละเอียด:</label>
            <textarea className={inputCls()} rows={4} value={description} onChange={(e)=>setDescription(e.target.value)} />
          </div>

          {/* Social inputs */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
  <div>
    <label className={labelCls()}>LINE URL</label>
    <input
      className={inputCls()}
      value={lineUrl}
      onChange={(e) => setLineUrl(e.target.value)}
      placeholder="https://line.me/..."
    />
  </div>

  <div>
    <label className={labelCls()}>Facebook URL</label>
    <input
      className={inputCls()}
      value={facebookUrl}
      onChange={(e) => setFacebookUrl(e.target.value)}
      placeholder="https://facebook.com/..."
    />
  </div>

  <div>
    <label className={labelCls()}>TikTok URL</label>
    <input
      className={inputCls()}
      value={tiktokUrl}
      onChange={(e) => setTiktokUrl(e.target.value)}
      placeholder="https://www.tiktok.com/@..."
    />
  </div>

  <div>
    <label className={labelCls()}>Instagram URL</label>
    <input
      className={inputCls()}
      value={instagramUrl}
      onChange={(e) => setInstagramUrl(e.target.value)}
      placeholder="https://www.instagram.com/..."
    />
  </div>

  <div className="md:col-span-2">
    <label className={labelCls()}>Google Maps URL</label>
    <input
      className={inputCls()}
      value={mapUrl}
      onChange={(e) => setMapUrl(e.target.value)}
      placeholder="https://maps.app.goo.gl/xxxxxxxx"
    />
  </div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
  <div>
    <label className={labelCls()}>Latitude</label>
    <input className={inputCls()} value={latitude} onChange={(e)=>setLatitude(e.target.value)} placeholder="เช่น 12.5489788" />
  </div>
  <div>
    <label className={labelCls()}>Longitude</label>
    <input className={inputCls()} value={longitude} onChange={(e)=>setLongitude(e.target.value)} placeholder="เช่น 99.8003832" />
  </div>
</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className={labelCls()}>หมวดหมู่:</label>
              <select className={inputCls()} value={categoryId} onChange={(e)=>setCategoryId(e.target.value)} required>
                <option value="">-- เลือกหมวดหมู่ --</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls()}>วันหมดอายุร้าน:</label>
              <div className="relative">
                <input ref={dateRef} className={`${inputCls()} pr-10`} type="date" value={expired} onChange={(e)=>setExpired(e.target.value)} />
                <button type="button" aria-label="เปิดปฏิทิน" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-gray-100"
                  onClick={() => { const el = dateRef.current as any; if (el?.showPicker) el.showPicker(); else { el?.focus(); el?.click?.(); } }}
                >📅</button>
              </div>
            </div>

            <div>
              <label className={labelCls()}>ลำดับร้าน (ในหมวดหมู่):</label>
              <select className={inputCls()} value={rank === "" ? "" : String(rank)} onChange={(e)=>setRank(e.target.value === "" ? "" : Number(e.target.value))}>
                <option value="">-- เลือกลำดับ --</option>
                {Array.from({length:50}).map((_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}
              </select>
            </div>
          </div>
{/* ✅ Premium / Featured */}
<div className="rounded-xl border p-4 bg-slate-50">
  <div className="flex items-center justify-between gap-3">
    <div>
      <div className="font-bold">ร้านพรีเมียม / รายปี</div>
      <div className="text-xs text-slate-600">
        ติ๊กเพื่อให้ร้านนี้ขึ้นหน้าแรกในหมวด “ร้านพรีเมียม”
      </div>
    </div>

    <label className="flex items-center gap-2 text-sm font-medium">
      <input
        type="checkbox"
        checked={createFeatured}
onChange={(e) => {
  const v = e.target.checked;
  setCreateFeatured(v);
  if (!v) {
    setCreateFeaturedOrder("");
    setCreateFeaturedUntil("");
  }
}}
      />
      เปิดใช้งาน
    </label>
  </div>

  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className={labelCls()}>ลำดับแสดง (featured_order)</label>
      <select
        className={inputCls()}
        value={createFeaturedOrder === "" ? "" : String(createFeaturedOrder)}
onChange={(e) => setCreateFeaturedOrder(e.target.value === "" ? "" : Number(e.target.value))}
disabled={!createFeatured}
      >
        <option value="">-</option>
        {Array.from({ length: 50 }).map((_, i) => (
          <option key={i + 1} value={i + 1}>{i + 1}</option>
        ))}
      </select>
      <div className="text-xs text-slate-600 mt-1">ถ้าไม่ใส่ ระบบจะเรียงตาม created_at</div>
    </div>

    <div>
      <label className={labelCls()}>วันหมดอายุพรีเมียม (featured_until)</label>
      <input
        type="date"
        className={inputCls()}
        value={createFeaturedUntil}
onChange={(e) => setCreateFeaturedUntil(e.target.value)}
disabled={!createFeatured}
      />
      <div className="text-xs text-slate-600 mt-1">ปล่อยว่าง = ไม่หมดอายุ</div>
    </div>
  </div>
</div>
          <div>
            <label className={labelCls()}>ภาพหน้าปก (cover):</label>
            <div className="relative">
  <input
    ref={coverRef}
    className={`${inputCls()} pr-20`}
    type="file"
    accept="image/*"
    onChange={(e) => {
      const f = e.target.files?.[0];
      if (f && f.size > 1024 * 1024) {
        setError("ไฟล์เกิน 1MB กรุณาเลือกไฟล์ที่เล็กกว่า 1MB");
        e.target.value = "";
      }
    }}
  />
  {coverRef.current?.files?.[0] && (
    <button
      type="button"
      onClick={() => {
        coverRef.current!.value = "";
      }}
      className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 text-white text-sm rounded px-2 py-1 hover:bg-red-700"
    >
      ลบไฟล์
    </button>
  )}
</div>
          </div>

          <div>
            <div className="font-medium mb-2">รูปภาพเพิ่มเติม (สูงสุด 5 รูป):</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[0,1,2,3,4].map((idx)=>(
                <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_140px_80px] items-center gap-2">
                  <div className="relative">
  <input
    ref={(el)=>{ if(el) fileRefs.current[idx] = el; }}
    type="file"
    accept="image/*"
    className={`${inputCls()} pr-20`}
    onChange={(e) => {
      const file = e.target.files?.[0] || null;
      if (file && file.size > 1024 * 1024) {
        setError("ไฟล์เกิน 1MB กรุณาเลือกไฟล์ที่เล็กกว่า 1MB");
        e.target.value = "";
        const copy = [...extraFiles];
        copy[idx] = null;
        setExtraFiles(copy);
        return;
      }
      const copy = [...extraFiles];
      copy[idx] = file;
      setExtraFiles(copy);
    }}
  />
  {extraFiles[idx] && (
    <button
      type="button"
      onClick={() => {
        const copy = [...extraFiles];
        copy[idx] = null;
        setExtraFiles(copy);
        if (fileRefs.current[idx]) fileRefs.current[idx].value = "";
      }}
      className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 text-white text-sm rounded px-2 py-1 hover:bg-red-700"
    >
      ลบไฟล์
    </button>
  )}
</div>
                  <select className={inputCls()} value={String(extraOrders[idx])} onChange={(e)=>{ const copy = [...extraOrders]; copy[idx] = Number(e.target.value); setExtraOrders(copy); }}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span className="text-sm text-gray-600">ลำดับ</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <button type="submit" disabled={loading} className="w-full md:w-auto rounded-lg bg-yellow-700 hover:bg-yellow-800 text-white px-6 py-2 font-semibold disabled:opacity-60">
              เพิ่มร้านค้า
            </button>
          </div>
        </div>
      </form>

     
      {/* ------- List ------- */}
{grouped.map(g=>(
  <div key={g.cat.id} className="mb-12">
    <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-yellow-600 to-yellow-400 bg-clip-text text-transparent">
      {g.cat.name}
    </h2>

    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
      {g.items.map((s)=>{
        const imgs = orderedImages(s);
        const canAdd = (imgs.length < 5);
        const remaining = Math.max(0, 5 - imgs.length);
        const active = isStoreActive(s);
        const expired = isExpired(s);

        return (
          <div
            key={s.id}
            className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-200"
          >
            {/* Cover */}
<div className="w-full aspect-[16/9] bg-gray-100 relative">
  <img
    src={s.cover_image || imgs[0]?.image_url || "/no-image.jpg"}
    alt={s.name}
    className="w-full h-full object-cover"
  />

  {/* ✅ Badges (top row) */}
  <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
    <div
      className={`rounded-full px-3 py-1 text-xs font-semibold shadow-md ${
        expired
          ? "bg-gray-700 text-white"
          : active
          ? "bg-emerald-600 text-white"
          : "bg-red-700 text-white"
      }`}
    >
      {expired ? "Expired" : active ? "Active" : "Disabled"}
    </div>

    {s.is_featured_home && (
      <div className="rounded-full bg-yellow-500 text-black px-3 py-1 text-xs font-extrabold shadow">
        ⭐ Premium
      </div>
    )}
  </div>
</div> {/* 🔥 ปิด Cover ที่ขาดอยู่ตรงนี้ */}

{/* Content */}
<div className="p-5">
              <div className="text-lg text-blue-950 font-semibold mb-3">{s.name}</div>

              {/* Thumbs (fixed grid 5 slots) */}
<div className="grid grid-cols-5 gap-2 mb-4">
  {Array.from({ length: 5 }).map((_, i) => {
    const im = imgs[i];

    // มีรูป
    if (im) {
      return (
        <div
  key={im.id}
  className="relative group w-full aspect-square rounded-lg border shadow-sm p-1"
>
  {/* กล่องรูปด้านใน (เป็นตัวที่ crop รูปจริง) */}
  <div className="relative w-full h-full overflow-hidden rounded-md">
    <img src={im.image_url} alt="" className="w-full h-full object-cover" />
  </div>

  {/* ปุ่มลบ “ลอยนอกกรอบ” */}
  <button
    type="button"
    onClick={() => setDeleteImageId(im.id)}
    title="ลบรูปนี้"
    className="
      absolute -top-2 -right-2 z-10
      w-7 h-7 rounded-full
      bg-rose-600 text-white text-sm
      grid place-items-center
      shadow-lg ring-2 ring-white
      opacity-0 group-hover:opacity-100 transition
    "
  >
    ×
  </button>
</div>
      );
    }

    // ช่องว่าง = ปุ่ม +
    return (
      <label
        key={`empty-${i}`}
        className="w-full aspect-square border-2 border-dashed rounded-lg grid place-items-center
                   cursor-pointer text-gray-400 hover:text-yellow-600 hover:border-yellow-600 transition"
        title="เพิ่มรูป"
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;

            for (const f of files) {
              if (f.size > 1024 * 1024) {
                setError("ไฟล์เกิน 1MB กรุณาเลือกไฟล์ที่เล็กกว่า 1MB");
                e.target.value = "";
                return;
              }
            }

            uploadMoreImages(s.id, files);
            e.target.value = "";
          }}
        />
        +
      </label>
    );
  })}
</div>

              {/* Action Bar (Premium style) */}
<div className="mt-5 flex items-center justify-between">
  
  {/* Left: Order */}
  <div className="text-xs text-gray-500">
    ลำดับ: <span className="font-semibold">{showOrder(s)}</span>
  </div>

  {/* Right: Actions */}
  <div className="flex items-center gap-2">
    
    {/* Enable / Disable */}
    <button
      onClick={() => toggleActive(s, !active)}
      title={active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      className={
        active ? iconCircleDim : iconCircleSuccess
      }
    >
      <Power size={18} />
    </button>

    {/* Edit */}
    <button
      onClick={() => openEdit(s)}
      title="แก้ไข"
      className={iconCirclePrimary}
    >
      <Pencil size={18} />
    </button>

    {/* QR */}
    <Link
      href={`/admin/stores/${s.id}/qr`}
      title="QR Code"
      className={iconCircleNeutral}
    >
      <QrCode size={18} />
    </Link>

    {/* Questions */}
    <Link
      href={`/admin/stores/${s.id}/feedback/questions`}
      title="คำถาม"
      className={iconCircleNeutral}
    >
      <MessageSquare size={18} />
    </Link>

    {/* Delete */}
    <button
      type="button"
      onClick={() => setDeleteStoreId(s.id)}
      title="ลบ"
      className={iconCircleDanger}
    >
      <Trash2 size={18} />
    </button>

  </div>

</div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
))}

      {/* ------- Edit Modal ------- */}
      {editOpen && editing && (
        <Modal open={true} width="max-w-2xl" z={10000}>
          <div className="p-6">
            <div className="text-xl font-bold mb-4">แก้ไขร้าน: {editing.name}</div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className={labelCls()}>ชื่อร้าน</label>
                <input className={inputCls()} value={editing.name} onChange={(e)=>setEditing({...editing, name: e.target.value})} />
              </div>
              <div>
                <label className={labelCls()}>ที่อยู่</label>
                <input className={inputCls()} value={editing.address || ""} onChange={(e)=>setEditing({...editing, address: e.target.value})} />
              </div>
              <div> {/* <== ADD province in edit modal */}
  <label className={labelCls()}>จังหวัด</label>
  <input
    className={inputCls()}
    value={editing.province || ""}
    onChange={(e)=>setEditing({ ...editing, province: e.target.value })}
  />
</div>
              <div>
                <label className={labelCls()}>รายละเอียด</label>
                <textarea className={inputCls()} rows={3} value={editing.description || ""} onChange={(e)=>setEditing({...editing, description: e.target.value})} />
              </div>
              {/* ✅ Premium / Featured (EDIT) */}
<div className="rounded-xl border p-4 bg-slate-50">
  <div className="flex items-center justify-between gap-3">
    <div>
      <div className="font-bold">ร้านพรีเมียม / รายปี</div>
      <div className="text-xs text-slate-600">
        ติ๊กเพื่อให้ร้านนี้ขึ้นหน้าแรกในหมวด “ร้านพรีเมียม”
      </div>
    </div>

    <label className="flex items-center gap-2 text-sm font-medium">
      <input
        type="checkbox"
        checked={editFeatured}
        onChange={(e) => {
          const v = e.target.checked;
          setEditFeatured(v);
          if (!v) {
            setEditFeaturedOrder("");
            setEditFeaturedUntil("");
          }
        }}
      />
      เปิดใช้งาน
    </label>
  </div>

  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className={labelCls()}>ลำดับแสดง (featured_order)</label>
      <select
        className={inputCls()}
        value={editFeaturedOrder === "" ? "" : String(editFeaturedOrder)}
        onChange={(e) =>
          setEditFeaturedOrder(e.target.value === "" ? "" : Number(e.target.value))
        }
        disabled={!editFeatured}
      >
        <option value="">-</option>
        {Array.from({ length: 50 }).map((_, i) => (
          <option key={i + 1} value={i + 1}>{i + 1}</option>
        ))}
      </select>
      <div className="text-xs text-slate-600 mt-1">ปล่อยว่าง = เรียงตาม created_at</div>
    </div>

    <div>
      <label className={labelCls()}>วันหมดอายุพรีเมียม (featured_until)</label>
      <input
        type="date"
        className={inputCls()}
        value={editFeaturedUntil}
        onChange={(e) => setEditFeaturedUntil(e.target.value)}
        disabled={!editFeatured}
      />
      <div className="text-xs text-slate-600 mt-1">ปล่อยว่าง = ไม่หมดอายุ</div>
    </div>
  </div>
</div>

              {/* Social (edit) */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label className={labelCls()}>LINE URL</label>
    <input className={inputCls()} value={editLine} onChange={(e) => setEditLine(e.target.value)} />
  </div>

  <div>
    <label className={labelCls()}>Facebook URL</label>
    <input className={inputCls()} value={editFacebook} onChange={(e) => setEditFacebook(e.target.value)} />
  </div>

  <div>
    <label className={labelCls()}>TikTok URL</label>
    <input className={inputCls()} value={editTiktok} onChange={(e) => setEditTiktok(e.target.value)} />
  </div>

  <div>
    <label className={labelCls()}>Instagram URL</label>
    <input className={inputCls()} value={editInstagram} onChange={(e) => setEditInstagram(e.target.value)} />
  </div>

  <div className="md:col-span-2">
    <label className={labelCls()}>Google Maps URL</label>
    <input
      className={inputCls()}
      value={editMap}
      onChange={(e) => setEditMap(e.target.value)}
      placeholder="https://maps.app.goo.gl/xxxxxxxx"
    />
  </div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label className={labelCls()}>Latitude</label>
    <input
      className={inputCls()}
      value={editLat}
      onChange={(e) => setEditLat(e.target.value)}
      placeholder="เช่น 12.5489788"
    />
  </div>
  <div>
    <label className={labelCls()}>Longitude</label>
    <input
      className={inputCls()}
      value={editLng}
      onChange={(e) => setEditLng(e.target.value)}
      placeholder="เช่น 99.8003832"
    />
  </div>
</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls()}>หมวดหมู่</label>
                  <select className={inputCls()} value={String(editing.category?.id || editing.category_id || "")}
                    onChange={(e)=>setEditing({...editing, category_id: e.target.value, category: cats.find(c=>String(c.id)===e.target.value) || null})}
                  >
                    <option value="">-- เลือก --</option>
                    {cats.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls()}>ลำดับในหมวด</label>
                  <div className="flex items-center gap-2">
                    <select className={inputCls()}
                      value={String(editing.order_number ?? editing.rank_in_category ?? "")}
                      onChange={(e)=>{
                        const val = e.target.value === "" ? null : Number(e.target.value);
                        setEditing({...editing, order_number: val, rank_in_category: val});
                      }}
                    >
                      <option value="">-</option>
                      {Array.from({length:50}).map((_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}
                    </select>

                    <button type="button" onClick={swapOrder} className="shrink-0 rounded bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2" title="สลับลำดับกับร้านที่มีลำดับนี้">
                      สลับลำดับ
                    </button>
                  </div>
                </div>
              </div>

              {/* แสดงสถานะ + ปุ่มสลับในโมดัล */}
              <div className="flex items-center gap-3">
                <span className="text-sm">สถานะปัจจุบัน:</span>
                <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${isStoreActive(editing) ? "bg-emerald-600 text-white" : "bg-slate-700 text-white"}`}>
                  {isStoreActive(editing) ? "Active" : "Disabled"}
                </span>

                {expiredEditing ? (
  <button
    type="button"
    disabled
    className={`${iconCircleDim} ml-auto opacity-60 cursor-not-allowed`}
    title="ร้านหมดอายุแล้ว ต้องต่ออายุก่อน"
    aria-label="หมดอายุแล้ว"
  >
    <Power size={20} />
  </button>
) : (
  <button
    type="button"
    onClick={() => toggleActive(editing, !isStoreActive(editing))}
    className={`${isStoreActive(editing) ? iconCircleDim : iconCircleSuccess} ml-auto`}
    title={isStoreActive(editing) ? "ปิดใช้งาน" : "เปิดใช้งาน"}
    aria-label={isStoreActive(editing) ? "Disable" : "Enable"}
  >
    <Power size={20} />
  </button>
)}
              </div>

              <div>
                <label className={labelCls()}>เปลี่ยนรูปหน้าปก (cover)</label>
                <input
  ref={editCoverRef}
  type="file"
  accept="image/*"
  className={inputCls()}
  onChange={(e) => {
  const f = e.target.files?.[0];
  if (f && f.size > 1024 * 1024) {
    setError("ไฟล์เกิน 1MB กรุณาเลือกไฟล์ที่เล็กกว่า 1MB");
    e.target.value = "";
  }
}}
/>
              </div>

              {/* รีออเดอร์รูป + ลบใน modal */}
              <div>
                <div className="font-medium mb-2">ลำดับรูปภาพ</div>
                <div className="grid gap-3">
                  {(editing.images || []).map((im)=>(
                    <div key={im.id} className="flex items-center gap-3">
                      <img src={im.image_url} className="w-20 h-20 rounded object-cover border" alt="" />
                      <select className="rounded border px-2 py-1" value={String(editImageOrders[im.id] ?? im.order_number ?? 0)}
                        onChange={(e)=>{ setEditImageOrders(prev => ({...prev, [im.id]: Number(e.target.value)})); }}
                      >
                        {Array.from({length:10}).map((_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}
                      </select>
                      <span className="text-sm text-gray-600">ลำดับ</span>
                      <button
  type="button"
  onClick={() => setDeleteImageId(im.id)}
  className={`${iconCircleDanger} ml-auto`}
  title="ลบรูปนี้"
  aria-label="ลบรูปนี้"
  disabled={editActionLoading.open}
>
  <Trash2 size={20} />
</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* เพิ่มรูปใหม่ */}
              <div>
                {(editing.images?.length || 0) < 5 && (
                  <>
                    <div className="font-medium mb-2">เพิ่มรูปใหม่ (เหลือ {5 - (editing.images?.length || 0)} รูป)</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Array.from({length: Math.max(0, 5 - (editing.images?.length || 0))}).map((_, idx) => (
                        <input
  key={idx}
  type="file"
  accept="image/*"
  className={inputCls()}
  onChange={(e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file && file.size > 1024 * 1024) {
  setError("ไฟล์เกิน 1MB กรุณาเลือกไฟล์ที่เล็กกว่า 1MB");
  e.target.value = "";
  const copy = [...extraFiles];
  copy[idx] = null;
  setExtraFiles(copy);
  return;
}
    const dt = new DataTransfer();
    if (editNewFiles) Array.from(editNewFiles).forEach(f => dt.items.add(f));
    dt.items.add(file);
    setEditNewFiles(dt.files);
  }}
/>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
  {/* Cancel */}
  <button
    type="button"
    onClick={() => { setEditOpen(false); setEditing(null); }}
    className={iconCircleNeutral}
    title="ยกเลิก"
    aria-label="ยกเลิก"
    disabled={editActionLoading.open}
  >
    <X size={20} />
  </button>

  {/* Save */}
  <button
    type="button"
    onClick={saveEdit}
    className={iconCirclePrimary}
    title="บันทึก"
    aria-label="บันทึก"
    disabled={editActionLoading.open}
  >
    <Save size={20} />
  </button>
</div>
          </div>
        </Modal>
      )}

      {/* confirm delete store & image */}
<ConfirmModal
  open={!!deleteStoreId}
  title="ลบร้านค้า"
  message="ยืนยันการลบร้านนี้?"
  onCancel={() => setDeleteStoreId(null)}
  onConfirm={doDeleteStore}
  z={11000}
/>

<ConfirmModal
  open={!!deleteImageId}
  title="ลบรูปภาพ"
  message="ยืนยันการลบรูปนี้?"
  onCancel={() => setDeleteImageId(null)}
  onConfirm={doDeleteImage}
  z={11000}
/>
    </>
  );
}