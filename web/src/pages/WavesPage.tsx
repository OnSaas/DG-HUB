import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Text } from "../components/ui/text";
import { useAppToast } from "../lib/toast";
import { Waveform } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { WaveCard } from "../components/WaveCard";
import { useUserWaves } from "../hooks/useUserWaves";
import { PageHeader } from "../layout/PageHeader";
import { V4Channel } from "../lib/protocol";
import { useDeviceState } from "../app/DeviceProvider";
import { adminApi } from "../lib/api/admin";
import { WAVE_PRESETS } from "../lib/waves";
import { useConsole } from "../state/ConsoleProvider";

export function WavesPage() {
  const { canControl, recorder, requirePaired, pulse } = useConsole();
  const { device } = useDeviceState();
  const { waves, importFiles, remove, rename } = useUserWaves();
  const toast = useAppToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);

  function hold(name: string, frames: readonly string[], ch: 0 | 1) {
    if (!requirePaired()) return;
    const channel = ch === 0 ? V4Channel.A : V4Channel.B;
    const ok = pulse.start(channel, name, frames);
    if (ok) {
      recorder.markWave(name);
      if (device?.id) {
        void adminApi.logActivity(device.id, "wave", { channel: ch === 0 ? "A" : "B", wave: name });
      }
      toast.add({
        title: `${ch === 0 ? "A" : "B"} 循环「${name}」`,
        variant: "success",
      });
    }
  }

  function stop(ch: 0 | 1) {
    pulse.stop(ch === 0 ? "A" : "B");
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImporting(true);
    try {
      const { ok, fail } = await importFiles(files);
      if (ok && fail.length === 0) {
        toast.add({ title: `已导入 ${ok} 个波形`, variant: "success" });
      } else if (ok) {
        toast.add({
          title: `${ok} 成功，${fail.length} 失败`,
          description: fail.slice(0, 3).join("；"),
          variant: "warning",
        });
      } else {
        toast.add({
          title: "导入失败",
          description: fail.slice(0, 3).join("；") || "无法解析",
          variant: "error",
        });
      }
    } catch (e) {
      toast.add({
        title: "导入失败",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="波形库"
        description="官方 24 波形循环下发（本机分批重发）。也可导入 .pulse / zip。"
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".pulse,.zip,application/zip"
              multiple
              className="hidden"
              onChange={(e) => void onFiles(e.target.files)}
            />
            <Button size="sm" disabled={importing} onClick={() => fileRef.current?.click()}>
              导入
            </Button>
          </>
        }
      />

      {!canControl ? (
        <div className="dg-panel px-4 py-3">
          <Text variant="secondary">配对完成后可下发。卡片仍可浏览。</Text>
        </div>
      ) : null}

      <section
        className="flex flex-col gap-3"
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          void onFiles(e.dataTransfer.files);
        }}
      >
        <Text variant="heading3" as="h2">
          内置
        </Text>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
          {WAVE_PRESETS.map((w) => (
            <WaveCard
              key={w.id}
              name={w.name}
              hint="循环播放，再点即停"
              canControl={canControl}
              holdingA={pulse.active.A === w.name}
              holdingB={pulse.active.B === w.name}
              onBlocked={() => requirePaired()}
              onHold={(ch) => hold(w.name, w.frames, ch)}
              onStop={stop}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Text variant="heading3" as="h2">
          我的波形
        </Text>
        {waves.length === 0 ? (
          <EmptyState
            icon={Waveform}
            title="还没有导入波形"
            description="选择 .pulse 或包含多个 .pulse 的 zip。"
            action={{ label: "导入", onClick: () => fileRef.current?.click() }}
          />
        ) : (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
            {waves.map((w) => (
              <WaveCard
                key={w.id}
                name={w.name}
                hint={`${Math.max(1, Math.round(w.durationMs / 1000))} 秒 · ${w.frames.length} 帧`}
                canControl={canControl}
                holdingA={pulse.active.A === w.name}
                holdingB={pulse.active.B === w.name}
                onBlocked={() => requirePaired()}
                onHold={(ch) => hold(w.name, w.frames, ch)}
                onStop={stop}
                extra={
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRenameId(w.id);
                        setRenameVal(w.name);
                      }}
                    >
                      重命名
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRemoveId(w.id)}
                    >
                      删除
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>
      <Text variant="secondary" size="xs">
        波形数据来自 dglab-kit（MIT）。循环不依赖 App 的 d=0。
      </Text>

      {renameId ? (
        <Dialog.Root open onOpenChange={(o) => !o && setRenameId(null)}>
          <Dialog className="p-6">
            <Dialog.Title>重命名</Dialog.Title>
            <div className="mt-4 flex flex-col gap-3">
              <Input
                label="名称"
                value={renameVal}
                onChange={(e) => setRenameVal(e.currentTarget.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setRenameId(null)}>
                  取消
                </Button>
                <Button
                  onClick={() => {
                    const n = renameVal.trim();
                    if (n) rename(renameId, n);
                    setRenameId(null);
                  }}
                >
                  保存
                </Button>
              </div>
            </div>
          </Dialog>
        </Dialog.Root>
      ) : null}

      {removeId ? (
        <Dialog.Root open onOpenChange={(o) => !o && setRemoveId(null)}>
          <Dialog className="p-6">
            <Dialog.Title>删除这个波形？</Dialog.Title>
            <Dialog.Description>仅从本机列表移除。</Dialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRemoveId(null)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  remove(removeId);
                  setRemoveId(null);
                }}
              >
                删除
              </Button>
            </div>
          </Dialog>
        </Dialog.Root>
      ) : null}
    </div>
  );
}
