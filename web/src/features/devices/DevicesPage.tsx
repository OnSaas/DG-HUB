import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../../layout/PageHeader";
import { adminApi, type Device } from "../../lib/api/admin";

export function DevicesPage() {
  const nav = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await adminApi.devices();
    setDevices(data.devices);
  }

  useEffect(() => {
    void load().catch((e) => setError(String(e)));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const device = await adminApi.createDevice(name.trim() || "未命名设备");
    setName("");
    await load();
    nav(`/admin/devices/${device.id}`);
  }

  return (
    <>
      <PageHeader title="设备" description="Device 是业务实体。控制连接走对应 DeviceSession。" />
      <form className="mb-6 flex gap-2" onSubmit={(e) => void create(e)}>
        <input
          className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm"
          placeholder="设备名称"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <button type="submit" className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white">
          创建
        </button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <ul className="flex flex-col gap-2">
        {devices.map((d) => (
          <li key={d.id}>
            <Link
              to={`/admin/devices/${d.id}`}
              className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-neutral-100"
            >
              <span className="font-medium">{d.name}</span>
              <span className="text-xs text-neutral-400">{d.status}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
