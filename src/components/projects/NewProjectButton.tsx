"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// 新規プロジェクト作成ボタン + モーダル
export default function NewProjectButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("projects")
      .insert({ name: name.trim(), description: description.trim() || null })
      .select()
      .single();

    setLoading(false);
    if (!error && data) {
      setOpen(false);
      setName("");
      setDescription("");
      router.push(`/projects/${data.id}`);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ プロジェクト作成</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規プロジェクト作成</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="proj-name">プロジェクト名 *</Label>
              <Input
                id="proj-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：コーポレートサイトリニューアル"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="proj-desc">説明（任意）</Label>
              <Input
                id="proj-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="プロジェクトの概要"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "作成中..." : "作成"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
